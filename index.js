require('dotenv').config();
const { default: makeWASocket, useSingleFileAuthState } = require('@adiwajshing/baileys');
const OpenAI = require("openai");
const qrcode = require('qrcode-terminal');
const { state, saveState } = useSingleFileAuthState('./session.json');

// OpenAI setup
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Запуск WhatsApp-бота
async function startBot() {
  const sock = makeWASocket({ auth: state });
  sock.ev.on('creds.update', saveState);

  // QR-код для входа
  sock.ev.on('connection.update', ({ qr }) => {
    if (qr) qrcode.generate(qr, { small: true });
  });

  // Обработка входящих сообщений
  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message || msg.key.fromMe) return;

    const text = msg.message.conversation || msg.message.extendedTextMessage?.text;
    if (!text) return;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: text }],
      });

      const reply = response.choices[0].message.content;
      await sock.sendMessage(msg.key.remoteJid, { text: reply });
    } catch (err) {
      console.error("Ошибка GPT:", err.message);
    }
  });
}

startBot();
// Фиктивный HTTP-сервер, чтобы Render не ругался на порты
const http = require('http');
http.createServer((_, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Bot is running!\n');
}).listen(process.env.PORT || 3000);
