const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  global.activeRooms = global.activeRooms || [];

  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    
    if (parsedUrl.pathname === '/api/active-servers') {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(global.activeRooms));
      return;
    }

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
      // We no longer delete the room immediately because navigating to /play causes a disconnect
    });

    socket.on('create_room', (roomData) => {
      // Si el usuario ya tiene una sala creada, bórrala primero
      if (roomData.hostUser) {
        global.activeRooms = global.activeRooms.filter(r => r.hostUser !== roomData.hostUser);
      }

      const newRoom = {
        id: roomData.id || Math.random().toString(36).substring(7),
        hostId: socket.id, // Will be obsolete after redirect, but fine for now
        hostUser: roomData.hostUser || 'Player',
        name: roomData.name || 'Custom Arena',
        map: roomData.map || 'Arena Clásica',
        mode: roomData.mode || 'Chaos Survival',
        players: 1,
        maxPlayers: roomData.maxPlayers || 12,
        ping: Math.floor(Math.random() * 40) + 10 + 'ms',
        isPrivate: roomData.isPrivate || false,
        img: roomData.map === 'Cyberpunk City' ? 'https://images.pexels.com/photos/315938/pexels-photo-315938.jpeg?auto=compress&cs=tinysrgb&w=200' : 'https://images.pexels.com/photos/1633525/pexels-photo-1633525.jpeg?auto=compress&cs=tinysrgb&w=200',
        createdAt: Date.now()
      };
      
      // Limpiar salas viejas (más de 2 horas) para evitar memory leaks
      global.activeRooms = global.activeRooms.filter(r => Date.now() - (r.createdAt || 0) < 7200000);
      
      global.activeRooms.push(newRoom);
      io.emit('rooms_updated', global.activeRooms);
    });
  });

  const PORT = process.env.PORT || 3000;
  
  server.listen(PORT, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://localhost:${PORT}`);
    console.log(`> Socket.IO server running on port ${PORT}`);
  });
});
