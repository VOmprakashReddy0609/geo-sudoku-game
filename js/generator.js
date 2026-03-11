// generator.js
// Generates a solved Latin-square board and creates a puzzle by blanking cells.

function generateSolvedBoard(n) {
  const base = []
  for (let r = 0; r < n; r++) {
    base[r] = []
    for (let c = 0; c < n; c++) {
      base[r][c] = (r + c) % n
    }
  }
  shuffleRows(base)
  shuffleCols(base)
  return base
}

function shuffleRows(board) {
  for (let i = board.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [board[i], board[j]] = [board[j], board[i]]
  }
}

function shuffleCols(board) {
  const n = board.length
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    for (let r = 0; r < n; r++) {
      [board[r][i], board[r][j]] = [board[r][j], board[r][i]]
    }
  }
}

function createPuzzle(solution) {
  const puzzle = solution.map(row => [...row])  // deep copy
  const n      = solution.length
  const total  = n * n
  // Blank roughly half the cells, but always leave at least n cells filled
  let blanks   = Math.floor(total * 0.55)

  const positions = []
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++)
      positions.push([r, c])

  // Shuffle positions then blank sequentially to avoid repeated random hits
  for (let i = positions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [positions[i], positions[j]] = [positions[j], positions[i]]
  }

  for (let k = 0; k < blanks; k++) {
    const [r, c] = positions[k]
    puzzle[r][c] = null
  }

  return puzzle
}

function mapSymbols(board) {
  return board.map(row => row.map(v => {
    if (v === null || v === undefined) return ''
    return GameState.symbols[v]
  }))
}

function generatePuzzle() {
  const n        = GameState.gridSize
  const solution = generateSolvedBoard(n)
  const puzzle   = createPuzzle(solution)

  GameState.solution = mapSymbols(solution)
  GameState.board    = mapSymbols(puzzle)

  renderBoard(GameState.board)
}