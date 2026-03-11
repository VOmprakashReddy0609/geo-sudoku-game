// board.js
// Renders the grid and handles cell selection.

function renderBoard(board) {
  const container = document.getElementById('board')
  container.innerHTML = ''

  const size = board.length
  container.style.gridTemplateColumns = `repeat(${size}, var(--cell-size))`

  // Track total and filled cells for the progress bar
  let filledCount = 0
  const totalCount = size * size

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const cell = document.createElement('div')

      if (board[r][c] !== '') {
        // Pre-filled / correctly answered cell
        cell.className = 'cell given'
        cell.innerText = board[r][c]
        filledCount++
      } else {
        // Blank cell awaiting input
        cell.className = 'cell blank'
        cell.innerText = '?'
        cell.addEventListener('click', () => selectCell(r, c, cell))
      }

      // Restore active highlight after re-render
      if (
        GameState.activeCell &&
        GameState.activeCell.row === r &&
        GameState.activeCell.col === c &&
        board[r][c] === ''
      ) {
        cell.classList.remove('blank')
        cell.classList.add('active')
      }

      container.appendChild(cell)
    }
  }

  updateProgress(filledCount, totalCount)
}

function selectCell(r, c, element) {
  if (GameState.board[r][c] !== '') return  // already filled

  // Remove active class from all cells
  document.querySelectorAll('.cell').forEach(el => {
    el.classList.remove('active', 'highlight-rc')
  })

  // Highlight the selected cell
  element.classList.remove('blank')
  element.classList.add('active')
  element.innerText = '?'

  // Subtle row/column highlight
  const size = GameState.gridSize
  const allCells = document.querySelectorAll('.cell')
  allCells.forEach((el, idx) => {
    const cr = Math.floor(idx / size)
    const cc = idx % size
    if ((cr === r || cc === c) && !(cr === r && cc === c)) {
      if (!el.classList.contains('given') && !el.classList.contains('active')) {
        el.classList.add('highlight-rc')
      }
    }
  })

  GameState.activeCell = { row: r, col: c }
}

function updateProgress(filled, total) {
  const pct  = total > 0 ? Math.round((filled / total) * 100) : 0
  const fill = document.getElementById('progress-bar-fill')
  const lbl  = document.getElementById('filled-count')
  const tot  = document.getElementById('total-count')
  if (fill) fill.style.width = `${pct}%`
  if (lbl)  lbl.innerText = filled
  if (tot)  tot.innerText = total
}

function renderOptions() {
  const options = document.getElementById('options')
  options.innerHTML = ''

  GameState.symbols.forEach(sym => {
    const btn = document.createElement('div')
    btn.className = 'option'
    btn.innerText = sym
    btn.title = `Place ${sym}`
    btn.addEventListener('click', () => checkAnswer(sym))
    options.appendChild(btn)
  })
}