# Plan: Landing Page → Upload Page → Dashboard Flow

## Context

Currently the HomePage has file upload baked into the header and gates journey cards behind it. The user wants a clean 3-step flow:

1. **Landing Page** — FIKRAH branding, journey cards, "Launch Cockpit" button. No upload.
2. **Upload Page** — Upload a file OR load sample test data. Same parsing logic currently in CockpitPage.
3. **Dashboard (Cockpit)** — Shows the loaded data. No upload button (removed from TopBar).

## Changes

### 1. Simplify `HomePage.tsx` — remove upload, always show cards
**File:** `src/features/home/HomePage.tsx`

- Remove `loadedFileName` state and the `<input type="file">` upload label from the header
- Remove the conditional rendering — always show journey cards and "Launch Cockpit" button
- Remove the "Dataset Status" panel and the empty-state "upload a file to unlock" message
- Keep: FIKRAH branding, dark mode toggle, journey card selection, "Launch Cockpit" button, airline theme/animations

### 2. Create `UploadPage.tsx`
**File:** `src/features/upload/UploadPage.tsx` (new file)

A dedicated page with two options, using the **same upload/parse logic** currently in CockpitPage (`parseUploadToDataset`):
- **Upload your own file**: file picker (`.xlsx/.xls/.csv`), shows spinner while parsing, shows error on failure
- **Load sample data**: fetches `public/sample-data/sample-hackathon.xlsx`, converts to `File` object, runs through same parse flow

On successful parse → calls `onDataReady(dataset: Dataset)` to pass the parsed dataset to App.

Style: consistent airline glassmorphic theme (dark background, same gradients). Includes a back button to return to Landing Page.

### 3. Update `App.tsx` — add 'upload' page state, pass Dataset
**File:** `src/app/App.tsx`

- Change page state: `'home' | 'cockpit'` → `'home' | 'upload' | 'cockpit'`
- Add `dataset` state (`Dataset | null`) at the App level
- `HomePage.onOpenJourney` → sets `activeCluster`, transitions to `'upload'`
- `UploadPage.onDataReady(dataset)` → stores dataset, transitions to `'cockpit'`
- Pass `dataset` as a prop to `CockpitPage` (instead of CockpitPage managing its own)

### 4. Update `CockpitPage.tsx` — receive dataset as prop, remove upload state
**File:** `src/features/cockpit/CockpitPage.tsx`

- Add required `dataset: Dataset` prop (no longer nullable — guaranteed by upload page)
- Remove internal `dataset` / `isUploading` / `uploadError` states (handled upstream now)
- Remove `onUpload` callback from TopBar props

### 5. Update `TopBar.tsx` — remove upload button
**File:** `src/features/cockpit/components/TopBar.tsx`

- Remove the upload `<label>` / `<input type="file">` and related props (`isUploading`, `onUpload`)
- Keep: FIKRAH branding, dataset label, filters button, data inspector button, dark mode toggle, EVP-HR badge

### 6. Copy sample data to `public/`
- Copy `Data for Cockpit - hackathon.xlsx` to `public/sample-data/sample-hackathon.xlsx`

## File Summary

| File | Action |
|------|--------|
| `src/features/home/HomePage.tsx` | Edit — remove upload, always show cards |
| `src/features/upload/UploadPage.tsx` | Create — new upload page with upload + sample data |
| `src/app/App.tsx` | Edit — add 'upload' state, manage dataset at app level |
| `src/features/cockpit/CockpitPage.tsx` | Edit — receive `dataset` prop, remove upload state |
| `src/features/cockpit/components/TopBar.tsx` | Edit — remove upload button and related props |
| `public/sample-data/sample-hackathon.xlsx` | Copy — sample data file |

## Verification

1. Run `vercel dev`
2. Landing page shows FIKRAH branding, 5 journey cards, "Launch Cockpit" — no upload
3. Click "Launch Cockpit" → Upload page with "Upload File" and "Load Sample Data"
4. Click "Load Sample Data" → spinner → navigates to Dashboard with data
5. Upload a custom file → spinner → navigates to Dashboard with data
6. Dashboard has **no upload button** in the TopBar
7. Back button on Upload page returns to Landing Page
