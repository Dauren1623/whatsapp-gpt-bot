require('dotenv').config();
const { default: makeWASocket, useSingleFileAuthState } = require('@adiwajshing/baileys');
const { Configuration, OpenAIApi } = require("openai");
const qrcode = require('qrcode-terminal');
const { state, saveState } = useSingleFileAuthState('./session.json');

// OpenAI setup
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

// WhatsApp connection
async function startBot() {
  const sock = makeWASocket({ auth: state });
  sock.ev.on('creds.update', saveState);

  sock.ev.on('connection.update', ({ qr }) => {
    if (qr) qrcode.generate(qr, { small: true });
  });

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message || msg.key.fromMe) return;

    const text = msg.message.conversation || msg.message.extendedTextMessage?.text;
    if (!text) return;

    const response = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: text }],
    });

    const reply = response.data.choices[0].message.content;
    await sock.sendMessage(msg.key.remoteJid, { text: reply });
  });
}

startBot();