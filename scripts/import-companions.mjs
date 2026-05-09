// import-companions.mjs
import 'dotenv/config'
import fs from 'fs'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const raw = fs.readFileSync('./companions.json', 'utf-8')
const rows = JSON.parse(raw)

if (!Array.isArray(rows)) {
  throw new Error('companions.json must be a JSON array of objects')
}

const normalized = rows.map((r) => {
  const aesthetic = r.aesthetic ?? r.aestheticTags ?? null

  return {
    ...r,
    aestheticTags: Array.isArray(aesthetic)
      ? aesthetic
      : aesthetic
        ? [aesthetic]
        : null,
  }
})

// Optional: remove unknown key to avoid schema errors
for (const row of normalized) {
  delete row.esthetic
}

const chunkSize = 300
for (let i = 0; i < normalized.length; i += chunkSize) {
  const chunk = normalized.slice(i, i + chunkSize)

  const { error } = await supabase
    .from('Companion')   // exact table name
    .upsert(chunk, { onConflict: 'id' })

  if (error) {
    console.error(`Chunk ${i / chunkSize + 1} failed:`, error.message)
    process.exit(1)
  }

  console.log(`Imported ${Math.min(i + chunkSize, normalized.length)} / ${normalized.length}`)
}

console.log('✅ Import complete')
