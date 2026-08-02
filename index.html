<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Radyo KLAN</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            text-align: center;
            background-color: #121826;
            color: white;
            margin: 0;
            padding: 10px;
        }
        .container {
            max-width: 450px;
            margin: 0 auto;
            background: #151c2f;
            border-radius: 12px;
            padding: 15px;
            box-sizing: border-box;
        }
        #chatBox {
            width: 100%;
            height: 180px;
            background-color: #0f172a;
            border: 1px solid #334155;
            border-radius: 8px;
            margin-bottom: 10px;
            padding: 8px;
            overflow-y: auto;
            text-align: left;
            font-size: 14px;
            box-sizing: border-box;
        }
        .chat-message {
            margin-bottom: 6px;
            padding: 6px 10px;
            background: #1e293b;
            border-radius: 6px;
            word-break: break-all;
        }
        .fal-message {
            margin-bottom: 8px;
            padding: 10px;
            background: #3b0764;
            border: 1px solid #9333ea;
            border-radius: 8px;
            color: #f3e8ff;
            text-align: left;
            font-size: 13px;
            line-height: 1.4;
        }
        .input-group {
            display: flex;
            gap: 8px;
            margin-bottom: 10px;
        }
        input[type="text"] {
            flex: 1;
            padding: 10px;
            border-radius: 6px;
            border: 1px solid #334155;
            background-color: #0f172a;
            color: white;
            outline: none;
        }
        .btn-green {
            background-color: #10b981;
            color: white;
            border: none;
            padding: 10px 15px;
            border-radius: 6px;
            cursor: pointer;
            font-weight: bold;
        }
        .btn-purple {
            background-color: #9333ea;
            color: white;
            border: none;
            padding: 12px;
            width: 100%;
            border-radius: 8px;
            font-size: 15px;
            font-weight: bold;
            cursor: pointer;
            margin-top: 8px;
        }
        .btn-purple:hover { background-color: #7e22ce; }
        .btn-blue {
            background-color: #3b82f6;
            color: white;
            border: none;
            padding: 10px;
            width: 100%;
            border-radius: 8px;
            font-size: 14px;
            font-weight: bold;
            cursor: pointer;
            margin-top: 5px;
        }
        .btn-blue:hover { background-color: #2563eb; }
    </style>
</head>
<body>

    <div class="container">
        <h2>RADYO KLAN</h2>
        <div style="color: #34d399; font-weight: bold; margin-bottom: 10px;">🟢 Canlı Sohbet Aktif</div>

        <!-- Sohbet ve Fal Mesajlarının Akacağı Kutu -->
        <div id="chatBox"></div>

        <div class="input-group">
            <input type="text" id="messageInput" placeholder="Mesaj yaz...">
            <button class="btn-green" id="sendBtn">Gönder</button>
        </div>

        <!-- Fal Butonları -->
        <button class="btn-purple" id="buyFalBtn">☕ Yapay Zeka Falı Satın Al (10 Altın)</button>
        <button class="btn-blue" id="oldFalsBtn">📜 Geçmiş Fallarım</button>
    </div>

    <!-- Socket.IO Kütüphanesi -->
    <script src="/socket.io/socket.io.js"></script>
    <script>
        const socket = io();
        const chatBox = document.getElementById('chatBox');
        const messageInput = document.getElementById('messageInput');
        const sendBtn = document.getElementById('sendBtn');
        const buyFalBtn = document.getElementById('buyFalBtn');
        const oldFalsBtn = document.getElementById('oldFalsBtn');
        const myName = 'Evren';

        // --- SOHBET SİSTEMİ ---
        function sendMessage() {
            const text = messageInput.value.trim();
            if (text) {
                socket.emit('chat-message', {
                    message: text,
                    sender: myName
                });
                messageInput.value = '';
            }
        }

        sendBtn.addEventListener('click', sendMessage);
        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendMessage();
        });

        socket.on('chat-message', (data) => {
            const msgDiv = document.createElement('div');
            msgDiv.className = 'chat-message';
            msgDiv.innerHTML = `<b>${data.sender}:</b> ${data.message}`;
            chatBox.appendChild(msgDiv);
            chatBox.scrollTop = chatBox.scrollHeight;
        });

        // --- FAL SİSTEMİ VE GEÇMİŞİ ---
        function saveFalToStorage(falText) {
            let fals = JSON.parse(localStorage.getItem('eski_fallar') || '[]');
            fals.push({ date: new Date().toLocaleString(), text: falText });
            localStorage.setItem('eski_fallar', JSON.stringify(fals));
        }

        buyFalBtn.addEventListener('click', () => {
            const siraDiv = document.createElement('div');
            siraDiv.className = 'fal-message';
            siraDiv.innerHTML = `🔮 <b>Yapay Zeka Falcısı:</b> Kahve falınız başarıyla sıraya alınmıştır. Yoğunluk durumuna göre ortalama 7 dakika içinde yorumlanıp buraya düşecektir. Lütfen bekleyin...`;
            chatBox.appendChild(siraDiv);
            chatBox.scrollTop = chatBox.scrollHeight;

            // Test için süreyi kısa tutabilirsin (örneğin 5000 = 5 saniye). Gerçek için 7 * 60 * 1000 yapın.
            setTimeout(() => {
                const falIcerigi = `Fincanınızda çok net bir şekilde büyük bir yol ve yolun sonunda ellerini açmış bekleyen bir insan silüeti çıkmış. Uzun zamandır beklediğiniz haber gelecek ve hanenize huzur dolacak. Tabakta ise büyük bir balık ve altın sembolü var; maddi anlamda eliniz rahatlayacak.`;
                
                const sonucDiv = document.createElement('div');
                sonucDiv.className = 'fal-message';
                sonucDiv.style.background = '#581c87';
                sonucDiv.style.borderColor = '#c084fc';
                sonucDiv.innerHTML = `✨ <b>Falınız Yorumlandı!</b><br><br>${falIcerigi}`;
                
                chatBox.appendChild(sonucDiv);
                chatBox.scrollTop = chatBox.scrollHeight;

                // Falı hafızaya kaydet
                saveFalToStorage(falIcerigi);
            }, 5000); // Test için 5 saniye ayarlandı, dilerseniz artırabilirsiniz.
        });

        // Eski falları listeleme butonu
        oldFalsBtn.addEventListener('click', () => {
            let fals = JSON.parse(localStorage.getItem('eski_fallar') || '[]');
            
            chatBox.innerHTML = ''; // Ekranı temizle veya altına ekle
            
            if (fals.length === 0) {
                chatBox.innerHTML = `<div class="fal-message">📜 Henüz geçmiş fal kaydınız bulunmuyor.</div>`;
                return;
            }

            const headerDiv = document.createElement('div');
            headerDiv.className = 'fal-message';
            headerDiv.style.background = '#1e1b4b';
            headerDiv.innerHTML = `<b>📜 Geçmiş Fallarınız (${fals.length} Adet):</b>`;
            chatBox.appendChild(headerDiv);

            fals.forEach((fal, index) => {
                const falDiv = document.createElement('div');
                falDiv.className = 'fal-message';
                falDiv.innerHTML = `<b>#${index + 1} - ${fal.date}</b><br>${fal.text}`;
                chatBox.appendChild(falDiv);
            });
            chatBox.scrollTop = chatBox.scrollHeight;
        });
    </script>
</body>
</html>
