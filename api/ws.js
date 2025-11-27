export const config = { runtime: "edge" };

export default async function handler(req) {
  // Only accept websocket upgrade requests
  if (req.headers.get("upgrade") !== "websocket") {
    return new Response("Expected websocket", { status: 400 });
  }

  // Create a WebSocket pair (Edge runtime)
  const pair = new WebSocketPair();
  const [client, server] = Object.values(pair);

  // Accept the server side and implement game logic
  server.accept();

  // Simple matchmaking: we'll store waiting connection on globalThis
  if (!globalThis._ttt_waiting) {
    // No waiting player — become the waiting player
    globalThis._ttt_waiting = { ws: server, id: Date.now().toString() };
    server.send(JSON.stringify({ type: "info", msg: "waiting" }));
    server.addEventListener("close", () => {
      if (globalThis._ttt_waiting && globalThis._ttt_waiting.ws === server) {
        delete globalThis._ttt_waiting;
      }
    });
  } else {
    // Match with the waiting player
    const p1 = globalThis._ttt_waiting;
    const p2 = { ws: server, id: Date.now().toString() };
    delete globalThis._ttt_waiting;

    // Create game state
    const game = {
      board: Array(9).fill(""),
      players: [p1.id, p2.id],
      sockets: {
        [p1.id]: p1.ws,
        [p2.id]: p2.ws
      },
      turn: p1.id
    };

    // send start messages
    try {
      p1.ws.send(JSON.stringify({ type: "start", symbol: "X", gameId: p1.id + "-" + p2.id }));
      p2.ws.send(JSON.stringify({ type: "start", symbol: "O", gameId: p1.id + "-" + p2.id }));
    } catch (e) {}

    // helper to broadcast
    function broadcastUpdate() {
      const payload = JSON.stringify({ type: "update", board: game.board, turn: game.turn });
      for (const s of Object.values(game.sockets)) {
        try { s.send(payload); } catch (e) {}
      }
    }

    // attach listeners
    for (const [pid, sock] of Object.entries(game.sockets)) {
      sock.addEventListener("message", (ev) => {
        let msg;
        try { msg = JSON.parse(ev.data); } catch(e){ return; }
        if (msg.type === "move") {
          // only allow if correct turn and cell empty
          if (game.turn !== pid) return;
          if (!game.board[msg.index]) {
            game.board[msg.index] = msg.symbol;
            // swap turn
            game.turn = game.players.find(id => id !== pid);
            broadcastUpdate();
          }
        }
      });

      sock.addEventListener("close", () => {
        // notify other player
        for (const [otherId, otherSock] of Object.entries(game.sockets)) {
          if (otherId !== pid) {
            try { otherSock.send(JSON.stringify({ type: "info", msg: "opponent_left" })); } catch(e){}
          }
        }
      });
    }
  }

  return new Response(null, { status: 101, webSocket: client });
}
