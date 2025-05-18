const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.static(path.join(__dirname, 'public')));

let clients = [];

wss.on('connection', (ws) => {
	clients.push(ws);
	console.log('Client Connected');

	ws.on('message', (msg) => {
		clients.forEach((client) => {
			if (client !== ws && client.readyState === WebSocket.OPEN) {
				client.send(msg);
			}
		});
	});

	ws.on('close', () => {
		clients = clients.filter(c => c !== ws);
	});
});

const PORT = 8080;

server.listen(PORT, () => {
	console.log(`Server running at http://localhost:${PORT}`);
});
