const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const axios = require('axios');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 3000;

// Oda verilerini tutan obje
const rooms = {};

// Express Statik ve Test Sayfası
app.get('/', (req, res) => {
    res.send('Radyo Klan - Mikrofon Sende Karaoke Sunucusu Aktif!');
});

// Render Uyanık Tutma (Self-Ping)
setInterval(() => {
    axios.get('https://' + process.env.RENDER_EXTERNAL_HOSTNAME)
        .then(() => console.log('Self-ping başarılı.'))
        .catch(err => console.log('Self-ping hatası veya yerel ortam.'));
}, 14 * 60 * 1000); // 14 dakikada bir çalışır

// Şarkı Sözü Çekme Fonksiyonu
async function fetchAndSendNextSong(roomCode) {
    const room = rooms[roomCode];
    if (!room) return;

    try {
        // Örnek şarkı havuzu / API çağrısı
        const songData = {
            title: "Tarkan - Geççek",
            lyrics: "Geççek geççek çok az kaldı geççek...",
            duration: 30
        };

        room.currentSong = songData;
        io.to(roomCode).emit('new_song', songData);
        console.log(`Oda ${roomCode} için yeni şarkı gönderildi: ${songData.title}`);
    } catch (error) {
        console.error("Şarkı çekme hatası:", error);
    }
}

// Socket.IO Bağlantı Yönetimi
io.on('connection', (socket) => {
    console.log('Yeni bir kullanıcı bağlandı:', socket.id);

    // Odaya Katılma
    socket.on('join_room', (data) => {
        const { roomCode, playerName, seatIndex } = data;
        socket.join(roomCode);

        if (!rooms[roomCode]) {
            rooms[roomCode] = {
                players: {},
                maxPlayers: 6,
                isGameStarted: false,
                currentSong: null
            };
        }

        rooms[roomCode].players[seatIndex] = {
            id: socket.id,
            name: playerName
        };

        io.to(roomCode).emit('room_state', rooms[roomCode]);
        console.log(`${playerName} (${socket.id}) ${roomCode} odasındaki ${seatIndex}. koltuğa oturdu.`);
    });

    // Oyuncu Sayısını Ayarla
    socket.on('set_max_players', (data) => {
        const { roomCode, maxPlayers } = data;
        if (rooms[roomCode]) {
            rooms[roomCode].maxPlayers = maxPlayers;
            io.to(roomCode).emit('max_players_updated', { maxPlayers: maxPlayers });
            console.log(`Oda ${roomCode} maksimum oyuncu sayısı: ${maxPlayers}`);
        }
    });

    // Oyunu Manuel Başlat
    socket.on('start_game_manual', (data) => {
        const { roomCode } = data;
        const room = rooms[roomCode];
        if (room && !room.isGameStarted) {
            room.isGameStarted = true;
            io.to(roomCode).emit('game_starting', { countdown: 5 });
            console.log(`Oda ${roomCode} için oyun başlatılıyor...`);

            setTimeout(() => {
                fetchAndSendNextSong(roomCode);
            }, 5000);
        }
    });

    // Odadan Çıkış İşlemi
    socket.on('leave_room', (data) => {
        const { roomCode, seatIndex } = data;
        if (rooms[roomCode]) {
            if (rooms[roomCode].players && rooms[roomCode].players[seatIndex]) {
                delete rooms[roomCode].players[seatIndex];
            }
            socket.leave(roomCode);
            io.to(roomCode).emit('player_left', { seatIndex: seatIndex, socketId: socket.id });
            console.log(`Kullanıcı ${socket.id} ${roomCode} odasından ayrıldı.`);
        }
    });

    // Bağlantı Kopması
    socket.on('disconnect', () => {
        console.log('Kullanıcı ayrıldı:', socket.id);
        // İsteğe bağlı bağlantı kopunca koltuk boşaltma mantığı buraya gelir
    });
});

server.listen(PORT, () => {
    console.log(`Sunucu ${PORT} portunda çalışıyor.`);
});
