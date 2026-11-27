const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const { WebcastPushConnection } = require('tiktok-live-connector');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

let tiktokConnection = null;
let currentUsername = '';
const userComments = new Map();

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

io.on('connection', (socket) => {
  socket.on('connectTikTok', (username) => {
    currentUsername = username.replace('@', '');
    if (tiktokConnection) {
      tiktokConnection.disconnect();
    }
    tiktokConnection = new WebcastPushConnection(currentUsername);
    tiktokConnection.connect().then(() => {
      socket.emit('tiktokStatus', '✅ Đã kết nối phòng Live: @' + currentUsername);
    }).catch(() => {
      socket.emit('tiktokStatus', '❌ Lỗi: Kênh chưa bật Live hoặc sai ID');
    });

    tiktokConnection.on('chat', (data) => {
      userComments.set(data.uniqueId, data.comment);
      io.emit('chat', { uniqueId: data.uniqueId, nickname: data.nickname, comment: data.comment });
    });

    tiktokConnection.on('gift', (data) => {
      if (data.giftType === 1 && !data.repeatEnd) return;
      const totalCoins = data.diamondCount * data.repeatCount;
      const lastComment = userComments.get(data.uniqueId) || '';
      io.emit('gift', {
        uniqueId: data.uniqueId,
        nickname: data.nickname,
        profilePictureUrl: data.profilePictureUrl,
        diamondCount: totalCoins,
        lastComment: lastComment
      });
    });
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log('Server dang chay tai port ' + PORT);
});
