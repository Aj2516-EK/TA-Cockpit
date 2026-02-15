import { put } from '@vercel/blob'
import fs from 'node:fs'
import { config } from 'dotenv'

config({ path: '.env.local' })

const filePath = 'public/sample-data/sample-data.xlsx'
const blob = await put('sample-data.xlsx', fs.readFileSync(filePath), {
  access: 'public',
  contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
})

console.log('Uploaded! Add this to .env.local and Vercel env vars:\n')
console.log(`VITE_SAMPLE_DATA_URL=${blob.url}`)
