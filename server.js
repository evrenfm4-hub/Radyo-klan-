const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" }
});

// Şarkı Sözü Havuzu (Server tarafında tutulur)
const internetSongPool = [
    { title: "Mavi", artist: "Barış Akarsu", lyrics: ["mavi mavi gözlerimde hep sitem mi var", "yoksa insan sevdiğine böyle mi bakar", "gözlerinde aşkın ateşi sönüyor", "kalbim durmuş sanki sana dönüyor"] },
    { title: "Şımarık", artist: "Tarkan", lyrics: ["yılani deliginden cikaran kaderim", "puskullu belam yakalarsam", "muck muck öp beni boynumdan", "kollarında çürüyeyim yanıyorum"] },
    { title: "Sana Kalbim Geçti", artist: "Yıldız Tilbe", lyrics: ["sana kalbim geçti aman", "geri versen almam almam", "sensiz bu dünya zindan", "böyle sevmek olmaz olsun"] },
    { title: "Unutamam Seni", artist: "Tarkan", lyrics: ["unutamam seni unutamam", "ateşlerde yansam da", "kül olsam da inan", "seni unutup da başkasını sevemem"] },
    { title: "Arada Sırada", artist: "Ajda Pekkan", lyrics: ["arada sırada da olsa", "beni hatırla yeter", "uzaklarda olsan bile", "bu hasret böyle biter"] },
    { title: "Mor Şalvar", artist: "Hande Yener", lyrics: ["mor şalvar giyerim oyna", "gönlümü eylerim oyna", "senin gibi yari ben", "bulamam dünyada oyna"] },
    { title: "Aşkın Mapushanesi", artist: "Sezen Aksu", lyrics: ["vurulduğum yerde kaldım", "aşkın mapushanesi", "gözlerinin rengine aldandım", "söndü içimin neşesi"] },
    { title: "Dudu Dudu", artist: "Tarkan", lyrics: ["dudu dudu dilli bebek", "canımın içi meleksin", "sen bu gidişle kafayı", "bana yedireceksin"] },
    { title: "Hadi Bakalım", artist: "Sezen Aksu", lyrics: ["hadi bakalım kolay gelsin", "aslanım benim yolunuz açık", "giden gider kalan akar", "devran döner"] },
    { title: "Yalnız Kuş", artist: "Sertab Erener", lyrics: ["uçtu uçtu yalnız kuş", "dağları aştı gitti", "bana kalan eski bir düş", "bu hikaye burada bitti"] },
    { title: "Beni Unutma", artist: "Emre Aydın", lyrics: ["gitmeme izin ver", "arkana bakmadan", "beni unutma sakın", "gözyaşım kurumadan"] },
    { title: "Sarı Çiçek", artist: "Barış Manço", lyrics: ["söyle sarı çiçek sarı çiçek", "cennetin yolu nirededir", "ağam bizim eldedir", "bizim ilktedir"] }
];

let rooms = {
    "TRK6818": {
        maxPlayers: 4,
        players: {},
        gameState: { currentRound: 1, maxRounds: 12, isRunning: false }
    }
};

io.on('connection', (socket) => {
    console.log(`Bir kullanıcı bağlandı: ${socket.id}`);

    // Odaya Katılma
    socket.on('join_room', (data) => {
        const { roomCode, playerName, seatIndex } = data;
        socket.join(roomCode);
        
        if (!rooms[roomCode]) {
            rooms[roomCode] = { maxPlayers: 4, players: {}, gameState: { currentRound: 1, maxRounds: 12, isRunning: false } };
        }

        rooms[roomCode].players[seatIndex] = { id: socket.id, name: playerName };
        io.to(roomCode).emit('room_state', rooms[roomCode]);
    });

    // Oyuncu Sayısı Değiştirme (2, 4, 6)
    socket.on('set_max_players', (data) => {
        const { roomCode, maxPlayers } = data;
        if (rooms[roomCode]) {
            rooms[roomCode].maxPlayers = maxPlayers;
            io.to(roomCode).emit('max_players_updated', { maxPlayers });
            io.to(roomCode).emit('room_state', rooms[roomCode]);
        }
    });

    // Oyunu Manuel Başlat
    socket.on('start_game_manual', (data) => {
        const { roomCode } = data;
        if (rooms[roomCode]) {
            rooms[roomCode].gameState.isRunning = true;
            rooms[roomCode].gameState.currentRound = 1;
            io.to(roomCode).emit('game_starting');
            
            // İlk şarkıyı gönder
            sendRandomSong(roomCode);
        }
    });

    // Şarkıyı Yakala Butonu
    socket.on('catch_mic', (data) => {
        const { roomCode, seatIndex } = data;
        io.to(roomCode).emit('player_caught', { seatIndex });
    });

    // Odadan Çıkma / Ayrılma
    socket.on('leave_room', (data) => {
        const { roomCode, seatIndex } = data;
        if (rooms[roomCode] && rooms[roomCode].players[seatIndex]) {
            delete rooms[roomCode].players[seatIndex];
            io.to(roomCode).emit('player_left', { seatIndex });
        }
        socket.leave(roomCode);
    });

    socket.on('disconnect', () => {
        console.log(`Kullanıcı ayrıldı: ${socket.id}`);
    });
});

function sendRandomSong(roomCode) {
    const randomSong = internetSongPool[Math.floor(Math.random() * internetSongPool.length)];
    io.to(roomCode).emit('new_song', randomSong);
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Sunucu ${PORT} portunda çalışıyor...`);
});
