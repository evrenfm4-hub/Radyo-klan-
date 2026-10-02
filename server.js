const express = require('express');
const http = require('http');
const axios = require('axios');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

// Render Sunucusunu Uyanık Tutma (Self-Ping)
const SERVER_URL = process.env.RENDER_EXTERNAL_URL || "https://mikrofon-sende.onrender.com";
setInterval(() => {
  axios.get(SERVER_URL).catch(() => {});
}, 10 * 60 * 1000); // 10 dakikada bir ping atar

app.get('/', (req, res) => {
  res.send('Mikrofon Sende Sunucusu Aktif!');
});

// Popüler Türkçe Şarkı Havuzu (API'den aranacak isimler)
const SEARCH_POOL = [
  "Tarkan Gitme", "Sezen Aksu Gülümse", "Mabel Matiz Karakol", 
  "Manga Dursun Zaman", "Duman Seni Kendime Sakladım", "Teoman Papatya",
  "Hadise Aşk Kaç Beden Giyer", "Mert Demir Antidepresan", "Yıldız Tilbe Çat Kapı",
  "Kenan Doğulu Çakkıdı", "Mor ve Ötesi Bir Derdim Var", "Sertab Erener Rengarenk"
];

let maxSeats = 6;
let players = [];
let totalRoundsPlayed = 0;
const MAX_ROUNDS = 12;

let gameState = 'chatting';
let currentSinger = null;
let countdownTimer = null;
let singingTimer = null;
let currentSongData = null;

// İnternetten (Lyrics.ovh API) Dinamik Şarkı Çekme Fonksiyonu
async function fetchRandomSong() {
  const query = SEARCH_POOL[Math.floor(Math.random() * SEARCH_POOL.length)];
  const [artist, title] = query.split(" ");

  try {
    const res = await axios.get(`https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`);
    if (res.data && res.data.lyrics) {
      const lines = res.data.lyrics.split('\n').filter(l => l.trim() !== '');
      const snippet = lines.slice(0, 3);
      return {
        title: title,
        artist: artist,
        lyrics: snippet.length > 0 ? snippet : ["Sözler yüklendi, sahne senin!"]
      };
    }
  } catch (err) {
    console.log("API İstek hatası, yedek şarkı kullanılıyor.");
  }

  return {
    title: query,
    artist: "Popüler Sanatçı",
    lyrics: ["Sana kalbim geçti aman", "Geri versen almam almam"]
  };
}

io.on('connection', (socket) => {
  socket.emit('room_config', { maxSeats, gameState, round: totalRoundsPlayed, maxRounds: MAX_ROUNDS });

  socket.on('set_max_seats', (count) => {
    maxSeats = parseInt(count) || 6;
    io.emit('room_config', { maxSeats, gameState, round: totalRoundsPlayed, maxRounds: MAX_ROUNDS });
  });

  socket.on('join', (data) => {
    if (players.length >= maxSeats) {
      socket.emit('error_msg', 'Oda dolu!');
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
  });

  socket.on('start_game_manual', async () => {
    if (gameState === 'chatting' && players.length > 0) {
      totalRoundsPlayed = 0;
      await startNextRound();
    }
  });

  socket.on('catch_mic', () => {
    if (gameState === 'countdown' && !currentSinger) {
      clearInterval(countdownTimer);

      const player = players.find(p => p.id === socket.id);
      if (player) {
        currentSinger = player;
        gameState = 'singing';
        
        let singTimeLeft = 10;
        io.emit('mic_caught', { 
          singer: currentSinger, 
          song: currentSongData,
          duration: singTimeLeft 
        });

        singingTimer = setInterval(async () => {
          singTimeLeft--;
          if (singTimeLeft > 0) {
            io.emit('singing_tick', singTimeLeft);
          } else {
            clearInterval(singingTimer);
            totalRoundsPlayed++;
            
            if (totalRoundsPlayed >= MAX_ROUNDS) {
              endGame();
            } else {
              await startNextRound();
            }
          }
        }, 1000);
      }
    }
  });

  socket.on('leave_game', () => {
    removePlayer(socket.id);
  });

  socket.on('disconnect', () => {
    removePlayer(socket.id);
  });
});

function removePlayer(socketId) {
  players = players.filter(p => p.id !== socketId);
  players.forEach((p, idx) => p.seat = idx + 1);
  io.emit('update_players', players);

  if (players.length === 0) {
    clearInterval(countdownTimer);
    clearInterval(singingTimer);
    gameState = 'chatting';
    totalRoundsPlayed = 0;
    currentSinger = null;
    io.emit('reset_stage');
  }
}

async function startNextRound() {
  if (players.length === 0) {
    gameState = 'chatting';
    return;
  }

  gameState = 'countdown';
  currentSinger = null;
  
  currentSongData = await fetchRandomSong();

  let timeLeft = 5;
  io.emit('round_start', { 
    song: currentSongData, 
    countdown: timeLeft, 
    round: totalRoundsPlayed + 1, 
    maxRounds: MAX_ROUNDS 
  });

  countdownTimer = setInterval(async () => {
    timeLeft--;
    if (timeLeft > 0) {
      io.emit('countdown_tick', timeLeft);
    } else {
      clearInterval(countdownTimer);
      if (!currentSinger) {
        io.emit('no_one_caught');
        totalRoundsPlayed++;
        
        if (totalRoundsPlayed >= MAX_ROUNDS) {
          endGame();
        } else {
          setTimeout(async () => await startNextRound(), 2000);
        }
      }
    }
  }, 1000);
}

function endGame() {
  gameState = 'chatting';
  totalRoundsPlayed = 0;
  io.emit('game_over');
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
