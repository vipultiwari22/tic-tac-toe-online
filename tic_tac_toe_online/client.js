let socket;
let symbol = null;
let gameId = null;
let turn = null;

function connect() {
  socket = new WebSocket(`wss://${location.host}/ws`);

  socket.onmessage = (e) => {
    const msg = JSON.parse(e.data);

    if (msg.type === "start") {
      symbol = msg.symbol;
      gameId = msg.gameId;
      document.getElementById("status").innerText =
        "Game Started – You are " + symbol;
      renderBoard(Array(9).fill(""));
    }

    if (msg.type === "update") {
      turn = msg.turn;
      renderBoard(msg.board);
      document.getElementById("status").innerText =
        turn === symbol ? "Your Turn" : "Opponent's Turn";
    }
  };
}

function renderBoard(board) {
  const boardDiv = document.getElementById("board");
  boardDiv.innerHTML = "";

  board.forEach((val, idx) => {
    const c = document.createElement("div");
    c.className = "cell";
    c.innerHTML = val;

    c.onclick = () => {
      if (!val && turn === symbol) {
        socket.send(
          JSON.stringify({
            type: "move",
            index: idx,
            symbol,
            gameId
          })
        );
      }
    };

    boardDiv.appendChild(c);
  });
}

connect();
