const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

// Türkçe Şarkı Kütüphanesi
const SONGS = [
  {
    title: "Sana Kalbim Geçti",
    artist: "Yıldız Tilbe",
    lyrics: ["Sana kalbim geçti aman", "Geri versen almam almam", "Sana kalbim geçti - Yıldız TİLBE"]
  },
  {
    title: "İntihaş",
    artist: "Onurcan Özcan",
    lyrics: ["Yalnızlığa yalnız", "Seninle aldattım kıskandı yıldızlar", "Aşka inanmayanlara seni anlattım"]
  },
  {
    title: "Acıyı Sevmek Olur Mu",
    artist: "Mehmet Erdem",
    lyrics: ["Şu yüreğim ne meraklı", "Hiç sözümü dinlemiyor", "Sorarım aşk durulur mu", "Acıyı sevmek olur mu"]
  },
  {
    title: "Seni Affedemiyorum",
    artist: "Uğur Karakuş",
    lyrics: ["Bir daha kapımı çalma", "Sakın ha arama sorma", "Aşkından ölsem bile", "Affederim seni sanma"]
  },
  {
    title: "Gitme",
    artist: "Tarkan",
    lyrics: ["Gitme desem canım kalır mısın benimle", "Gitme desem canım sever misin beni yine"]
  }
];

let players = []; // Odadaki oyuncular (Max 6)
let currentSongIndex = 0;
let gameState = 'waiting'; // 'waiting', 'countdown', 'singing'
let currentSinger = null;
let countdownTimer = null;

io.on('connection', (socket) => {
  console.log('Yeni oyuncu bağlandı:', socket.id);

  socket.on('join', (data) => {
    if (players.length >= 6) {
      socket.emit('error_msg', 'Oda dolu! (Max 6 Oyuncu)');
      return;
    }

    const newPlayer = {
      id: socket.id,
      name: data.name || 'Oyuncu',
      seat: players.length + 1
    };

    players.push(newPlayer);
    socket.emit('init_player', newPlayer);
    io.emit('update_players', players);

    // İlk oyuncular geldiğinde turu başlat
    if (players.length >= 1 && gameState === 'waiting') {
      startNextRound();
    }
  });

  socket.on('catch_mic', () => {
    if (gameState === 'countdown' && !currentSinger) {
      clearInterval(countdownTimer);
      const player = players.find(p => p.id === socket.id);
      if (player) {
        currentSinger = player;
        gameState = 'singing';
        io.emit('mic_caught', { singer: currentSinger, song: SONGS[currentSongIndex] });

        // 15 saniye söyleme süresi
        setTimeout(() => {
          startNextRound();
        }, 15000);
      }
    }
  });

  socket.on('disconnect', () => {
    players = players.filter(p => p.id !== socket.id);
    // Koltuk numaralarını yeniden düzenle
    players.forEach((p, idx) => p.seat = idx + 1);
    io.emit('update_players', players);

    if (currentSinger && currentSinger.id === socket.id) {
      startNextRound();
    }
  });
});

function startNextRound() {
  gameState = 'countdown';
  currentSinger = null;
  currentSongIndex = Math.floor(Math.random() * SONGS.length);
  const currentSong = SONGS[currentSongIndex];

  let timeLeft = 3;
  io.emit('round_start', { song: currentSong, countdown: timeLeft });

  countdownTimer = setInterval(() => {
    timeLeft--;
    if (timeLeft > 0) {
      io.emit('countdown_tick', timeLeft);
    } else {
      clearInterval(countdownTimer);
      if (!currentSinger) {
        io.emit('no_one_caught');
        setTimeout(() => {
          startNextRound();
        }, 2000);
      }
    }
  }, 1000);
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
