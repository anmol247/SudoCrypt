const initialPuzzle = [
  [5,3,0,0,7,0,0,0,0],
  [6,0,0,1,9,5,0,0,0],
  [0,9,8,0,0,0,0,6,0],
  [8,0,0,0,6,0,0,0,3],
  [4,0,0,8,0,3,0,0,1],
  [7,0,0,0,2,0,0,0,6],
  [0,6,0,0,0,0,2,8,0],
  [0,0,0,4,1,9,0,0,5],
  [0,0,0,0,8,0,0,7,9]
];

let board = initialPuzzle.map(row =>
  row.map(cell => ({
    value: cell === 0 ? "" : cell,
    fixed: cell !== 0
  }))
);

const grid = document.getElementById("grid");

function renderGrid() {
  grid.innerHTML = "";

  board.forEach((row, r) => {
    row.forEach((cell, c) => {
      const input = document.createElement("input");

      input.value = cell.value;
      input.disabled = cell.fixed;

      input.dataset.row = r;
      input.dataset.col = c;

      input.addEventListener("input", handleInput);

      grid.appendChild(input);
    });
  });
}

function createMove(row, col, value) {
  return {
    type: "move",
    row,
    col,
    value
  };
}

renderGrid();

function updateCell(row, col, value) {
  board[row][col].value = value;
}
function renderCell(row, col) {
  const input = document.querySelector(
    `[data-row="${row}"][data-col="${col}"]`
  );

  input.value = board[row][col].value;
}
function applyMove(move) {
  updateCell(move.row, move.col, move.value);
  renderCell(move.row, move.col);

  const input = document.querySelector(
    `[data-row="${move.row}"][data-col="${move.col}"]`
  );

  input.classList.remove("invalid");

  if (move.value !== "" && !isValid(move.row, move.col, move.value)) {
    input.classList.add("invalid");
  }
}

function handleInput(e) {
  const input = e.target;
  const row = Number(input.dataset.row);
  const col = Number(input.dataset.col);
  const value = input.value;

  input.classList.remove("invalid");

  // Deletion
  if (value === "") {
    const move = createMove(row, col, "");
    socket.send(JSON.stringify(move));
    return;
  }

  // Invalid input
  if (!/^[1-9]$/.test(value)) {
    input.value = "";
    const move = createMove(row, col, "");
    socket.send(JSON.stringify(move));
    return;
  }

  // Valid input
  const number = Number(value);
  const move = createMove(row, col, number);

  socket.send(JSON.stringify(move));

  if (!isValid(row, col, number)) {
    input.classList.add("invalid");
  }
}

function isValid(row, col, num) {
  // Row
  for (let c = 0; c < 9; c++) {
    if (c !== col && board[row][c].value == num) {
      return false;
    }
  }

  // Column
  for (let r = 0; r < 9; r++) {
    if (r !== row && board[r][col].value == num) {
      return false;
    }
  }

  // 3x3 box
  const startRow = Math.floor(row / 3) * 3;
  const startCol = Math.floor(col / 3) * 3;

  for (let r = startRow; r < startRow + 3; r++) {
    for (let c = startCol; c < startCol + 3; c++) {
      if ((r !== row || c !== col) && board[r][c].value == num) {
        return false;
      }
    }
  }

  return true;
}

const params = new URLSearchParams(window.location.search);
const roomId = params.get("room") || "default-room";
  
const socket = new WebSocket(`wss://sudocrypt.onrender.com/ws/${roomId}`);
socket.onopen = () => {
  console.log("Connected to server");
};
socket.onmessage = (event) => {
  const data = JSON.parse(event.data);

  if (data.type === "init") {
    // convert to your structure
    board = data.board.map(row =>
      row.map(cell => ({
        value: cell === 0 ? "" : cell,
        fixed: cell !== 0
      }))
    );

    renderGrid();
    return;
  }

  applyMove(data);
};

