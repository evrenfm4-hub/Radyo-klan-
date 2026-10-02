const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

const rooms = {};

// İnternetten veya havuzdan çekilen 4 satırlık nakarat sözleri
const songDatabase = [
    { title: "mavi", artist: "Barış Akarsu", lyrics: "mavi mavi gözlerinde hep sitem mi var\nyoksa insan sevdiğine böyle mi bakar" },
    { title: "şımarık", artist: "Tarkan", lyrics: "yilani deliginden çikaran\nkaderim puskullu belam\nyakalarsam\nmuck muck" },
    { title: "Sana Kalbim Geçti", artist: "Yıldız Tilbe", lyrics: "Sana kalbim geçti aman\nGeri versen almam almam\nSeni sevdim seveli\nBaşım beladan çıkmıyor" }
];

io.on('connection', (socket) => {
    socket.on('joinRoom', ({ roomId, maxSeats, playerName }) => {
        socket.join(roomId);

        if (!rooms[roomId]) {
            rooms[roomId] = {
                maxSeats: parseInt(maxSeats),
                players: {},
                currentSongIndex: 0,
                gameState: 'waiting',
                catcher: null,
                timer: null
            };
        }

        const room = rooms[roomId];
        let assignedSeat = null;

        for (let i = 1; i <= room.maxSeats; i++) {
            if (!room.players[i]) {
                assignedSeat = i;
                break;
            }
        }

        if (!assignedSeat) {
            socket.emit('errorMsg', 'Oda dolu!');
            return;
        }

        room.players[assignedSeat] = { id: socket.id, name: playerName || `Oyuncu_${socket.id.slice(0,4)}` };

        socket.emit('assignedSeat', { seatIndex: assignedSeat });
        io.to(roomId).emit('updateRoomState', room);
    });

    socket.on('startGame', ({ roomId }) => {
        const room = rooms[roomId];
        if (!room) return;

        room.gameState = 'countdown';
        room.currentSongIndex = 0;

        // 1. Aşama: 3 saniye geri sayım + Zirrrr sesi
        io.to(roomId).emit('playBell', { type: 'zirrr', message: 'Oyun başlıyor!' });

        setTimeout(() => {
            startNextRound(roomId);
        }, 3000);
    });

    function startNextRound(roomId) {
        const room = rooms[roomId];
        if (!room) return;

        if (room.currentSongIndex >= 12) {
            room.gameState = 'ended';
            const playerKeys = Object.keys(room.players);
            const winnerKey = playerKeys[Math.floor(Math.random() * playerKeys.length)];
            const winnerName = room.players[winnerKey] ? room.players[winnerKey].name : 'Berabere';
            io.to(roomId).emit('gameOver', { winner: winnerName });
            return;
        }

        room.gameState = 'singing_wait';
        room.catcher = null;

        // Herkesin mikrofonu otomatik kapanır
        io.to(roomId).emit('muteAllMics');

        const currentSong = songDatabase[Math.floor(Math.random() * songDatabase.length)];
        
        io.to(roomId).emit('newSongData', {
            songIndex: room.currentSongIndex + 1,
            title: currentSong.title,
            artist: currentSong.artist,
            lyrics: currentSong.lyrics
        });

        // 2. Aşama: 5 saniyelik ikinci geri sayım (Sözler ekranda bekler, mikrofonlar kapalı)
        setTimeout(() => {
            io.to(roomId).emit('enableCatch', { type: 'zil' });
            room.gameState = 'catching';
        }, 5000);
    }

    socket.on('catchSong', ({ roomId, seatIndex }) => {
        const room = rooms[roomId];
        if (!room || room.gameState !== 'catching' || room.catcher) return;

        room.catcher = seatIndex;
        room.gameState = 'singing';

        io.to(roomId).emit('playerCaught', { catcherSeat: seatIndex, playerName: room.players[seatIndex].name });

        // 10 saniye okuma süresi
        room.timer = setTimeout(() => {
            room.currentSongIndex++;
            startNextRound(roomId);
        }, 10000);
    });

    socket.on('disconnect', () => {
        for (let roomId in rooms) {
            let room = rooms[roomId];
            for (let seat in room.players) {
                if (room.players[seat].id === socket.id) {
                    delete room.players[seat];
                    io.to(roomId).emit('updateRoomState', room);
                }
            }
        }
    });
});

server.listen(3000, () => console.log('Sunucu 3000 portunda aktif.'));
