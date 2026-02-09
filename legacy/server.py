import pandas as pd
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import requests
import json
from typing import Optional, List
import numpy as np
import os

app = FastAPI()

# Enable CORS for the frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load Dataset
DATA_PATH = "Data for Cockpit.xlsx"
FALLBACK_PATH = "-Airline_TA_Master_DaCSVtaset_120k.csv"

df = pd.DataFrame()

def load_data():
    global df
    try:
        if os.path.exists(DATA_PATH):
            print(f"Loading Primary Dataset: {DATA_PATH}")
            df = pd.read_excel(DATA_PATH)
        elif os.path.exists(FALLBACK_PATH):
            print(f"Loading Fallback Dataset: {FALLBACK_PATH}")
            df = pd.read_csv(FALLBACK_PATH)
        else:
            print("No dataset found.")
            return

        print(f"Data Loaded. Records: {len(df)}")
        
        # Augment missing metrics deterministically
        np.random.seed(42)
        if 'Job_Role' in df.columns:
            df['sim_cost'] = df['Job_Role'].apply(lambda x: len(str(x)) * 150 + np.random.randint(500, 2000))
        if 'Department' in df.columns:
            df['sim_time_to_hire'] = df['Department'].apply(lambda x: len(str(x)) // 2 + np.random.randint(2, 10))
        
        df['sim_rating'] = np.random.uniform(3.5, 5.0, size=len(df))
        df['sim_is_internal'] = np.random.choice([0, 1], size=len(df), p=[0.7, 0.3])
        
        if 'Gender' in df.columns:
            df['sim_is_diverse'] = df['Gender'].apply(lambda x: 1 if x == 'Female' else 0)
        else:
            df['sim_is_diverse'] = np.random.choice([0, 1], size=len(df))
            
    except Exception as e:
        print(f"Critical error loading data: {e}")

load_data()

# Config
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "YOUR_OPENROUTER_API_KEY_HERE")
PRIMARY_MODEL = os.getenv("PRIMARY_MODEL", "openai/gpt-oss-20b:free")

@app.get("/api/filters")
def get_filter_options():
    if df.empty: return {}
    cols = ["Department", "Country", "Gender", "Nationality", "Job_Role"]
    available = [c for c in cols if c in df.columns]
    return {c: sorted(df[c].dropna().unique().tolist()) for c in available}

@app.get("/api/metrics")
def get_metrics(
    dept: Optional[str] = None,
    country: Optional[str] = None,
    gender: Optional[str] = None,
    job: Optional[str] = None
):
    if df.empty: return {"status": "no_data"}
    
    filt = df.copy()
    if dept and 'Department' in filt.columns: filt = filt[filt['Department'] == dept]
    if country and 'Country' in filt.columns: filt = filt[filt['Country'] == country]
    if gender and 'Gender' in filt.columns: filt = filt[filt['Gender'] == gender]
    if job and 'Job_Role' in filt.columns: filt = filt[filt['Job_Role'] == job]

    total_count = len(filt)
    if total_count == 0: return {"status": "no_data"}

    # Aggregations
    diversity_pct = (filt['sim_is_diverse'].sum() / total_count) * 100 if 'sim_is_diverse' in filt.columns else 0
    avg_cost = filt['sim_cost'].mean() if 'sim_cost' in filt.columns else 0
    avg_time = filt['sim_time_to_hire'].mean() if 'sim_time_to_hire' in filt.columns else 0

    metrics = {
        "readiness": [
            {"title": "Qualified Pool", "val": f"{total_count:,}", "status": "Optimal", "color": "emerald"},
            {"title": "Skill Readiness", "val": f"{np.random.randint(85, 98)}%", "status": "High", "color": "emerald"},
        ],
        "momentum": [
            {"title": "Time to Next Step", "val": f"{avg_time:.1f}d", "status": "Healthy", "color": "emerald"},
        ],
        "diversity": [
            {"title": "Diverse Attraction", "val": f"{diversity_pct:.1f}%", "status": "Strong", "color": "emerald"},
        ],
        "economics": [
            {"title": "Cost/Acquisition", "val": f"${avg_cost:,.0f}", "status": "Efficient", "color": "emerald"},
        ]
    }
    return metrics

@app.get("/api/ai-insight")
def get_ai_insight(query: str, current_metrics: str):
    payload = {
        "model": PRIMARY_MODEL,
        "messages": [
            {"role": "system", "content": "You are a Talent Acquisition AI Consultant. Analyze the provided metrics and query to give brief, professional insights for airline recruitment. Use terminology 'Internal candidates (Employees)'."},
            {"role": "user", "content": f"User Query: {query}\n\nCurrent Metric Context: {current_metrics}"}
        ]
    }
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://ta-dashboard.cockpit"
    }
    try:
        response = requests.post("https://openrouter.ai/api/v1/chat/completions", headers=headers, data=json.dumps(payload))
        res_json = response.json()
        content = res_json['choices'][0]['message']['content']
        return {"insight": content}
    except Exception as e:
        return {"insight": f"Analysis failed: {str(e)}"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
