const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(__dirname));

let waitingPlayer = null;

io.on('connection', (socket) => {
    console.log('Bir kullanıcı bağlandı:', socket.id);

    // Eşleşme veya oda bulma isteği
    socket.on('find-match', () => {
        if (waitingPlayer && waitingPlayer.id !== socket.id) {
            const room = 'room_' + socket.id;
            socket.join(room);
            waitingPlayer.join(room);

            io.to(room).emit('match-found', { roomId: room });
            waitingPlayer = null;
        } else {
            waitingPlayer = socket;
            socket.emit('waiting', 'Rakip aranıyor...');
        }
    });

    // Oda içi mesajlaşma sistemi
    socket.on('chat-message', (data) => {
        // data içinde { roomId, message, sender } gibi bilgiler gelebilir
        if (data && data.roomId) {
            io.to(data.roomId).emit('chat-message', data);
        } else {
            // Eğer oda belirtilmediyse genel yayınla veya odalara dağıt
            socket.broadcast.emit('chat-message', data);
        }
    });

    socket.on('disconnect', () => {
        if (waitingPlayer === socket) {
            waitingPlayer = null;
        }
        console.log('Kullanıcı ayrıldı:', socket.id);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Sunucu ${PORT} portunda çalışıyor.`);
});
