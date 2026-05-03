// game.js
// Core game logic — state saved on reload only.
//
// HOW RELOAD DETECTION WORKS (no beforeunload tricks):
//
//   sessionStorage is per-tab and survives F5/Ctrl+R reload,
//   but is wiped when the tab is closed, a new tab is opened,
//   or the user navigates to a different URL (back/forward included).
//
//   So the rule is simple:
//     • On initGame()  → write SESSION_KEY to sessionStorage ("game is live")
//     • On window.onload → if SESSION_KEY exists in sessionStorage AND a valid
//       save exists in localStorage → it's a reload → restore and resume.
//     • If SESSION_KEY is absent → new tab / closed tab / navigated away
//       → treat as fresh start, show end-game modal with saved scores if any,
//         then wipe everything.

const SAVE_KEY    = 'geoSudoku_state'    // localStorage  — survives reload
const SESSION_KEY = 'geoSudoku_session'  // sessionStorage — dies on tab close / navigation

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

  activeCell:      null,
  attemptedCells:  new Set(),
  levelWrongCount: 0,
  gameStarted:     false,
}

let timerInterval = null

// ── Scoring helpers ───────────────────────────────────
function pointsPerCell()     { return Math.floor(GameState.level / 3) + 1 }
function perfectLevelBonus() { return Math.floor(GameState.level / 5) + 2 }

// ── Persistence ───────────────────────────────────────

function saveState() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      level:           GameState.level,
      score:           GameState.score,
      attempts:        GameState.attempts,
      correct:         GameState.correct,
      wrong:           GameState.wrong,
      time:            GameState.time,
      maxTime:         GameState.maxTime,
      gridSize:        GameState.gridSize,
      board:           GameState.board,
      solution:        GameState.solution,
      symbols:         GameState.symbols,
      activeCell:      GameState.activeCell,
      attemptedCells:  [...GameState.attemptedCells],
      levelWrongCount: GameState.levelWrongCount,
      gameStarted:     GameState.gameStarted,
    }))
  } catch (e) {
    console.warn('GeoSudoku: could not save state', e)
  }
}

function loadState() {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (!raw) return false
    const s = JSON.parse(raw)
    if (typeof s.level !== 'number' || !Array.isArray(s.board) ||
        !Array.isArray(s.solution)  || !Array.isArray(s.symbols)) return false

    GameState.level           = s.level
    GameState.score           = s.score
    GameState.attempts        = s.attempts
    GameState.correct         = s.correct
    GameState.wrong           = s.wrong
    GameState.time            = s.time
    GameState.maxTime         = s.maxTime
    GameState.gridSize        = s.gridSize
    GameState.board           = s.board
    GameState.solution        = s.solution
    GameState.symbols         = s.symbols
    GameState.activeCell      = s.activeCell
    GameState.attemptedCells  = new Set(s.attemptedCells || [])
    GameState.levelWrongCount = s.levelWrongCount || 0
    GameState.gameStarted     = s.gameStarted || false
    return true
  } catch (e) {
    console.warn('GeoSudoku: could not load state', e)
    return false
  }
}

function clearSavedState() {
  try { localStorage.removeItem(SAVE_KEY)     } catch (e) {}
  try { sessionStorage.removeItem(SESSION_KEY) } catch (e) {}
}

function markSessionAlive() {
  try { sessionStorage.setItem(SESSION_KEY, '1') } catch (e) {}
}

function isSessionAlive() {
  try { return sessionStorage.getItem(SESSION_KEY) === '1' } catch (e) { return false }
}

// ── Toast ─────────────────────────────────────────────
function showToast(message, type = 'bonus') {
  const old = document.getElementById('score-toast')
  if (old) old.remove()

  const toast = document.createElement('div')
  toast.id = 'score-toast'
  toast.innerText = message
  toast.style.cssText = `
    position: fixed; top: 80px; left: 50%;
    transform: translateX(-50%) translateY(-10px);
    background: ${type === 'bonus' ? '#1a7a3c' : '#b91c1c'};
    color: white; padding: 10px 22px; border-radius: 4px;
    font-family: Arial, Helvetica, sans-serif; font-size: 14px;
    font-weight: 700; letter-spacing: 0.5px;
    box-shadow: 0 4px 16px rgba(0,0,0,0.25); z-index: 999;
    opacity: 0; transition: opacity 0.2s ease, transform 0.2s ease;
    pointer-events: none;`
  document.body.appendChild(toast)
  requestAnimationFrame(() => {
    toast.style.opacity = '1'
    toast.style.transform = 'translateX(-50%) translateY(0)'
  })
  setTimeout(() => {
    toast.style.opacity = '0'
    toast.style.transform = 'translateX(-50%) translateY(-10px)'
    setTimeout(() => toast.remove(), 300)
  }, 2000)
}

// ── Boot ─────────────────────────────────────────────
window.onload = function () {
  clearInterval(timerInterval)
  timerInterval = null

  const sessionAlive = isSessionAlive()  // true only if same tab reloaded
  const hasSave      = loadState()       // load whatever is in localStorage

  if (sessionAlive && hasSave && GameState.gameStarted) {
    // ── RELOAD of an active game → restore and resume ──────────────────
    document.getElementById('start-overlay').classList.add('hidden')
    restoreUI()
    if (isBoardFilled()) {
      setTimeout(nextLevel, 400)
    } else {
      resumeTimer()
    }

  } else if (!sessionAlive && hasSave && GameState.gameStarted) {
    // ── NEW TAB / TAB CLOSED / NAVIGATED AWAY while game was running ───
    // Show the end-game modal with the scores from the interrupted game,
    // then wipe state so the next action starts fresh.
    clearSavedState()
    showEndModal()

  } else {
    // ── Genuine fresh start (no save, or save from a completed game) ───
    clearSavedState()
    freshStart()
  }
}

// Show end-game modal using whatever is currently in GameState
// (already loaded from localStorage above).
function showEndModal() {
  clearInterval(timerInterval)
  timerInterval = null

  const { score, level, correct, wrong, attempts } = GameState
  const accuracy = attempts > 0 ? Math.round((correct / attempts) * 100) : 100

  document.getElementById('res-score').innerText    = score
  document.getElementById('res-level').innerText    = level
  document.getElementById('res-attempts').innerText = attempts
  document.getElementById('res-correct').innerText  = correct
  document.getElementById('res-wrong').innerText    = wrong
  document.getElementById('res-accuracy').innerText = `${accuracy}%`
  document.getElementById('acc-pct').innerText      = `${accuracy}%`

  // Hide the start overlay so the modal is visible
  const startOverlay = document.getElementById('start-overlay')
  if (startOverlay) startOverlay.classList.add('hidden')

  document.getElementById('modal-overlay').classList.remove('hidden')

  requestAnimationFrame(() => {
    setTimeout(() => {
      const fill = document.getElementById('acc-bar-fill')
      if (fill) fill.style.width = `${accuracy}%`
    }, 150)
  })
}

// Reset everything and show the start screen
function freshStart() {
  GameState.level           = 1
  GameState.score           = 0
  GameState.attempts        = 0
  GameState.correct         = 0
  GameState.wrong           = 0
  GameState.time            = GameState.maxTime
  GameState.activeCell      = null
  GameState.attemptedCells  = new Set()
  GameState.levelWrongCount = 0
  GameState.gameStarted     = false

  loadLevel(1)
  // Timer not started — waiting for user to click Start Assessment
}

// ── Restore UI after reload ───────────────────────────
function restoreUI() {
  document.getElementById('score').innerText    = GameState.score
  document.getElementById('correct').innerText  = GameState.correct
  document.getElementById('wrong').innerText    = GameState.wrong
  document.getElementById('attempts').innerText = GameState.attempts
  document.getElementById('level').innerText    = GameState.level
  document.getElementById('level2').innerText   = GameState.level

  renderBoard(GameState.board)
  renderOptions()
  updateLevelBar(GameState.level)
  updateTimerUI()

  const hint = document.getElementById('hint-text')
  if (hint) {
    hint.innerHTML = `Each correct cell earns <strong>${pointsPerCell()} pts</strong> at Level ${GameState.level}. 
      Complete the level with <strong>NO mistakes</strong> for a <strong>+${perfectLevelBonus()} Perfect Level Bonus!</strong>`
  }
}

// ── Called by index.html startGame() ─────────────────
function initGame() {
  clearInterval(timerInterval)
  timerInterval = null

  GameState.gameStarted = true
  markSessionAlive()   // stamp the sessionStorage so reloads know the game is live
  saveState()
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
  updateLevelBar(level)

  const hint = document.getElementById('hint-text')
  if (hint) {
    hint.innerHTML = `Each correct cell earns <strong>${pointsPerCell()} pts</strong> at Level ${level}. 
      Complete the level with <strong>NO mistakes</strong> for a <strong>+${perfectLevelBonus()} Perfect Level Bonus!</strong>`
  }

  if (GameState.gameStarted) saveState()
}

function updateLevelBar(level) {
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
}

function nextLevel() {
  if (GameState.levelWrongCount === 0) {
    const bonus = perfectLevelBonus()
    GameState.score += bonus
    document.getElementById('score').innerText = GameState.score
    showToast(`✨ Perfect Level! +${bonus}`, 'bonus')
  }
  GameState.level++
  loadLevel(GameState.level)
  if (!timerInterval) resumeTimer()
}

// ── Answer Checking ───────────────────────────────────
function checkAnswer(symbol) {
  if (!GameState.activeCell) return

  const { row: r, col: c } = GameState.activeCell
  const cellKey = `${r},${c}`

  GameState.attempts++
  document.getElementById('attempts').innerText = GameState.attempts

  if (symbol === GameState.solution[r][c]) {
    GameState.correct++
    document.getElementById('correct').innerText = GameState.correct

    if (!GameState.attemptedCells.has(cellKey)) {
      GameState.attemptedCells.add(cellKey)
      GameState.score += pointsPerCell()
      document.getElementById('score').innerText = GameState.score
    }

    GameState.board[r][c] = symbol
    GameState.activeCell  = null

    const idx = r * GameState.gridSize + c
    const el  = document.querySelectorAll('.cell')[idx]
    if (el) el.classList.add('correct-flash')

    saveState()

    setTimeout(() => {
      renderBoard(GameState.board)
      if (isBoardFilled()) setTimeout(nextLevel, 600)
    }, 250)

  } else {
    GameState.wrong++
    GameState.levelWrongCount++
    GameState.score = Math.max(0, GameState.score - 1)

    document.getElementById('wrong').innerText = GameState.wrong
    document.getElementById('score').innerText = GameState.score

    const idx = r * GameState.gridSize + c
    const el  = document.querySelectorAll('.cell')[idx]
    if (el) {
      el.classList.add('wrong-flash')
      setTimeout(() => el.classList.remove('wrong-flash'), 350)
    }

    saveState()
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
  clearInterval(timerInterval)
  GameState.time = GameState.maxTime
  updateTimerUI()
  _runTimer()
}

function resumeTimer() {
  clearInterval(timerInterval)
  updateTimerUI()
  _runTimer()
}

function _runTimer() {
  timerInterval = setInterval(() => {
    GameState.time--
    updateTimerUI()
    if (GameState.time % 5 === 0) saveState()

    if (GameState.time <= 0) {
      clearInterval(timerInterval)
      timerInterval = null
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
  timerInterval = null
  clearSavedState()   // wipe save — next visit starts fresh

  const { score, level, correct, wrong, attempts } = GameState
  const accuracy = attempts > 0 ? Math.round((correct / attempts) * 100) : 100

  document.getElementById('res-score').innerText    = score
  document.getElementById('res-level').innerText    = level
  document.getElementById('res-attempts').innerText = attempts
  document.getElementById('res-correct').innerText  = correct
  document.getElementById('res-wrong').innerText    = wrong
  document.getElementById('res-accuracy').innerText = `${accuracy}%`
  document.getElementById('acc-pct').innerText      = `${accuracy}%`

  document.getElementById('modal-overlay').classList.remove('hidden')

  requestAnimationFrame(() => {
    setTimeout(() => {
      const fill = document.getElementById('acc-bar-fill')
      if (fill) fill.style.width = `${accuracy}%`
    }, 150)
  })
}

// ── Restart ───────────────────────────────────────────
function restartGame() {
  clearInterval(timerInterval)
  timerInterval = null
  clearSavedState()
  location.reload()
}

// ── Parent hub hooks ──────────────────────────────────
function pauseAndSave() {
  // Navigating away via the hub = end the game, clear state
  clearInterval(timerInterval)
  timerInterval = null
  if (GameState.gameStarted) endGame('navigated away')
  else clearSavedState()
}

function resumeGame() {
  clearSavedState()
  freshStart()
  const overlay = document.getElementById('start-overlay')
  if (overlay) overlay.classList.remove('hidden')
}

window.geoSudoku = { pauseAndSave, resumeGame }