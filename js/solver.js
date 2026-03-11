// solver.js
// Backtracking solver — used internally to verify puzzle solvability.

function solve(board) {
  for (let r = 0; r < board.length; r++) {
    for (let c = 0; c < board.length; c++) {
      if (board[r][c] === '') {
        for (let sym of GameState.symbols) {
          if (isValid(board, r, c, sym)) {
            board[r][c] = sym
            if (solve(board)) return true
            board[r][c] = ''
          }
        }
        return false  // no valid symbol found — dead end
      }
    }
  }
  return true  // all cells filled
}