const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" },
    maxHttpBufferSize: 1e8 // Büyük ses paketleri için
});

const internetSongPool = [
    { title: "Mavi", artist: "Barış Akarsu", lyrics: ["mavi mavi gözlerimde hep sitem mi var", "yoksa insan sevdiğine böyle mi bakar", "gözlerinde aşkın ateşi sönüyor", "kalbim durmuş sanki sana dönüyor"] },
    { title: "Şımarık", artist: "Tarkan", lyrics: ["yılani deliginden cikaran kaderim", "puskullu belam yakalarsam", "muck muck öp beni boynumdan", "kollarında çürüyeyim yanıyorum"] },
    { title: "Sana Kalbim Geçti", artist: "Yıldız Tilbe", lyrics: ["sana kalbim geçti aman", "geri versen almam almam", "sensiz bu dünya zindan", "böyle sevmek olmaz olsun"] },
    { title: "Unutamam Seni", artist: "Tarkan", lyrics: ["unutamam seni unutamam", "ateşlerde yansam da", "kül olsam da inan", "seni unutup da başkasını sevemem"] }
];

let rooms = {};

io.on('connection', (socket) => {
    console.log(`Kullanıcı bağlandı: ${socket.id}`);

    socket.on('join_matchmaking', (data) => {
        const { playerName, desiredMaxPlayers } = data;
        const maxP = parseInt(desiredMaxPlayers);

        let targetRoomCode = null;
        for (let code in rooms) {
            let room = rooms[code];
            let currentPlayerCount = Object.keys(room.players).length;
            if (room.maxPlayers === maxP && !room.gameState.isRunning && currentPlayerCount < maxP) {
                targetRoomCode = code;
                break;
            }
        }

        if (!targetRoomCode) {
            targetRoomCode = 'ODA-' + Math.floor(1000 + Math.random() * 9000);
            rooms[targetRoomCode] = {
                maxPlayers: maxP,
                players: {},
                gameState: { currentRound: 0, maxRounds: 12, isRunning: false, activeCatcher: null }
            };
        }

        socket.join(targetRoomCode);

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

        socket.emit('joined_room_success', { roomCode: targetRoomCode, id: socket.id });
        io.to(targetRoomCode).emit('room_state', formatRoomData(room));
    });

    // --- WePlay Tarzı Sunucu Üzerinden Ses Aktarımı (Audio Relay) ---
    socket.on('voice_data', (data) => {
        // Kullanıcıdan gelen ses paketini, odadaki diğer herkese sunucu üzerinden ilet
        const { roomCode, audioChunk } = data;
        socket.to(roomCode).emit('voice_data', {
            senderId: socket.id,
            audioChunk: audioChunk
        });
    });

    socket.on('player_ready', (data) => {
        const { roomCode, isReady } = data;
        if (rooms[roomCode] && rooms[roomCode].players[socket.id]) {
            rooms[roomCode].players[socket.id].isReady = isReady;
            io.to(roomCode).emit('room_state', formatRoomData(rooms[roomCode]));
            checkAndStartGame(roomCode);
        }
    });

    socket.on('catch_mic', (data) => {
        const { roomCode } = data;
        let room = rooms[roomCode];
        if (room && room.gameState.isRunning && room.gameState.activeCatcher === null) {
            room.gameState.activeCatcher = socket.id;
            let player = room.players[socket.id];
            if (player) {
                player.score += 10;
                io.to(roomCode).emit('player_caught_mic', { 
                    playerId: socket.id,
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
                io.to(roomCode).emit('user_left', { id: socket.id });
                io.to(roomCode).emit('room_state', formatRoomData(rooms[roomCode]));
                
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
        }, 10000); 

    }, 5000); 
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Sunucu ${PORT} portunda çalışıyor...`);
});
