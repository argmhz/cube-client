const express = require('express');
const net = require('net');

const app = express();
require('express-ws')(app);

const CUBE_HOST = 'localhost';
const CUBE_PORT = 1234;
const RECONNECT_DELAY_MS = 2000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('./www'));

// The live TCP connection to the cube server. Replaced wholesale on every
// (re)connect attempt -- code below always reads `cubeSocket`/`cubeConnected`
// fresh rather than closing over a stale reference, so it keeps working
// across reconnects.
let cubeSocket = null;
let cubeConnected = false;

// Every currently-open browser WebSocket. A Set instead of one-listener-
// per-connection (the previous design) so the cube socket's 'data' handler
// is registered exactly once per TCP connection, not once per browser tab --
// and so it's easy to stop broadcasting to a tab once it disconnects.
const browserSockets = new Set();

function broadcastStatus() {
  const message = JSON.stringify({ action: 'connectionStatus', connected: cubeConnected });
  for (const ws of browserSockets) {
    if (ws.readyState === ws.OPEN) {
      ws.send(message);
    }
  }
}

function connectToCube() {
  const socket = new net.Socket();
  cubeSocket = socket;

  socket.connect(CUBE_PORT, CUBE_HOST, () => {
    console.log(`Connected to cube server at ${CUBE_HOST}:${CUBE_PORT}`);
    cubeConnected = true;
    broadcastStatus();
  });

  socket.on('data', (data) => {
    for (const ws of browserSockets) {
      if (ws.readyState === ws.OPEN) {
        ws.send(data);
      }
    }
  });

  // Without this, an unhandled 'error' event on a net.Socket crashes the
  // whole Node process -- e.g. the cube server not being up yet, or a
  // dropped connection later, used to take cube-client down with it.
  socket.on('error', (err) => {
    console.error('Cube connection error:', err.message);
  });

  socket.on('close', () => {
    if (cubeConnected) {
      console.log('Lost connection to cube server, retrying...');
    }
    cubeConnected = false;
    broadcastStatus();
    setTimeout(connectToCube, RECONNECT_DELAY_MS);
  });
}

app.ws('/ws', (ws) => {
  browserSockets.add(ws);
  ws.send(JSON.stringify({ action: 'connectionStatus', connected: cubeConnected }));

  ws.on('message', (data) => {
    if (cubeSocket && cubeConnected) {
      cubeSocket.write(data);
    }
  });

  ws.on('close', () => {
    browserSockets.delete(ws);
  });
});

connectToCube();
app.listen(3000, () => console.log('Listening on port 3000!'));
