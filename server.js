const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" }
});

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

let rooms = {}; // { roomCode: { maxPlayers: 2, players: {}, gameState: {...} } }

io.on('connection', (socket) => {
    console.log(`Bir kullanıcı bağlandı: ${socket.id}`);

    // Oyuncu oda kapasitesi seçip katıldığında
    socket.on('join_matchmaking', (data) => {
        const { playerName, desiredMaxPlayers } = data;
        const maxP = parseInt(desiredMaxPlayers);

        // Uygun ve henüz dolmamış, oyunu başlamamış bir oda ara
        let targetRoomCode = null;
        for (let code in rooms) {
            let room = rooms[code];
            let currentPlayerCount = Object.keys(room.players).length;
            if (room.maxPlayers === maxP && !room.gameState.isRunning && currentPlayerCount < maxP) {
                targetRoomCode = code;
                break;
            }
        }

        // Eğer uygun oda yoksa, yeni oda aç
        if (!targetRoomCode) {
            targetRoomCode = 'ODA-' + Math.floor(1000 + Math.random() * 9000);
            rooms[targetRoomCode] = {
                maxPlayers: maxP,
                players: {},
                gameState: { currentRound: 0, maxRounds: 12, isRunning: false, activeCatcher: null }
            };
        }

        socket.join(targetRoomCode);

        // Koltuk indeksi ata
        let room = rooms[targetRoomCode];
        let assignedSeat = -1;
        for (let i = 0; i < maxP; i++) {
            let seatTaken = Object.values(room.players).some(p => p.seatIndex === i);
            if (!seatTaken) {
                assignedSeat = i;
                break;
            }
        }

        room.players[socket.id] = {
            id: socket.id,
            name: playerName,
            seatIndex: assignedSeat,
            isReady: false,
            score: 0,
            micActive: true
        };

        // Oyuncuya hangi odaya girdiğini ve oda kodunu bildir
        socket.emit('joined_room_success', { roomCode: targetRoomCode });
        io.to(targetRoomCode).emit('room_state', formatRoomData(room));
    });

    // Oyuncu Hazır Durumu
    socket.on('player_ready', (data) => {
        const { roomCode, isReady } = data;
        if (rooms[roomCode] && rooms[roomCode].players[socket.id]) {
            rooms[roomCode].players[socket.id].isReady = isReady;
            io.to(roomCode).emit('room_state', formatRoomData(rooms[roomCode]));
            checkAndStartGame(roomCode);
        }
    });

    // Şarkıyı Yakala
    socket.on('catch_mic', (data) => {
        const { roomCode } = data;
        let room = rooms[roomCode];
        if (room && room.gameState.isRunning && room.gameState.activeCatcher === null) {
            room.gameState.activeCatcher = socket.id;
            let player = room.players[socket.id];
            if (player) {
                player.score += 10;
                io.to(roomCode).emit('player_caught_mic', { 
                    playerName: player.name, 
                    seatIndex: player.seatIndex 
                });
            }
        }
    });

    socket.on('disconnect', () => {
        for (let roomCode in rooms) {
            if (rooms[roomCode].players[socket.id]) {
                delete rooms[roomCode].players[socket.id];
                io.to(roomCode).emit('room_state', formatRoomData(rooms[roomCode]));
                
                // Oda tamamen boşaldıysa bellekten temizle
                if (Object.keys(rooms[roomCode].players).length === 0) {
                    delete rooms[roomCode];
                }
            }
        }
        console.log(`Kullanıcı ayrıldı: ${socket.id}`);
    });
});

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

function checkAndStartGame(roomCode) {
    let room = rooms[roomCode];
    if (!room || room.gameState.isRunning) return;

    let playersArray = Object.values(room.players);
    // Oda tam dolduysa VE herkes hazırsa oyunu başlat
    if (playersArray.length === room.maxPlayers && playersArray.every(p => p.isReady)) {
        room.gameState.isRunning = true;
        io.to(roomCode).emit('game_started_mode');
        startNextRound(roomCode);
    }
}

function startNextRound(roomCode) {
    let room = rooms[roomCode];
    if (!room) return;

    room.gameState.currentRound++;
    room.gameState.activeCatcher = null;

    if (room.gameState.currentRound > room.gameState.maxRounds) {
        let players = Object.values(room.players);
        let winner = players.reduce((prev, current) => (prev.score > current.score) ? prev : current, players[0]);
        io.to(roomCode).emit('game_over', winner || { name: "Kimse" });
        room.gameState.isRunning = false;
        return;
    }

    io.to(roomCode).emit('new_round', { round: room.gameState.currentRound });

    setTimeout(() => {
        if (!rooms[roomCode]) return;
        const randomSong = internetSongPool[Math.floor(Math.random() * internetSongPool.length)];
        io.to(roomCode).emit('show_lyrics', randomSong);

        setTimeout(() => {
            if (rooms[roomCode]) {
                startNextRound(roomCode);
            }
        }, 10000); // 10 saniye şarkı söyleme süresi

    }, 5000); // 5 saniye bekleme
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Sunucu ${PORT} portunda çalışıyor...`);
});
