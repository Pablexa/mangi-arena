const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  global.activeRooms = global.activeRooms || [];
  global.onlineUsers = global.onlineUsers || {}; // socketId -> username
  global.usersData = global.usersData || {}; // username -> { friends, pending }

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

    socket.on('user_online', (username) => {
      if (!username) return;
      global.onlineUsers[socket.id] = username;
      if (!global.usersData[username]) {
        global.usersData[username] = { friends: [], pending: [] };
      }
      
      socket.emit('friend_data_sync', global.usersData[username]);
      io.emit('online_users_updated', Object.values(global.onlineUsers));
    });

    socket.on('send_friend_request', (data) => {
      const { from, to } = data;
      if (global.usersData[to] && !global.usersData[to].pending.includes(from) && !global.usersData[to].friends.includes(from)) {
        global.usersData[to].pending.push(from);
        
        const targetSocketId = Object.keys(global.onlineUsers).find(key => global.onlineUsers[key] === to);
        if (targetSocketId) {
          io.to(targetSocketId).emit('friend_data_sync', global.usersData[to]);
        }
      }
    });

    socket.on('accept_friend_request', (data) => {
      const { from, to } = data;
      if (global.usersData[to] && global.usersData[from]) {
         global.usersData[to].pending = global.usersData[to].pending.filter(u => u !== from);
         
         if (!global.usersData[to].friends.includes(from)) global.usersData[to].friends.push(from);
         if (!global.usersData[from].friends.includes(to)) global.usersData[from].friends.push(to);

         const toSocketId = Object.keys(global.onlineUsers).find(key => global.onlineUsers[key] === to);
         const fromSocketId = Object.keys(global.onlineUsers).find(key => global.onlineUsers[key] === from);
         
         if (toSocketId) io.to(toSocketId).emit('friend_data_sync', global.usersData[to]);
         if (fromSocketId) io.to(fromSocketId).emit('friend_data_sync', global.usersData[from]);
      }
    });

    socket.on('decline_friend_request', (data) => {
      const { from, to } = data;
      if (global.usersData[to]) {
         global.usersData[to].pending = global.usersData[to].pending.filter(u => u !== from);
         const toSocketId = Object.keys(global.onlineUsers).find(key => global.onlineUsers[key] === to);
         if (toSocketId) io.to(toSocketId).emit('friend_data_sync', global.usersData[to]);
      }
    });

    socket.on('disconnecting', () => {
      // Remove from any rooms
      for (const room of socket.rooms) {
        if (room !== socket.id && room !== 'global-chat') {
           if (global.roomPlayers && global.roomPlayers[room]) {
              delete global.roomPlayers[room][socket.id];
              const r = global.activeRooms.find(ar => ar.id === room);
              if (r) r.players = Object.keys(global.roomPlayers[room]).length;
           }
           io.to(room).emit('player_left', socket.id);
        }
      }
    });

    socket.on('disconnect', () => {
      console.log(`[SOCKET] User disconnected: ${socket.id}`);
      delete global.onlineUsers[socket.id];
      io.emit('online_users_updated', Object.values(global.onlineUsers));
    });

    socket.on('join_game', (serverId, playerData) => {
      socket.join(serverId);
      if (!global.roomPlayers) global.roomPlayers = {};
      if (!global.roomPlayers[serverId]) global.roomPlayers[serverId] = {};
      
      global.roomPlayers[serverId][socket.id] = { id: socket.id, ...playerData };
      
      // Send existing players to the new player
      socket.emit('existing_players', Object.values(global.roomPlayers[serverId]));
      
      // Tell everyone else
      socket.to(serverId).emit('player_joined', { id: socket.id, ...playerData });
      
      // Update room count
      const room = global.activeRooms.find(r => r.id === serverId);
      if (room) room.players = Object.keys(global.roomPlayers[serverId]).length;
    });

    socket.on('player_update', (serverId, data) => {
      socket.to(serverId).emit('player_updated', { id: socket.id, ...data });
    });

    socket.on('player_shoot', (serverId, data) => {
      socket.to(serverId).emit('player_shot', { id: socket.id, ...data });
    });

    socket.on('player_hit', (serverId, data) => {
      socket.to(serverId).emit('player_hit', { id: socket.id, ...data });
    });

    socket.on('player_killed', (serverId, data) => {
      socket.to(serverId).emit('player_killed', { id: socket.id, ...data });
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
    socket.on('change_map', (serverId, newMap) => {
      const room = global.activeRooms.find(r => r.id === serverId);
      if (room && (room.hostUser === socket.handshake.auth?.username || room)) {
        room.map = newMap;
        io.to(serverId).emit('map_changed', newMap);
      }
    });

    socket.on('admin_action', (data) => {
      // Broadcast to all clients to check if they are the target
      io.emit('admin_command_received', data);
    });

    socket.on('get_admin_data', () => {
      socket.emit('admin_data', {
        rooms: global.activeRooms.map(r => ({ id: r.id, map: r.map, players: r.players })),
        players: Object.values(global.roomPlayers || {}).flatMap(room => Object.values(room).map(p => p.username))
      });
    });

  });

  // Global Room Sync Loop (Time & State)
  setInterval(() => {
    global.activeRooms.forEach(room => {
      if (room.matchTime === undefined) room.matchTime = 180;
      if (room.players > 0) {
        if (room.matchTime > 0) room.matchTime--;
        else room.matchTime = 180; // Simple auto-restart for now
        io.to(room.id).emit('sync_state', { time: room.matchTime, map: room.map });
      }
    });
  }, 1000);

  const PORT = process.env.PORT || 3000;
  
  server.listen(PORT, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://localhost:${PORT}`);
    console.log(`> Socket.IO server running on port ${PORT}`);
  });
});
