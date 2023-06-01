const express = require('express');
const http = require('http');
const socketIO = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// 存儲已配對的用戶
let pairedUsers = {};

io.on('connection', (socket) => {
  // console.log(`${socket.id} user connected`);

  // 開始配對
  socket.on('startPairing', () => {
    // 檢查是否有用戶等待配對
    const waitingUser = Object.keys(pairedUsers).find(
      (userId) => !pairedUsers[userId]
    );

    if (waitingUser) {
      // 找到等待配對的用戶進行配對
      pairedUsers[waitingUser] = socket.id;
      pairedUsers[socket.id] = waitingUser;
      socket.join(waitingUser);
      io.to(waitingUser).emit('startChat', socket.id);
      socket.emit('startChat', waitingUser);
    } else {
      // 沒有等待配對的用戶，將自己加入等待配對列表
      pairedUsers[socket.id] = null;
    }
  });

  // 解除配對
  socket.on('unpair', () => {
    const pairedUser = pairedUsers[socket.id];

    io.to(pairedUser).emit('otherUserLeft');
    socket.leave(pairedUser);
    delete pairedUsers[pairedUser];
  });

  // 聊天訊息
  socket.on('sendMessage', (message) => {
    const pairedUser = pairedUsers[socket.id];

    if (pairedUser) {
      io.to(pairedUser).emit('receiveMessage', message);
    }
  });

  socket.on('disconnect', () => {
    const pairedUser = pairedUsers[socket.id];

    io.to(pairedUser).emit('otherUserLeft');
    socket.leave(pairedUser);
    delete pairedUsers[pairedUser];

    // console.log(`${socket.id} user disconnected`);
  });
});

server.listen(5000, () => {
  console.log('Server is listening on port 5000');
});
