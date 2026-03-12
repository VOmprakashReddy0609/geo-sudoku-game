// game.js
// Core game logic — simplified scoring system.

// ── State ────────────────────────────────────────────
const GameState = {
  level:    1,
  score:    0,
  attempts: 0,
  correct:  0,
  wrong:    0,
  time:     240,
  maxTime:  240,

  gridSize: 3,
  board:    [],
  solution: [],
  symbols:  [],

  activeCell:     null,
  attemptedCells: new Set(),

  // ── Simplified scoring state ──
  levelWrongCount:  0,    // track mistakes for bonus eligibility
}

let timerInterval = null

// ── Simplified Scoring Rules ────────────────────────
//
//  CORRECT ANSWER → Base points (increases with level)
//    Points per correct cell = Math.floor(level / 3) + 1
//    Level 1-3:   1 point
//    Level 4-6:   2 points
//    Level 7-9:   3 points
//    Level 10-12: 4 points
//    and so on...
//
//  PERFECT LEVEL BONUS → Awarded if zero mistakes on that level
//    Bonus = Math.floor(level / 5) + 2
//    Level 1-4:   +2 bonus
//    Level 5-9:   +3 bonus  
//    Level 10-14: +4 bonus
//    Level 15-19: +5 bonus
//    and so on...
//
//  WRONG ANSWER → No points, just prevents bonus

function pointsPerCell() {
  return Math.floor(GameState.level / 3) + 1
}

function perfectLevelBonus() {
  return Math.floor(GameState.level / 5) + 2
}

// ── Toast notification ───────────────────────────────
function showToast(message, type = 'bonus') {
  const old = document.getElementById('score-toast')
  if (old) old.remove()

  const toast = document.createElement('div')
  toast.id = 'score-toast'
  toast.innerText = message
  toast.style.cssText = `
    position: fixed;
    top: 80px;
    left: 50%;
    transform: translateX(-50%) translateY(-10px);
    background: ${type === 'bonus' ? '#1a7a3c' : '#b91c1c'};
    color: white;
    padding: 10px 22px;
    border-radius: 4px;
    font-family: Arial, Helvetica, sans-serif;
    font-size: 14px;
    font-weight: 700;
    letter-spacing: 0.5px;
    box-shadow: 0 4px 16px rgba(0,0,0,0.25);
    z-index: 999;
    opacity: 0;
    transition: opacity 0.2s ease, transform 0.2s ease;
    pointer-events: none;
  `
  document.body.appendChild(toast)

  requestAnimationFrame(() => {
    toast.style.opacity   = '1'
    toast.style.transform = 'translateX(-50%) translateY(0)'
  })

  setTimeout(() => {
    toast.style.opacity   = '0'
    toast.style.transform = 'translateX(-50%) translateY(-10px)'
    setTimeout(() => toast.remove(), 300)
  }, 2000)
}

// ── Boot ─────────────────────────────────────────────
// Only pre-render the board on load — do NOT start the timer yet.
// The timer is started by initGame(), which is called from index.html
// after the user clicks "Start Assessment".
window.onload = function () {
  loadLevel(1)
  // Timer is intentionally NOT started here.
}

// Called by index.html's startGame() after the overlay is dismissed.
function initGame() {
  startTimer()
}

// ── Level Management ─────────────────────────────────
function loadLevel(level) {
  GameState.level           = level
  GameState.levelWrongCount = 0

  if (level <= 10) {
    GameState.gridSize = 3
    GameState.symbols  = ['▲', '●', '■']
  } else if (level <= 25) {
    GameState.gridSize = 4
    GameState.symbols  = ['▲', '●', '■', '✚']
  } else {
    GameState.gridSize = 5
    GameState.symbols  = ['▲', '●', '■', '✚', '★']
  }

  GameState.activeCell     = null
  GameState.attemptedCells = new Set()

  generatePuzzle()
  renderOptions()

  document.getElementById('level').innerText  = level
  document.getElementById('level2').innerText = level

  // Level bar cycles within each difficulty tier
  let tierStart, tierEnd
  if (level <= 10)      { tierStart = 1;  tierEnd = 10; }
  else if (level <= 25) { tierStart = 11; tierEnd = 25; }
  else {
    tierStart = 26 + Math.floor((level - 26) / 20) * 20
    tierEnd   = tierStart + 19
  }
  const pct = Math.round(((level - tierStart) / (tierEnd - tierStart + 1)) * 100)
  const lb  = document.getElementById('level-bar-fill')
  if (lb) lb.style.width = `${Math.max(3, pct)}%`

  // Show simplified scoring info
  const hint = document.getElementById('hint-text')
  if (hint) {
    const perfectBonus = perfectLevelBonus()
    hint.innerHTML = `Each correct cell earns <strong>${pointsPerCell()} pts</strong> at Level ${level}. 
      Complete the level with <strong>NO mistakes</strong> for a <strong>+${perfectBonus} Perfect Level Bonus!</strong>`
  }
}

function nextLevel() {
  // Award perfect level bonus if no mistakes were made
  if (GameState.levelWrongCount === 0) {
    const bonus = perfectLevelBonus()
    GameState.score += bonus
    document.getElementById('score').innerText = GameState.score
    showToast(`✨ Perfect Level! +${bonus}`, 'bonus')
  }
  
  GameState.level++
  loadLevel(GameState.level)
}

// ── Answer Checking ───────────────────────────────────
function checkAnswer(symbol) {
  if (!GameState.activeCell) return

  const { row: r, col: c } = GameState.activeCell
  const cellKey      = `${r},${c}`
  const isFirstGuess = !GameState.attemptedCells.has(cellKey)

  if (isFirstGuess) {
    GameState.attemptedCells.add(cellKey)
    GameState.attempts++
    document.getElementById('attempts').innerText = GameState.attempts
  }

  if (symbol === GameState.solution[r][c]) {
    // ── Correct: award points ──
    const pts = pointsPerCell()
    GameState.correct++
    GameState.score += pts
    GameState.board[r][c] = symbol
    GameState.activeCell   = null

    document.getElementById('correct').innerText = GameState.correct
    document.getElementById('score').innerText   = GameState.score

    const idx = r * GameState.gridSize + c
    const el  = document.querySelectorAll('.cell')[idx]
    if (el) el.classList.add('correct-flash')

    setTimeout(() => {
      renderBoard(GameState.board)
      if (isBoardFilled()) {
        setTimeout(nextLevel, 600)
      }
    }, 250)

  } else {
    // ── Wrong: track mistake (no point penalty) ──
    if (isFirstGuess) {
      GameState.wrong++
      GameState.levelWrongCount++
      document.getElementById('wrong').innerText = GameState.wrong
    }

    const idx = r * GameState.gridSize + c
    const el  = document.querySelectorAll('.cell')[idx]
    if (el) {
      el.classList.add('wrong-flash')
      setTimeout(() => el.classList.remove('wrong-flash'), 350)
    }
  }
}

// ── Board Completion ──────────────────────────────────
function isBoardFilled() {
  const { board, gridSize } = GameState
  for (let r = 0; r < gridSize; r++)
    for (let c = 0; c < gridSize; c++)
      if (board[r][c] === '') return false
  return true
}

// ── Timer ─────────────────────────────────────────────
function startTimer() {
  GameState.time = GameState.maxTime
  updateTimerUI()

  timerInterval = setInterval(() => {
    GameState.time--
    updateTimerUI()

    if (GameState.time <= 0) {
      clearInterval(timerInterval)
      endGame("Time's Up!")
    }
  }, 1000)
}

function updateTimerUI() {
  const t    = Math.max(0, GameState.time)
  const mins = String(Math.floor(t / 60)).padStart(2, '0')
  const secs = String(t % 60).padStart(2, '0')
  const pct  = (t / GameState.maxTime) * 100

  const minEl  = document.getElementById('timer-min')
  const secEl  = document.getElementById('timer-sec')
  const barEl  = document.getElementById('timer-bar-fill')
  const dispEl = document.getElementById('timer-display')

  if (minEl)  minEl.innerText   = mins
  if (secEl)  secEl.innerText   = secs
  if (barEl)  barEl.style.width = `${pct}%`

  if (dispEl) {
    dispEl.classList.remove('warning', 'danger')
    if (pct <= 15)      dispEl.classList.add('danger')
    else if (pct <= 33) dispEl.classList.add('warning')
  }

  if (barEl) {
    if (pct <= 15)      barEl.style.background = '#b91c1c'
    else if (pct <= 33) barEl.style.background = '#c45c00'
    else                barEl.style.background = 'var(--blue)'
  }
}

// ── End Game ──────────────────────────────────────────
function endGame(reason) {
  clearInterval(timerInterval)

  const { score, level, correct, wrong, attempts } = GameState
  const accuracy = attempts > 0 ? Math.round((correct / attempts) * 100) : 100

  document.getElementById('res-score').innerText    = score
  document.getElementById('res-level').innerText    = level
  document.getElementById('res-attempts').innerText = attempts
  document.getElementById('res-correct').innerText  = correct
  document.getElementById('res-wrong').innerText    = wrong
  document.getElementById('res-accuracy').innerText = `${accuracy}%`
  document.getElementById('acc-pct').innerText      = `${accuracy}%`

  const overlay = document.getElementById('modal-overlay')
  overlay.classList.remove('hidden')

  requestAnimationFrame(() => {
    setTimeout(() => {
      const fill = document.getElementById('acc-bar-fill')
      if (fill) fill.style.width = `${accuracy}%`
    }, 150)
  })
}

function restartGame() {
  location.reload()
}