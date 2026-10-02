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

// Nakarat Odaklı Ses Havuzu (Şarkı + Sözleri)
const chorusSongPool = [
    {
        title: "Dillere Düşen",
        artist: "Pop Cover",
        lyrics: "Dilimde bir şarkı, gözümde yaşlar var...\nUnuttum seni sanma, kalbim hala yasta!",
        audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" // Kendi nakarat ses dosyanla değiştirebilirsin
    },
    {
        title: "Gece Yolculuğu",
        artist: "Akustik Vokal",
        lyrics: "Giderken ardına bile bakmadın ya...\nİşte o an dünyam başıma yıkıldı ya!",
        audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3"
    }
];

app.get('/', (req, res) => {
    res.send('Radyo Klan - Mikrofon Sende Karaoke Sunucusu Aktif!');
});

setInterval(() => {
    if (process.env.RENDER_EXTERNAL_HOSTNAME) {
        axios.get('https://' + process.env.RENDER_EXTERNAL_HOSTNAME).catch(() => {});
    }
}, 14 * 60 * 1000);

io.on('connection', (socket) => {
    console.log('Bağlandı:', socket.id);

    socket.on('join_room', (data) => {
        const { roomCode, playerName } = data;
        socket.join(roomCode);

        if (!rooms[roomCode]) {
            rooms[roomCode] = {
                players: {},
                maxPlayers: 10,
                isGameStarted: false,
                currentSingerIndex: 0,
                turnTimer: null
            };
        }

        const room = rooms[roomCode];
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

        room.players[assignedSeat] = { id: socket.id, name: playerName };

        socket.emit('assigned_seat', { seatIndex: assignedSeat });
        io.to(roomCode).emit('room_state', room);
        socket.to(roomCode).emit('user_joined', { socketId: socket.id, seatIndex: assignedSeat });
    });

    socket.on('set_max_players', (data) => {
        const { roomCode, maxPlayers } = data;
        if (rooms[roomCode]) {
            rooms[roomCode].maxPlayers = parseInt(maxPlayers);
            io.to(roomCode).emit('room_state', rooms[roomCode]);
        }
    });

    socket.on('start_game_manual', (data) => {
        const { roomCode } = data;
        const room = rooms[roomCode];
        if (room) {
            room.isGameStarted = true;
            room.currentSingerIndex = 0;
            let countdown = 3;

            io.to(roomCode).emit('game_starting', { countdown });

            const timer = setInterval(() => {
                countdown--;
                if (countdown > 0) {
                    io.to(roomCode).emit('countdown_tick', { countdown });
                } else {
                    clearInterval(timer);
                    startNextPlayerTurn(roomCode);
                }
            }, 1000);
        }
    });

    function startNextPlayerTurn(roomCode) {
        const room = rooms[roomCode];
        if (!room) return;

        const playerSeats = Object.keys(room.players).sort();
        if (playerSeats.length === 0) return;

        if (room.currentSingerIndex >= playerSeats.length) {
            room.currentSingerIndex = 0;
        }

        const currentSeat = playerSeats[room.currentSingerIndex];
        const singer = room.players[currentSeat];
        const randomSong = chorusSongPool[Math.floor(Math.random() * chorusSongPool.length)];
        let singDuration = 15; // Her oyuncunun şarkı söyleme süresi

        io.to(roomCode).emit('player_turn_start', {
            singerName: singer.name,
            seatIndex: currentSeat,
            song: randomSong,
            duration: singDuration
        });

        if (room.turnTimer) clearInterval(room.turnTimer);

        room.turnTimer = setInterval(() => {
            singDuration--;
            if (singDuration <= 0) {
                clearInterval(room.turnTimer);
                room.currentSingerIndex++;
                startNextPlayerTurn(roomCode);
            } else {
                io.to(roomCode).emit('turn_countdown_tick', { timeLeft: singDuration });
            }
        }, 1000);
    }

    socket.on('catch_song', (data) => {
        const { roomCode, playerName } = data;
        io.to(roomCode).emit('song_caught', { catcher: playerName });
    });

    socket.on('leave_room', (data) => {
        handleDisconnect(socket);
    });

    socket.on('offer', (data) => { io.to(data.target).emit('offer', { offer: data.offer, sender: socket.id }); });
    socket.on('answer', (data) => { io.to(data.target).emit('answer', { answer: data.answer, sender: socket.id }); });
    socket.on('ice-candidate', (data) => { io.to(data.target).emit('ice-candidate', { candidate: data.candidate, sender: socket.id }); });

    socket.on('disconnect', () => { handleDisconnect(socket); });

    function handleDisconnect(sock) {
        for (let roomCode in rooms) {
            let room = rooms[roomCode];
            let changed = false;
            for (let seat in room.players) {
                if (room.players[seat].id === sock.id) {
                    delete room.players[seat];
                    changed = true;
                }
            }
            if (changed) {
                io.to(roomCode).emit('user_left', { socketId: sock.id });
                io.to(roomCode).emit('room_state', room);
            }
        }
    }
});

server.listen(PORT, () => console.log(`Sunucu ${PORT} portunda aktif.`));
