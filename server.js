const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const axios = require('axios');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

const PORT = process.env.PORT || 3000;
const rooms = {};

app.get('/', (req, res) => {
    res.send('Radyo Klan - Mikrofon Sende Karaoke Sunucusu Aktif!');
});

// Render Uyanık Tutma
setInterval(() => {
    if (process.env.RENDER_EXTERNAL_HOSTNAME) {
        axios.get('https://' + process.env.RENDER_EXTERNAL_HOSTNAME).catch(() => {});
    }
}, 14 * 60 * 1000);

io.on('connection', (socket) => {
    console.log('Bağlandı:', socket.id);

    // Odaya Katılma ve Otomatik Koltuk Atama
    socket.on('join_room', (data) => {
        const { roomCode, playerName } = data;
        socket.join(roomCode);

        if (!rooms[roomCode]) {
            rooms[roomCode] = {
                players: {},
                maxPlayers: 6,
                isGameStarted: false,
                currentSong: null
            };
        }

        const room = rooms[roomCode];

        // Boş olan ilk koltuğu bul ve oyuncuyu yerleştir
        let assignedSeat = null;
        for (let i = 1; i <= room.maxPlayers; i++) {
            if (!room.players[i]) {
                assignedSeat = i;
                break;
            }
        }

        if (!assignedSeat) {
            socket.emit('error_msg', 'Oda dolu!');
            return;
        }

        room.players[assignedSeat] = {
            id: socket.id,
            name: playerName
        };

        socket.emit('assigned_seat', { seatIndex: assignedSeat });
        io.to(roomCode).emit('room_state', room);
        console.log(`${playerName} (${socket.id}) ${roomCode} odası ${assignedSeat}. koltuğa oturdu.`);
    });

    // Oyuncu Sayısını Güncelleme
    socket.on('set_max_players', (data) => {
        const { roomCode, maxPlayers } = data;
        if (rooms[roomCode]) {
            rooms[roomCode].maxPlayers = parseInt(maxPlayers);
            io.to(roomCode).emit('room_state', rooms[roomCode]);
        }
    });

    // Oyunu Manuel Başlat ve Geri Sayım Gönder
    socket.on('start_game_manual', (data) => {
        const { roomCode } = data;
        const room = rooms[roomCode];
        if (room) {
            room.isGameStarted = true;
            let countdown = 10; // 10 saniye geri sayım

            io.to(roomCode).emit('game_starting', { countdown });
            console.log(`Oda ${roomCode} için geri sayım başladı.`);

            const timer = setInterval(() => {
                countdown--;
                if (countdown > 0) {
                    io.to(roomCode).emit('countdown_tick', { countdown });
                } else {
                    clearInterval(timer);
                    // Şarkıyı başlat
                    room.currentSong = {
                        title: "Tarkan - Geççek",
                        lyrics: "Geççek geççek çok az kaldı geççek...",
                        artist: "Tarkan"
                    };
                    io.to(roomCode).emit('round_start', { song: room.currentSong });
                }
            }, 1000);
        }
    });

    // Odadan Çıkış
    socket.on('leave_room', (data) => {
        const { roomCode } = data;
        const room = rooms[roomCode];
        if (room) {
            for (let seat in room.players) {
                if (room.players[seat].id === socket.id) {
                    delete room.players[seat];
                    break;
                }
            }
            socket.leave(roomCode);
            io.to(roomCode).emit('room_state', room);
        }
    });

    // WebRTC Sinyalleşmesi
    socket.on('offer', (data) => {
        socket.to(data.roomCode).emit('offer', { offer: data.offer, sender: socket.id });
    });
    socket.on('answer', (data) => {
        socket.to(data.roomCode).emit('answer', { answer: data.answer, sender: socket.id });
    });
    socket.on('ice-candidate', (data) => {
        socket.to(data.roomCode).emit('ice-candidate', { candidate: data.candidate, sender: socket.id });
    });

    socket.on('disconnect', () => {
        for (let roomCode in rooms) {
            let room = rooms[roomCode];
            let changed = false;
            for (let seat in room.players) {
                if (room.players[seat].id === socket.id) {
                    delete room.players[seat];
                    changed = true;
                }
            }
            if (changed) {
                io.to(roomCode).emit('room_state', room);
            }
        }
        console.log('Kullanıcı çıktı:', socket.id);
    });
});

server.listen(PORT, () => console.log(`Sunucu ${PORT} portunda çalışıyor.`));
