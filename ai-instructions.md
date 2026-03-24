Build a daily web puzzle game called "Which Sub?" that works on desktop and mobile.
Core gameplay:
The player is shown 5 real post titles from a popular subreddit. They have to guess which subreddit the posts are from. They type their guess into an input field with autocomplete suggestions from a predefined list of ~200 well-known subreddits. They get one guess per reveal. The game flow is:

Show post title #1. Player guesses or skips.
Reveal post title #2. Player guesses or skips.
Continue through all 5 titles.
After title #5, if they haven't guessed correctly, reveal the answer.

Scoring:

Guess correctly after 1 title: 5 points
After 2: 4 points
After 3: 3 points
After 4: 2 points
After 5: 1 point
Failed: 0 points
Do this for 3 rounds (3 different subreddits) per daily game, so max score is 15.

Daily puzzle system:

Use the current date as a seed to deterministically select which 3 subreddits and which 5 posts per subreddit are shown that day. Everyone playing on the same day gets the same puzzle.
The puzzle data should be stored in a static JSON file so the app works without a backend. I'll populate this data separately via a script (see below).

Data structure — create a JSON file puzzles.json:
```
json{
  "subreddits": [
    {
      "name": "mildlyinteresting",
      "posts": [
        "My egg had a smaller egg inside it",
        "This tree grew around a street sign",
        "My hotel room number is in a different font than the others",
        "Found a chip that looks exactly like a bird",
        "The shadow of this fence looks like a piano"
      ]
    }
  ]
}
Populate this with 90 subreddits (enough for 30 days of 3 rounds each). Choose well-known subreddits where the top posts are funny, distinctive, and recognisable. Mix obvious ones (r/cats, r/programming) with tricky ones (r/whatisthisthing, r/AmItheAsshole). The post titles should be real-sounding and characteristic of that subreddit's vibe — write plausible example titles if you need to. Each subreddit gets exactly 5 post titles.

**Also create a separate `subreddit_list.json`:**
This is the autocomplete list. Include ~200 popular subreddit names (without the r/ prefix). This should include all 90 answer subreddits plus ~110 plausible decoys so the autocomplete doesn't give away answers.

**UI/UX requirements:**
- Clean, minimal, mobile-first design. Think Wordle's simplicity.
- The vibe should feel like Reddit — use a monospace or slightly techy font, muted dark background, card-style post titles that look like Reddit post listings.
- Post titles are revealed one at a time with a subtle slide-in animation.
- The autocomplete input should be prominent and feel snappy. Filter as the user types, show max 6 suggestions.
- After each round completes, show a brief result (correct/incorrect, how many titles it took) before moving to the next round.
- End screen shows total score out of 15, with a share button that copies an emoji summary to clipboard like:
```
Which Sub? Mar 22
🟩⬜⬜⬜⬜ (1/5)
⬜⬜⬜🟩⬜ (4/5)
⬜⬜⬜⬜❌ (0/5)
Score: 7/15
Where green squares show which title they guessed correctly on, and ❌ means they failed that round.

Persist today's game state in React state (no localStorage). If they refresh they start over — that's fine for a prototype.

Tech stack:

Single-page React app (one .jsx file if possible)
No backend, purely static
The JSON data files should be imported/embedded directly

Do not build: user accounts, streaks, leaderboards, or settings. Just the core game loop.
