const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  io.on('connection', (socket) => {
    console.log(`[SOCKET] User connected: ${socket.id}`);

    // Unirse al canal global del chat
    socket.join('global-chat');

    socket.on('send_message', (data) => {
      // Emitir el mensaje a todos en el chat global
      io.to('global-chat').emit('receive_message', {
        id: Date.now().toString(),
        sender: data.sender,
        content: data.content,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
    });

    socket.on('disconnect', () => {
      console.log(`[SOCKET] User disconnected: ${socket.id}`);
    });
  });

  const PORT = process.env.PORT || 3000;
  
  server.listen(PORT, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://localhost:${PORT}`);
    console.log(`> Socket.IO server running on port ${PORT}`);
  });
});
