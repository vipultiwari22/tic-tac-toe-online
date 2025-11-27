let ws;
let symbol = null;
let gameId = null;
let myId = null;
let turn = null;

function connect() {
  const proto = location.protocol === "https:" ? "wss:" : "ws:";
  const url = proto + "//" + location.host + "/api/ws";
  ws = new WebSocket(url);

  ws.onopen = () => {
    document.getElementById("status").innerText = "Connected – waiting for opponent...";
  };

  ws.onmessage = (e) => {
    const msg = JSON.parse(e.data);
    if (msg.type === "info") {
      if (msg.msg === "waiting") {
        document.getElementById("status").innerText = "Waiting for opponent...";
      } else if (msg.msg === "opponent_left") {
        document.getElementById("status").innerText = "Opponent left. Reload to find new match.";
      }
    }

    if (msg.type === "start") {
      symbol = msg.symbol;
      gameId = msg.gameId;
      document.getElementById("status").innerText = "Game started — you are " + symbol;
      renderBoard(Array(9).fill(""));
    }

    if (msg.type === "update") {
      turn = msg.turn;
      renderBoard(msg.board);
      document.getElementById("status").innerText = (turn === null ? "Waiting..." : (turn === symbol ? "Your turn" : "Opponent's turn"));
    }
  };

  ws.onclose = () => {
    document.getElementById("status").innerText = "Disconnected. Reload to reconnect.";
  };

  ws.onerror = (e) => {
    console.warn("ws error", e);
    document.getElementById("status").innerText = "Connection error.";
  };
}

function renderBoard(board) {
  const boardDiv = document.getElementById("board");
  boardDiv.innerHTML = "";
  board.forEach((val, idx) => {
    const c = document.createElement("div");
    c.className = "cell";
    c.textContent = val;
    c.onclick = () => {
      if (!val && ws && ws.readyState === WebSocket.OPEN) {
        // send move
        ws.send(JSON.stringify({ type: "move", index: idx, symbol }));
      }
    };
    boardDiv.appendChild(c);
  });
}

connect();
