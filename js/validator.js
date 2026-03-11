// validator.js
// Checks whether placing `value` at (row, col) is valid.

function validRow(board, row, value) {
  return !board[row].includes(value)
}

function validColumn(board, col, value) {
  for (let r = 0; r < board.length; r++) {
    if (board[r][col] === value) return false
  }
  return true
}

function isValid(board, row, col, value) {
  return validRow(board, row, value) && validColumn(board, col, value)
}