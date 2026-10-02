const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

// Aktif odalar
const rooms = {};

// İnternetten canlı şarkı sözü çekmek için örnek havuz veya API entegrasyon yapısı
const songDatabase = [
    { title: "Şımarık", artist: "Tarkan", lyrics: "Yılani deliğinden çıkaran\nkaderim puskullu belam\nyakalarsam\nmuck muck" },
    { title: "Sana Kalbim Geçti", artist: "Yıldız Tilbe", lyrics: "Sana kalbim geçti aman\nGeri versen almam almam\nSeni sevdim seveli\nBaşım beladan çıkmıyor" },
    { title: "Mavi", artist: "Barış Akarsu", lyrics: "Mavi mavi gözlerinde hep sitem mi var\nyoksa insan sevdiğine böyle mi bakar\ngözlerinde kayboldum\nben sana tutuldum" }
];

io.on('connection', (socket) => {
    console.log('Bir kullanıcı bağlandı:', socket.id);

    // Odaya Katılma ve Koltuk Seçimi (2, 4, 6 kişilik)
    socket.on('joinRoom', ({ roomId, maxSeats }) => {
        socket.join(roomId);

        if (!rooms[roomId]) {
            rooms[roomId] = {
                maxSeats: parseInt(maxSeats),
                players: [],
                currentSongIndex: 0,
                gameState: 'waiting', // waiting, countdown, playing, singing
                catcher: null,
                timer: null
            };
        }

        const room = rooms[roomId];
        
        // Oyuncu daha önce eklenmediyse ekle
        if (!room.players.find(p => p.id === socket.id)) {
            room.players.push({ id: socket.id, name: `Oyuncu_${socket.id.slice(0,4)}`, score: 0 });
        }

        io.to(roomId).emit('updatePlayers', room.players);
    });

    // Manuel Oyunu Başlat
    socket.on('startGame', ({ roomId }) => {
        const room = rooms[roomId];
        if (!room || room.gameState !== 'waiting') return;

        room.gameState = 'countdown';
        room.currentSongIndex = 0;

        // 1. Aşama: 3 saniye geri sayım + Başlangıç Zili (Zirrrrr)
        io.to(roomId).emit('playStartSound', { sound: 'zirrr', message: 'Oyun başlıyor!' });

        setTimeout(() => {
            startNextRound(roomId);
        }, 3000);
    });

    function startNextRound(roomId) {
        const room = rooms[roomId];
        if (!room) return;

        if (room.currentSongIndex >= 12) {
            // Oyun Sonu
            room.gameState = 'ended';
            const winner = room.players[Math.floor(Math.random() * room.players.length)];
            io.to(roomId).emit('gameOver', { winner: winner ? winner.name : 'Berabere' });
            return;
        }

        room.gameState = 'singing_wait';
        room.catcher = null;

        // Herkesin mikrofonu kapanır
        io.to(roomId).emit('muteAllMics');

        // Rastgele bir şarkı seç (İnternetten API ile de çekilebilir)
        const currentSong = songDatabase[Math.floor(Math.random() * songDatabase.length)];
        
        io.to(roomId).emit('newSongData', {
            songIndex: room.currentSongIndex + 1,
            title: currentSong.title,
            artist: currentSong.artist,
            lyrics: currentSong.lyrics
        });

        // 2. Aşama: 5 saniyelik ikinci geri sayım (Şarkı sözü ekranda bekler, mikrofonlar kapalı)
        setTimeout(() => {
            // 5 saniye bittiğinde zil çalar ve Yakala butonu aktifleşir
            io.to(roomId).emit('enableCatchPhase', { sound: 'zil' });
            room.gameState = 'catching';
        }, 5000);
    }

    // Yakala butonuna basıldığında
    socket.on('catchSong', ({ roomId }) => {
        const room = rooms[roomId];
        if (!room || room.gameState !== 'catching' || room.catcher) return;

        room.catcher = socket.id;
        room.gameState = 'singing';

        // Yakalayanın mikrofonu açılır, diğerleri kapanır
        io.to(roomId).emit('playerCaught', { catcherId: socket.id });

        // 10 saniye boyunca okuma süresi
        room.timer = setTimeout(() => {
            room.currentSongIndex++;
            startNextRound(roomId);
        }, 10000);
    });

    socket.on('disconnect', () => {
        console.log('Kullanıcı ayrıldı:', socket.id);
        // Oda temizliği yapılabilir
    });
});

server.listen(3000, () => {
    console.log('Sunucu 3000 portunda çalışıyor...');
});
