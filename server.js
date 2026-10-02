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

// Amatör / Telifsiz Şarkı Havuzu (Cover sesler ve sözler)
const amateurSongPool = [
    {
        title: "Dillere Düşen (Cover)",
        artist: "Amatör Ses Havuzu",
        audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
        lyrics: "Yollar, yollar aşılmıyor yollar...\nGözüm yolda, kulağım seste..."
    },
    {
        title: "Gece Yolculuğu (Cover)",
        artist: "Amatör Ses Havuzu",
        audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
        lyrics: "Karanlık gecenin ta ortasında...\nBir ses duyulur uzaktan..."
    },
    {
        title: "Yalnız Gemi (Cover)",
        artist: "Amatör Ses Havuzu",
        audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
        lyrics: "Dalgalar vurur sahile sessizce...\nİçimde kalan son umutla..."
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
                maxPlayers: 6,
                isGameStarted: false
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

        room.players[assignedSeat] = {
            id: socket.id,
            name: playerName
        };

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

    // Oyunu Başlat: 3 Saniye Geri Sayım + Ses Efekti Tetikleyici
    socket.on('start_game_manual', (data) => {
        const { roomCode } = data;
        const room = rooms[roomCode];
        if (room) {
            room.isGameStarted = true;
            let countdown = 3; // 3 Saniye geri sayım

            io.to(roomCode).emit('game_starting', { countdown });

            const timer = setInterval(() => {
                countdown--;
                if (countdown > 0) {
                    io.to(roomCode).emit('countdown_tick', { countdown });
                } else {
                    clearInterval(timer);
                    
                    // Rastgele bir telifsiz amatör şarkı seç
                    const randomSong = amateurSongPool[Math.floor(Math.random() * amateurSongPool.length)];

                    // Şarkı ekranını aç ve 5 saniyelik şarkı sözü verme süresini başlat
                    io.to(roomCode).emit('round_start', {
                        song: randomSong,
                        duration: 5 // 5 saniye şarkı sözü gösterim/söyleme süresi
                    });
                }
            }, 1000);
        }
    });

    socket.on('leave_room', (data) => {
        handleDisconnect(socket);
    });

    // WebRTC Sinyalleşmesi
    socket.on('offer', (data) => {
        io.to(data.target).emit('offer', { offer: data.offer, sender: socket.id });
    });
    socket.on('answer', (data) => {
        io.to(data.target).emit('answer', { answer: data.answer, sender: socket.id });
    });
    socket.on('ice-candidate', (data) => {
        io.to(data.target).emit('ice-candidate', { candidate: data.candidate, sender: socket.id });
    });

    socket.on('disconnect', () => {
        handleDisconnect(socket);
    });

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
