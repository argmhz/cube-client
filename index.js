const express = require('express');
const app = express();
const websocket = require('express-ws')(app);
const net = require('net');
const client = new net.Socket();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('./www'));

client.connect(1234, 'localhost', function() {

  app.ws('/ws', function(ws, req) {

    client.on('data', function(data) {
      ws.send(data);
    });

    ws.on('message', function(data) {
      client.write(data);
    });
  });

});

app.listen(3000, () => console.log('Listening on port 3000!'));
