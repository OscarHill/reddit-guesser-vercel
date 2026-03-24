import { useState, useEffect, useRef, useMemo } from 'react'
import puzzlesData from './puzzles.json'
import subredditListData from './subreddit_list.json'

// ── Seeded random ─────────────────────────────────────────────────────────────

function hashDate(str) {
  let h = 5381
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h, 31) + str.charCodeAt(i) | 0
  }
  return Math.abs(h)
}

function seededPickN(arr, seed, n) {
  const result = []
  const used = new Set()
  let s = seed
  while (result.length < n) {
    s = Math.abs(Math.imul(s, 1664525) + 1013904223 | 0)
    const idx = s % arr.length
    if (!used.has(idx)) {
      used.add(idx)
      result.push(arr[idx])
    }
  }
  return result
}

function getDailyPuzzle(seedOverride) {
  const d = new Date()
  const dateStr = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
  const seed = seedOverride != null ? Math.abs(seedOverride | 0) : hashDate(dateStr)
  const picked = seededPickN(puzzlesData.subreddits, seed, 3)
  const month = d.toLocaleString('en-US', { month: 'short' })
  const day = d.getDate()
  const label = seedOverride != null ? `Game #${seed % 10000}` : `${month} ${day}`
  return {
    dateLabel: label,
    seed,
    rounds: picked.map(sub => ({ name: sub.name, posts: sub.posts })),
  }
}

const SCORE_MAP = [5, 4, 3, 2, 1]

// ── Sub-components ────────────────────────────────────────────────────────────

function TitleCard({ title, fresh }) {
  return (
    <div className={`title-card${fresh ? ' title-card--fresh' : ''}`}>
      <span className="title-card__bullet">▲</span>
      <span className="title-card__text">{title}</span>
    </div>
  )
}

function GuessInput({ value, onChange, onSubmit, suggestions, onSuggestionClick, showSuggestions, inputRef }) {
  return (
    <div className="guess-input-wrap">
      <div className="guess-row">
        <span className="guess-prefix">r/</span>
        <input
          ref={inputRef}
          className="guess-input"
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') onSubmit()
            if (e.key === 'Escape') onChange('')
          }}
          placeholder="subreddit name…"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
        />
      </div>
      {showSuggestions && suggestions.length > 0 && (
        <ul className="suggestions">
          {suggestions.map(s => (
            <li key={s} className="suggestion" onMouseDown={() => onSuggestionClick(s)}>
              r/{s}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function RoundResult({ answer, score, titleIndex, correct, roundNum, isLast, onNext }) {
  const squares = Array(5).fill(null).map((_, i) => {
    if (!correct) return i === 4 ? '❌' : '⬜'
    return i === titleIndex ? '🟩' : '⬜'
  })

  return (
    <div className="result-screen">
      <div className="result-badge" data-correct={correct}>
        {correct ? '✓ Correct' : '✗ Wrong'}
      </div>
      <div className="result-answer">
        r/<strong>{answer}</strong>
      </div>
      <div className="result-squares">{squares.join(' ')}</div>
      <div className="result-score">
        {correct
          ? `+${score} point${score !== 1 ? 's' : ''} — guessed on title ${titleIndex + 1}`
          : 'No points this round'}
      </div>
      <button className="btn-primary" onClick={onNext}>
        {isLast ? 'See final score →' : `Round ${roundNum + 1} →`}
      </button>
    </div>
  )
}

function EndScreen({ scores, roundResults, puzzle, onNewGame }) {
  const total = scores.reduce((a, b) => (a || 0) + (b || 0), 0)
  const [copied, setCopied] = useState(false)

  const shareText = useMemo(() => {
    const lines = roundResults.map(r => {
      if (!r) return '⬜⬜⬜⬜⬜ (–)'
      const { correct, titleIndex } = r
      const sq = Array(5).fill('⬜').map((_, i) => (!correct ? (i === 4 ? '❌' : '⬜') : i === titleIndex ? '🟩' : '⬜')).join('')
      const label = correct ? `(${titleIndex + 1}/5)` : '(0/5)'
      return `${sq} ${label}`
    })
    return `Which Sub? ${puzzle.dateLabel}\n${lines.join('\n')}\nScore: ${total}/15`
  }, [roundResults, total, puzzle.dateLabel])

  function copy() {
    navigator.clipboard.writeText(shareText).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const grade =
    total === 15 ? 'Perfect!' :
    total >= 12 ? 'Excellent' :
    total >= 9  ? 'Good' :
    total >= 6  ? 'Fair' :
    total >= 3  ? 'Rough' :
                  'Better luck tomorrow'

  return (
    <div className="result-screen end-screen">
      <div className="end-title">Which Sub?</div>
      <div className="end-date">{puzzle.dateLabel}</div>
      <div className="end-score">{total}<span>/15</span></div>
      <div className="end-grade">{grade}</div>
      <div className="end-breakdown">
        {roundResults.map((r, i) => {
          if (!r) return null
          const { correct, titleIndex } = r
          const sq = Array(5).fill('⬜').map((_, j) => (!correct ? (j === 4 ? '❌' : '⬜') : j === titleIndex ? '🟩' : '⬜')).join(' ')
          return (
            <div key={i} className="end-row">
              <span className="end-row__squares">{sq}</span>
              <span className="end-row__sub">r/{puzzle.rounds[i].name}</span>
              <span className="end-row__pts">{scores[i] || 0}pt</span>
            </div>
          )
        })}
      </div>
      <button className="btn-primary" onClick={copy}>
        {copied ? '✓ Copied!' : '⬜ Share result'}
      </button>
      <button className="btn-skip" style={{width:'100%', maxWidth:300}} onClick={onNewGame}>
        New game →
      </button>
    </div>
  )
}

// ── Main game ────────────────────────────────────────────────────────────────

export default function App() {
  const [seedOverride, setSeedOverride] = useState(() => {
    const p = new URLSearchParams(window.location.search).get('seed')
    return p != null ? parseInt(p, 10) : null
  })
  const puzzle = useMemo(() => getDailyPuzzle(seedOverride), [seedOverride])
  const [round, setRound] = useState(0)
  const [titleIdx, setTitleIdx] = useState(0)
  const [guess, setGuess] = useState('')
  const [showSugg, setShowSugg] = useState(false)
  const [phase, setPhase] = useState('playing') // playing | round_result | end
  const [scores, setScores] = useState([null, null, null])
  const [roundResults, setRoundResults] = useState([null, null, null])
  const [freshTitle, setFreshTitle] = useState(false)
  const inputRef = useRef(null)

  const subredditList = subredditListData.subreddits
  const currentRound = puzzle.rounds[round]
  const visiblePosts = currentRound.posts.slice(0, titleIdx + 1)

  const suggestions = useMemo(() => {
    if (!guess) return []
    const q = guess.toLowerCase()
    return subredditList.filter(s => s.toLowerCase().includes(q)).slice(0, 6)
  }, [guess, subredditList])

  // Auto-focus input when playing
  useEffect(() => {
    if (phase === 'playing') inputRef.current?.focus()
  }, [phase, round])

  function revealNextTitle() {
    setFreshTitle(false)
    requestAnimationFrame(() => {
      setTitleIdx(p => p + 1)
      setFreshTitle(true)
    })
  }

  function endRound(correct, pts) {
    const newScores = [...scores]
    newScores[round] = pts
    const newResults = [...roundResults]
    newResults[round] = { correct, titleIndex: titleIdx }
    setScores(newScores)
    setRoundResults(newResults)
    setPhase('round_result')
    setGuess('')
    setShowSugg(false)
  }

  function submitGuess(g) {
    const val = (g ?? guess).trim()
    if (!val) return
    const correct = val.toLowerCase() === currentRound.name.toLowerCase()
    if (correct) {
      endRound(true, SCORE_MAP[titleIdx])
    } else if (titleIdx === 4) {
      endRound(false, 0)
    } else {
      revealNextTitle()
      setGuess('')
      setShowSugg(false)
    }
  }

  function skip() {
    if (titleIdx === 4) {
      endRound(false, 0)
    } else {
      revealNextTitle()
      setGuess('')
      setShowSugg(false)
    }
  }

  function nextRound() {
    if (round === 2) {
      setPhase('end')
    } else {
      setRound(r => r + 1)
      setTitleIdx(0)
      setFreshTitle(false)
      setGuess('')
      setPhase('playing')
    }
  }

  // ── Render phases ──────────────────────────────────────────────────────────

  function startNewGame() {
    const next = Math.floor(Math.random() * 1_000_000)
    setSeedOverride(next)
    setRound(0)
    setTitleIdx(0)
    setFreshTitle(false)
    setGuess('')
    setScores([null, null, null])
    setRoundResults([null, null, null])
    setPhase('playing')
  }

  if (phase === 'end') {
    return (
      <div className="app">
        <EndScreen scores={scores} roundResults={roundResults} puzzle={puzzle} onNewGame={startNewGame} />
      </div>
    )
  }

  if (phase === 'round_result') {
    const r = roundResults[round]
    return (
      <div className="app">
        <RoundResult
          answer={currentRound.name}
          score={scores[round]}
          titleIndex={r?.titleIndex ?? 4}
          correct={r?.correct ?? false}
          roundNum={round}
          isLast={round === 2}
          onNext={nextRound}
        />
      </div>
    )
  }

  return (
    <div className="app">
      <header className="header">
        <span className="header__logo">Which Sub?</span>
        <span className="header__meta">
          <span className="header__date">{puzzle.dateLabel}</span>
          <span className="header__round">Round {round + 1} of 3</span>
        </span>
      </header>

      <main className="main">
        <div className="progress-dots">
          {[0, 1, 2].map(i => (
            <span key={i} className={`dot ${i < round ? 'dot--done' : i === round ? 'dot--active' : ''}`} />
          ))}
        </div>

        <div className="posts">
          {visiblePosts.map((post, i) => (
            <TitleCard
              key={i}
              title={post}
              fresh={i === visiblePosts.length - 1 && freshTitle}
            />
          ))}
        </div>

        <div className="hint-bar">
          {titleIdx === 0
            ? 'Which subreddit are these from?'
            : titleIdx < 4
              ? `${4 - titleIdx} more clue${4 - titleIdx !== 1 ? 's' : ''} remaining`
              : 'Last clue — make it count'}
        </div>

        <GuessInput
          value={guess}
          onChange={v => { setGuess(v); setShowSugg(true) }}
          onSubmit={() => submitGuess()}
          suggestions={suggestions}
          onSuggestionClick={s => { submitGuess(s) }}
          showSuggestions={showSugg}
          inputRef={inputRef}
        />

        <div className="action-row">
          <button className="btn-skip" onClick={skip}>
            {titleIdx === 4 ? 'Give up' : 'Skip →'}
          </button>
          <button className="btn-primary" onClick={() => submitGuess()} disabled={!guess.trim()}>
            Guess
          </button>
        </div>
      </main>
    </div>
  )
}
