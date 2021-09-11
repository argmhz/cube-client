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
      console.log("send to client:");
      console.dir(data);
      ws.send(data);

    });

    ws.on('message', function(data) {
      console.log("send to cube:");
      console.dir(data);
      client.write(data);

    });

  });

});

app.listen(3000, () => console.log('Example app listening on port 3000!'));


//

// client.connect(1234, 'localhost', function() {
// 	console.log('Connected');
//
// 	client.write(JSON.stringify({
// 		action: "options",
// 		animation: "Dna"
// 	}));
// });
//
// client.on('data', function(data) {
// 	console.log('Received: ' + data);
// 	// client.destroy(); // kill client after server's response
// });
//
// client.on('close', function() {
// 	console.log('Connection closed');
// });
