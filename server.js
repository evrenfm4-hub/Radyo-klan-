const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" },
    maxHttpBufferSize: 1e8 
});

// HTML ve arayüz dosyalarını tarayıcıya açan komut (Beyaz ekranı önler)
app.use(express.static(path.join(__dirname)));

const internetSongPool = [
    { title: "Mavi", artist: "Barış Akarsu", lyrics: ["mavi mavi gözlerimde hep sitem mi var", "yoksa insan sevdiğine böyle mi bakar", "gözlerinde aşkın ateşi sönüyor", "kalbim durmuş sanki sana dönüyor"] },
    { title: "Şımarık", artist: "Tarkan", lyrics: ["yılani deliginden cikaran kaderim", "puskullu belam yakalarsam", "muck muck öp beni boynumdan", "kollarında çürüyeyim yanıyorum"] },
    { title: "Sana Kalbim Geçti", artist: "Yıldız Tilbe", lyrics: ["sana kalbim geçti aman", "geri versen almam almam", "sensiz bu dünya zindan", "böyle sevmek olmaz olsun"] },
    { title: "Unutamam Seni", artist: "Tarkan", lyrics: ["unutamam seni unutamam", "ateşlerde yansam da", "kül olsam da inan", "seni unutup da başkasını sevemem"] },
    { title: "Kış Güneşi", artist: "Tarkan", lyrics: ["gün doğuyor batıyor kara geceler", "sensiz geçen günlerin acısı yeter", "nerdesin kış güneşli sevgilim", "hasretinle yandı bu garip kalbim"] },
    { title: "Keskin Bıçak", artist: "Sezen Aksu", lyrics: ["keskin bıçak gibidir aşkın", "hem deler geçer hem kanatır", "ne sevdalar bitti bu yollarda", "bir tek sen bıraktın izini"] },
    { title: "Gülümse", artist: "Sezen Aksu", lyrics: ["hadi gülümse bulutlar gitsin", "yoksa inan kara geceler bitmez", "hadi gülümse sardunya", "büyür dağlar arkasından"] },
    { title: "Belalım", artist: "Sezen Aksu", lyrics: ["ayrılık bu da ne yazık ki", "gözyaşlarım sel oldu bugün", "belalım benim gidişinle", "bütün dünyam altüst oldu"] },
    { title: "Çakkıdı", artist: "Kenan Doğulu", lyrics: ["oyuncak gibi oynadın kalbimle", "hiç acımadın gidenlere", "çakkıdı çakkıdı oynatır", "bu hayat adamı yorar"] },
    { title: "Gönülçelen", artist: "Teoman", lyrics: ["sen gidersen adımların kalır", "gözlerimde hayalin hep yaşar", "ey gönülçelen güzel kadın", "nerede şimdi o eski günler"] },
    { title: "Sil Baştan", artist: "Şebnem Ferah", lyrics: ["sil baştan başlamak lazım hayata", "her şeyi sıfırlamak yeniden", "hiç yaşanmamış gibi saymak", "gülücükler saçmak etrafa"] },
    { title: "Cambaz", artist: "Mor ve Ötesi", lyrics: ["kimileri der ki bu bir oyun", "kimileriysa hayatin ta kendisi", "ip üstünde yürürken cambaz", "düşmemek için direnir sessizce"] },
    { title: "Belki Alışman Lazım", artist: "Duman", lyrics: ["aklımı çeldi yine kör kuyu", "dipsiz bir okyanus bu duygu", "belki alışman lazım yalnızlığa", "yoksa bu kalp dayanmaz"] },
    { title: "Dursun Zaman", artist: "manga", lyrics: ["dursun zaman akmasın geri", "seni çok özledim inanki", "geceler karanlık ve uzun", "gel de bitir bu hasreti"] },
    { title: "Cevapsız Sorular", artist: "manga", lyrics: ["kalpsiz bir dünyada yalnız kaldım", "cevapsız sorularla boğuştum", "gözlerinde kaybolduğum o günleri", "hiç unutmadım inanki"] },
    { title: "Bir Kadın Çizeceksin", artist: "manga", lyrics: ["karanlık odalarda beklemekten", "sıkıldı artık bu zavallı ruh", "haydi bir kadın çizeceksin", "bütün renkleri ona vereceksin"] },
    { title: "Holigan", artist: "Athena", lyrics: ["tribünler inliyor sesimizle", "takımımız sahada zafer peşinde", "biz birer holiganız ölene kadar", "vazgeçmeyiz bu sevdadan"] },
    { title: "Aya Benzer", artist: "Mustafa Sandal", lyrics: ["aya benzer yüreğim", "etrafında döner durur", "seni görünce bu garip", "aklını şaşırır kalır"] },
    { title: "Janti", artist: "Murat Boz", lyrics: ["bakışın yeter insanı yakmaya", "peşinden koşturup yormaya", "bugün de çok jantiyiz yine", "kimse kafa tutamaz bize"] },
    { title: "Everyway That I Can", artist: "Sertab Erener", lyrics: ["give me love give me more", "i'm ready for the dance floor", "everyway that i can", "i will love you my man"] },
    { title: "Düm Tek Tek", artist: "Hadise", lyrics: ["seni sevdiğimi herkesten sakladım", "kalbimin sesini bir tek sana dinlettim", "düm tek tek oynuyor yüreğim", "seninle her şeye varım ben"] },
    { title: "Palavra Palavra", artist: "Ajda Pekkan", lyrics: ["palavra palavra aşkımız yalan", "gözlerimde gördüğün o sahte heman", "her şey bir rüzgar gibi geçti", "geriye kalan koca bir yalan"] },
    { title: "Büyük Aşkım", artist: "Nilüfer", lyrics: ["sen benim en büyük aşkımsın", "kalbimin en derinlerindesin", "yıllar geçse de unutamam seni", "sen benim her şeyimsin"] },
    { title: "Ali Desidero", artist: "MFÖ", lyrics: ["ali desidero sevilmez mi", "bu hallerinle kim gülmez ki", "hayat dediğin üç günlük dünya", "yaşa gitsin gönlünce"] },
    { title: "Saz Mı Caz Mı", artist: "MFÖ", lyrics: ["saz mı caz mı hangisi güzel", "anlamam ben bu işlerden özel", "kalbim nediyorsa o doğrudur", "dinle sen de bu güzel sözleri"] },
    { title: "Tamirci Çırağı", artist: "Cem Karaca", lyrics: ["işçiyiz haklıyız kazanacağız", "bu düzeni baştan kuracağız", "tamirci çırağı aslan parçası", "alın teriyle kazanır ekmeğini"] },
    { title: "Dağlar Dağlar", artist: "Barış Manço", lyrics: ["dağlar dağlar yar memleketim", "sevdiceğim orada kaldı benim", "kavuştur beni sevdiğime dağlar", "dayanmaz artık bu yürek"] },
    { title: "Fesuphanallah", artist: "Erkin Koray", lyrics: ["fesuphanallah yandık allahım", "dertlerin bini bir para", "ne olacak bu memleketin hali", "soran yok garibin ahını"] },
    { title: "Affet", artist: "Müslüm Gürses", lyrics: ["affet beni akşam güneş batarken", "gözyaşlarım yanaklarımdan süzülürken", "hata yaptık sevmekten başka", "bağışla ne olur bu kulunu"] },
    { title: "Müslüm Baba Nilüfer", artist: "Müslüm Gürses", lyrics: ["nereden bileceksiniz halimi", "kim anlar benim gibi sevmeyi", "sen unutulacak kadın mısın", "ömrümün en güzel baharıydın"] },
    { title: "Saramadım", artist: "İbrahim Tatlıses", lyrics: ["saramadım bir türlü kollarımda", "güller bitti hep yollarımda", "hasretinle dağlandı yüreğim", "dön artık ne olur evine"] },
    { title: "Merak Etme Sen", artist: "Ferdi Tayfur", lyrics: ["merak etme sen unutulmadın", "kalbimde hala en başkasısın", "gözlerim arar seni her yerde", "sen benim tek gerçeğimsin"] },
    { title: "Batsın Bu Dünya", artist: "Orhan Gencebay", lyrics: ["batsın bu dünya bittesin rüya", "ne gelen var ne giden arar sormaya", "isyan ediyorum kaderin eline", "böyle adalet olmaz olsun"] },
    { title: "Kulum Kulum", artist: "Kibariye", lyrics: ["kulum kulum kapındayım senin", "bir tek kelamına muhtacım", "bırakma beni ellerin eline", "sen benim canımsın"] },
    { title: "Devler Ağlar", artist: "Ebru Gündeş", lyrics: ["devler de ağlarmış meğer", "sevda acısı her şeye değer", "gözyaşım sele karıştı bugün", "sensizlik ölümden de beter"] },
    { title: "Of Of", artist: "Gülşen", lyrics: ["of of yaktın beni can evimden", "dönüşün yok mu bu gidişinden", "bağlandım kaldım bir kere sana", "nasıl kurtulurum bu halden"] },
    { title: "Bangır Bangır", artist: "Demet Akalın", lyrics: ["kapıda araba bangır bangır", "gözleri üzerimde çapkın çapkın", "bugün de günümüz gün olsun", "eğlenelim sabaha kadar"] },
    { title: "Sen Olsan Bari", artist: "Aleyna Tilki", lyrics: ["sen olsan bari sen olsan bari", "gözlerim arıyor seni heryeri", "buraların tadı yok sensiz", "çabuk dön geri"] },
    { title: "Martılar", artist: "Edis", lyrics: ["martılar uçar gökyüzünde serbest", "bizim de kalbimiz böyle mert", "denizin kokusu vurur yüzümüze", "mutluluk yakındır bize"] },
    { title: "Depresyondayım", artist: "Göksel", lyrics: ["depresyondayım, unutuldayım", "unutuldum tabiki sevinin", "kaçıncı kadehteyim bilmiyorum", "seni unutmak zor bu şehirde"] },
    { title: "Pembe Mezarlık", artist: "Model", lyrics: ["bu pembe mezarlıkta herkes mutlu", "sen niye böylesin ey sevgili", "aşk dediğin bir yalan masal", "bunu bilemedik zavallı"] },
    { title: "Hele Bi Salın", artist: "Pinhani", lyrics: ["hele bi salın kendinizi", "unutun bütün dertleri siz de", "hayat dediğin bir nefes an", "tadını çıkarın doya doya"] },
    { title: "Kafile", artist: "Yüksek Sadakat", lyrics: ["bir kafile gibi göçeriz biz de", "anılar arkamızda kalır gizli", "ne buralar bize kalır ne de yollar", "zaman akar gider sessizce"] },
    { title: "Sen Bir Meleksin", artist: "Kargo", lyrics: ["sen bir meleksin gökten düşen", "kalbime dokunan en tatlı düş sen", "hiç gitme yanımda kal ömür boyu", "dünyamın en güzel rengisin"] },
    { title: "Fırtınadayım", artist: "Mabel Matiz", lyrics: ["fırtınadayım kalbim delik deşik", "hayatla aramızda her şey eşit", "bir dokunsan bin ah dinlersin", "sen de benimle sever misin"] },
    { title: "Yoruldum", artist: "Sıla", lyrics: ["yoruldum artık bu yalanlardan", "bıktım boş geçen zamanlardan", "kendimi arıyorum köşe bucak", "belki bir gün bulan çıkacak"] },
    { title: "Ulan", artist: "Zeynep Bastık", lyrics: ["ulan ne hayaller kurmuştuk oysa", "hepsi birer rüya gibi uçtuursa", "yine de güzeldi sevmek seni", "hiç pişman değilim inanki"] },
    { title: "Gözlerinin Hapsindeyim", artist: "Fatih Erkoç", lyrics: ["gözlerinin hapsindeyim çoktan", "kaçamam artık bu aşktan", "ruhuma işledi varlığın", "sen benim en güzel yanımsın"] },
    { title: "Unutamadım", artist: "Barış Manço", lyrics: ["unutamadım unutamadım adını", "hâlâ kulağımda çınlar şarkın", "ne cefa bitti ne de bu hasret", "sen hala kalbimin başköşesindesin"] },
    { title: "Ah Bu Şarkıların Gözü Konuşsun", artist: "Zeki Müren", lyrics: ["ah bu şarkıların gözü kör olsun", "insanı alıp eski günlere götürsün", "hatıralar canlanır birer birer", "gözyaşım yanaklarıma süzülür"] },
    { title: "Değilim", artist: "Mebrure", lyrics: ["ben sen değilim senin gibi de değilim", "eski ben gibi bile değilim", "boşuna arama yorulma canım", "bıraktığın yerde de değilim"] },
    { title: "Yansıma", artist: "Derya Uluğ", lyrics: ["sana hastayım anlasan ah", "şaka yapmadım anlasan ah-ah ah-ah-ah", "bana sabıka bağlasan ah", "bi' de sormadan harcasan ah-ah-ah-ah-ah-ah"] },
    { title: "Gözlerinden Gözlerine", artist: "Semicenk", lyrics: ["bak yanıyor bak içimde", "taşıyor kalbimden", "düşerim yüksekten", "gözlerimden gözlerine"] },
    { title: "Roman Olur Yazsam Seni", artist: "Velet", lyrics: ["roman olur yazsam seni", "şu semada yıldız gibi", "gözlerin gözlerime renktir benim", "aynı kefen sarsın bizi"] },
    { title: "Ben Bilmem", artist: "Yalın", lyrics: ["biz bu aşkla göklere", "duyulmamış düşlere", "kirlenmemiş hayallere", "uçacaktık"] },
    { title: "Değmesin Ellerimiz", artist: "Model", lyrics: ["değmesin ellerimiz", "değmesin ellerimiz", "buluşmasın bu gözler", "yine erir gideriz"] },
    { title: "Yasemen", artist: "Doçent", lyrics: ["güneş bulur yakar seni", "külün' saçar açma yasemen", "şafak söktü kokun gelir", "derin uykuda böldü beni"] },
    { title: "Afra ve Sefo", artist: "Aşiyan", lyrics: ["yaramadım ah denizleri", "yapamadım ama çok istedim", "değiştiremedim seni"] },
    { title: "Sor", artist: "Serdar Ortaç", lyrics: ["ama sen korkaksın hiç bulaşma", "yaklaşmazsın gerçek aşklara", "demiş ki benden uzak olsun", "peki niye her gün ağlıyorsun"] },
    { title: "Bir Gün Ol Yerimde", artist: "Doğu Swag ve Aleyna Tilki", lyrics: ["öyle başını alıp gitmek kolay ya", "bir gün ol yerimde", "savurup atmak kolay ya", "koştum hep peşinde"] }
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

    // --- Ses Aktarımı (Yankı Önleme: Sadece diğer oyunculara gönderilir) ---
    socket.on('voice_data', (data) => {
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
