const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" }
});

// Şarkı Sözü Havuzu
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
        players: {}, // { socketId: { name, seatIndex, isReady, score, micActive } }
        gameState: { currentRound: 0, maxRounds: 12, isRunning: false, activeCatcher: null }
    }
};

io.on('connection', (socket) => {
    console.log(`Bir kullanıcı bağlandı: ${socket.id}`);

    // Odaya Katılma
    socket.on('join_room', (data) => {
        const { roomCode, playerName } = data;
        socket.join(roomCode);
        
        if (!rooms[roomCode]) {
            rooms[roomCode] = { 
                maxPlayers: 4, 
                players: {}, 
                gameState: { currentRound: 0, maxRounds: 12, isRunning: false, activeCatcher: null } 
            };
        }

        // Boş bir koltuk indeksi bul (0'dan maxPlayers'a kadar)
        let assignedSeat = -1;
        for (let i = 0; i < rooms[roomCode].maxPlayers; i++) {
            let seatOccupied = Object.values(rooms[roomCode].players).some(p => p.seatIndex === i);
            if (!seatOccupied) {
                assignedSeat = i;
                break;
            }
        }

        if (assignedSeat === -1) {
            socket.emit('room_full');
            return;
        }

        // Oyuncuyu kaydet
        rooms[roomCode].players[socket.id] = {
            id: socket.id,
            name: playerName,
            seatIndex: assignedSeat,
            isReady: false,
            score: 0,
            micActive: true // Lobi aşamasında mikrofonlar açık (sohbet modu)
        };

        io.to(roomCode).emit('room_state', formatRoomData(rooms[roomCode]));
    });

    // Oyuncu Hazır Durumu Değiştirme
    socket.on('player_ready', (data) => {
        const { roomCode, isReady } = data;
        if (rooms[roomCode] && rooms[roomCode].players[socket.id]) {
            rooms[roomCode].players[socket.id].isReady = isReady;
            io.to(roomCode).emit('room_state', formatRoomData(rooms[roomCode]));

            // Herkes hazır mı kontrol et ve oyun başlatılabilir mi bak
            checkAndStartGame(roomCode);
        }
    });

    // Oyuncu Sayısı Değiştirme
    socket.on('set_max_players', (data) => {
        const { roomCode, maxPlayers } = data;
        if (rooms[roomCode]) {
            rooms[roomCode].maxPlayers = parseInt(maxPlayers);
            io.to(roomCode).emit('room_state', formatRoomData(rooms[roomCode]));
        }
    });

    // Şarkıyı Yakala Butonu (Hız Butonu)
    socket.on('catch_mic', (data) => {
        const { roomCode } = data;
        let room = rooms[roomCode];
        
        // Eğer oyun başladıysa ve henüz kimse butona basmadıysa
        if (room && room.gameState.isRunning && room.gameState.activeCatcher === null) {
            room.gameState.activeCatcher = socket.id;
            let player = room.players[socket.id];
            
            if (player) {
                player.score += 10; // Doğru bilen puansal artış
                io.to(roomCode).emit('player_caught_mic', { 
                    playerName: player.name, 
                    seatIndex: player.seatIndex 
                });
            }
        }
    });

    // Bağlantı Koptuğunda veya Çıkıldığında
    socket.on('disconnect', () => {
        for (let roomCode in rooms) {
            if (rooms[roomCode].players[socket.id]) {
                delete rooms[roomCode].players[socket.id];
                io.to(roomCode).emit('room_state', formatRoomData(rooms[roomCode]));
            }
        }
        console.log(`Kullanıcı ayrıldı: ${socket.id}`);
    });
});

// Oyuncuların listesini dizi (array) formatına çevirip frontend'e gönderen yardımcı fonksiyon
function formatRoomData(room) {
    let playerList = [];
    for (let id in room.players) {
        playerList.push(room.players[id]);
    }
    return {
        maxPlayers: room.maxPlayers,
        players: playerList,
        gameState: room.gameState
    };
}

// Tüm oyuncular hazır olduğunda otomatik oyunu başlatır
function checkAndStartGame(roomCode) {
    let room = rooms[roomCode];
    if (!room || room.gameState.isRunning) return;

    let playersArray = Object.values(room.players);
    if (playersArray.length > 0 && playersArray.every(p => p.isReady)) {
        room.gameState.isRunning = true;
        io.to(roomCode).emit('game_started_mode');
        
        // 12 turluk döngüyü başlat
        startNextRound(roomCode);
    }
}

// Turları sırayla yöneten ana döngü
function startNextRound(roomCode) {
    let room = rooms[roomCode];
    if (!room) return;

    room.gameState.currentRound++;
    room.gameState.activeCatcher = null;

    if (room.gameState.currentRound > room.gameState.maxRounds) {
        // OYUN BİTTİ - En yüksek puanlıyı bul
        let players = Object.values(room.players);
        let winner = players.reduce((prev, current) => (prev.score > current.score) ? prev : current, players[0]);
        
        io.to(roomCode).emit('game_over', winner || { name: "Kimse" });
        room.gameState.isRunning = false;
        return;
    }

    // Yeni tur sinyali gönder (5 saniye hazırlık)
    io.to(roomCode).emit('new_round', { round: room.gameState.currentRound });

    // 5 saniye sonra şarkı sözlerini ekrana fırlat
    setTimeout(() => {
        if (!rooms[roomCode]) return;
        const randomSong = internetSongPool[Math.floor(Math.random() * internetSongPool.length)];
        io.to(roomCode).emit('show_lyrics', randomSong);

        // Oyuncuya şarkı söylemesi için 10 saniye ver, sonra sonraki tura geç
        setTimeout(() => {
            if (rooms[roomCode]) {
                startNextRound(roomCode);
            }
        }, 10000); // 10 saniye şarkı söyleme süresi

    }, 5000); // 5 saniye bekleme süresi
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Sunucu ${PORT} portunda çalışıyor...`);
});
