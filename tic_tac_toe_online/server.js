const WebSocket = require("ws");

let users = [];
let games = {};

const server = new WebSocket.Server({ noServer: true });

function createGame(player1, player2) {
  const id = Math.random().toString(36).substr(2, 9);

  games[id] = {
    board: Array(9).fill(""),
    turn: player1.id,
    players: [player1.id, player2.id]
  };

  player1.gameId = id;
  player2.gameId = id;

  player1.ws.send(JSON.stringify({ type: "start", symbol: "X", gameId: id }));
  player2.ws.send(JSON.stringify({ type: "start", symbol: "O", gameId: id }));
}

server.on("connection", (ws) => {
  const user = { id: Date.now().toString(), ws };
  users.push(user);

  if (users.length >= 2) {
    createGame(users[0], users[1]);
    users = [];
  }

  ws.on("message", (data) => {
    const msg = JSON.parse(data);
    const game = games[msg.gameId];
    if (!game) return;

    if (msg.type === "move") {
      if (game.turn !== user.id) return;

      if (!game.board[msg.index]) {
        game.board[msg.index] = msg.symbol;
        game.turn = game.players.find((p) => p !== user.id);

        for (let pid of game.players) {
          const player = user.id === pid ? user : users.find(x => x.id === pid);
          if (player && player.ws.readyState === WebSocket.OPEN) {
            player.ws.send(JSON.stringify({
              type: "update",
              board: game.board,
              turn: game.turn
            }));
          }
        }
      }
    }
  });

  ws.on("close", () => {
    users = users.filter((x) => x.id !== user.id);
  });
});

module.exports = (req, res) => {
  if (req.headers.upgrade === "websocket") {
    server.handleUpgrade(req, req.socket, Buffer.alloc(0), (ws) => {
      server.emit("connection", ws);
    });
  } else {
    res.status(200).send("WebSocket Tic-Tac-Toe server running");
  }
};
