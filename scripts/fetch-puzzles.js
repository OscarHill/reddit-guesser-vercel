// Fetches real top posts from Reddit for each subreddit in puzzles.json.
// Run at build time: node scripts/fetch-puzzles.js
import { writeFileSync, readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PUZZLES_PATH = join(__dirname, '../src/puzzles.json')
const USER_AGENT = 'script:reddit-guesser-game:v1.0 (educational game)'
const DELAY_MS = 600
const MIN_POSTS = 5

const currentData = JSON.parse(readFileSync(PUZZLES_PATH, 'utf-8'))
const subreddits = currentData.subreddits.map(s => s.name)

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

function isGoodTitle(title) {
  if (!title || title.length < 15 || title.length > 200) return false
  if (/^https?:\/\//.test(title)) return false
  return true
}

async function fetchTopPosts(subreddit, retries = 2) {
  const url = `https://www.reddit.com/r/${subreddit}/top.json?t=month&limit=30`
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } })
      if (res.status === 429) {
        console.warn(`  Rate limited on r/${subreddit}, waiting 5s...`)
        await sleep(5000)
        continue
      }
      if (!res.ok) {
        console.warn(`  HTTP ${res.status} for r/${subreddit}`)
        return null
      }
      const data = await res.json()
      const posts = data?.data?.children
        ?.map(p => p.data.title)
        ?.filter(isGoodTitle)
        ?.slice(0, MIN_POSTS)
      if (!posts || posts.length < MIN_POSTS) {
        console.warn(`  Only ${posts?.length ?? 0} usable posts for r/${subreddit}`)
        return null
      }
      return posts
    } catch (err) {
      console.warn(`  Error fetching r/${subreddit}: ${err.message}`)
      if (attempt < retries) await sleep(2000)
    }
  }
  return null
}

async function main() {
  const result = { subreddits: [] }
  let updated = 0
  let kept = 0

  for (const sub of subreddits) {
    process.stdout.write(`Fetching r/${sub}... `)
    const posts = await fetchTopPosts(sub)
    if (posts) {
      result.subreddits.push({ name: sub, posts })
      console.log(`✓`)
      updated++
    } else {
      const old = currentData.subreddits.find(s => s.name === sub)
      if (old) {
        result.subreddits.push(old)
        console.log(`⚠ kept old data`)
        kept++
      } else {
        console.log(`✗ skipped (no fallback)`)
      }
    }
    await sleep(DELAY_MS)
  }

  writeFileSync(PUZZLES_PATH, JSON.stringify(result, null, 2))
  console.log(`\nDone. ${updated} updated, ${kept} kept from cache.`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
