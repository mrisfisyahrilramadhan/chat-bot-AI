/**
 * server.js
 * Backend sederhana untuk AI Chatbot Website
 * Tech: Node.js + Express.js + OpenAI API
 *
 * Fitur:
 * - Login sederhana berbasis username (tanpa password)
 * - Guest mode dengan sesi sementara
 * - Setiap user (username / guest) punya daftar chat session sendiri
 * - Riwayat chat disimpan di file JSON sederhana (data/db.json)
 * - Endpoint chat yang memanggil OpenAI API
 */

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const OpenAI = require("openai");

const app = express();
const PORT = process.env.PORT || 3000;

// ---------- Middleware ----------
app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(express.static(path.join(__dirname))); // serve index.html, style.css, script.js

// ---------- Simple JSON "Database" ----------
// Catatan: Vercel & Netlify Functions memiliki filesystem read-only,
// kecuali folder /tmp yang bersifat sementara (reset saat cold start).
// Untuk penyimpanan permanen di production, disarankan deploy ke Render
// atau mengganti bagian ini dengan database sungguhan (MongoDB, dsb).
const isServerless = Boolean(process.env.VERCEL || process.env.NETLIFY);
const DB_DIR = isServerless
  ? path.join(require("os").tmpdir(), "ai-chatbot-data")
  : path.join(__dirname, "data");
const DB_FILE = path.join(DB_DIR, "db.json");

function ensureDb() {
  if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(
      DB_FILE,
      JSON.stringify({ users: {}, chats: {} }, null, 2),
      "utf-8"
    );
  }
}

function readDb() {
  ensureDb();
  const raw = fs.readFileSync(DB_FILE, "utf-8");
  try {
    return JSON.parse(raw);
  } catch (e) {
    return { users: {}, chats: {} };
  }
}

function writeDb(db) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf-8");
}

// ---------- AI Client (OpenAI-compatible) ----------
// Mendukung provider mana pun yang kompatibel dengan format API OpenAI,
// cukup atur OPENAI_BASE_URL dan OPENAI_MODEL di file .env. Contoh:
// - Google Gemini (gratis): https://generativelanguage.googleapis.com/v1beta/openai/
// - Groq (gratis):          https://api.groq.com/openai/v1
// - OpenAI asli (berbayar): kosongkan OPENAI_BASE_URL
let openai = null;
if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL:
      process.env.OPENAI_BASE_URL ||
      "https://generativelanguage.googleapis.com/v1beta/openai/",
  });
}

// ==================================================================
// AUTH ROUTES
// ==================================================================

/**
 * POST /api/login
 * body: { username: string }
 * Jika username belum ada -> buat user baru.
 * Jika sudah ada -> login ke user tersebut.
 */
app.post("/api/login", (req, res) => {
  const { username } = req.body;

  if (!username || !username.trim()) {
    return res.status(400).json({ error: "Username tidak boleh kosong." });
  }

  const cleanUsername = username.trim();

  if (cleanUsername.length < 3 || cleanUsername.length > 20) {
    return res
      .status(400)
      .json({ error: "Username harus 3-20 karakter." });
  }

  if (!/^[a-zA-Z0-9_]+$/.test(cleanUsername)) {
    return res.status(400).json({
      error: "Username hanya boleh huruf, angka, dan underscore.",
    });
  }

  const db = readDb();
  const userId = "user_" + cleanUsername.toLowerCase();

  if (!db.users[userId]) {
    db.users[userId] = {
      id: userId,
      username: cleanUsername,
      type: "registered",
      createdAt: new Date().toISOString(),
    };
    db.chats[userId] = [];
    writeDb(db);
  }

  const user = db.users[userId];
  return res.json({ userId: user.id, username: user.username, type: user.type });
});

/**
 * POST /api/guest
 * Membuat sesi guest baru dengan nama Guest-xxxx
 */
app.post("/api/guest", (req, res) => {
  const db = readDb();
  const randomNumber = Math.floor(1000 + Math.random() * 9000);
  const guestName = `Guest-${randomNumber}`;
  const userId = "guest_" + uuidv4();

  db.users[userId] = {
    id: userId,
    username: guestName,
    type: "guest",
    createdAt: new Date().toISOString(),
  };
  db.chats[userId] = [];
  writeDb(db);

  return res.json({ userId, username: guestName, type: "guest" });
});

// ==================================================================
// CHAT SESSION ROUTES
// ==================================================================

/**
 * GET /api/chats/:userId
 * Mendapatkan daftar chat session milik seorang user
 */
app.get("/api/chats/:userId", (req, res) => {
  const { userId } = req.params;
  const db = readDb();

  if (!db.users[userId]) {
    return res.status(404).json({ error: "User tidak ditemukan." });
  }

  const chats = (db.chats[userId] || []).map((c) => ({
    id: c.id,
    title: c.title,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  }));

  // Chat terbaru di atas
  chats.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

  return res.json({ chats });
});

/**
 * POST /api/chats/:userId
 * Membuat chat session baru ("New Chat")
 */
app.post("/api/chats/:userId", (req, res) => {
  const { userId } = req.params;
  const db = readDb();

  if (!db.users[userId]) {
    return res.status(404).json({ error: "User tidak ditemukan." });
  }

  const newChat = {
    id: "chat_" + uuidv4(),
    title: "Chat Baru",
    messages: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (!db.chats[userId]) db.chats[userId] = [];
  db.chats[userId].push(newChat);
  writeDb(db);

  return res.json({
    id: newChat.id,
    title: newChat.title,
    createdAt: newChat.createdAt,
    updatedAt: newChat.updatedAt,
  });
});

/**
 * GET /api/chats/:userId/:chatId
 * Mendapatkan seluruh pesan dalam satu chat session
 */
app.get("/api/chats/:userId/:chatId", (req, res) => {
  const { userId, chatId } = req.params;
  const db = readDb();

  const userChats = db.chats[userId];
  if (!userChats) return res.status(404).json({ error: "Chat tidak ditemukan." });

  const chat = userChats.find((c) => c.id === chatId);
  if (!chat) return res.status(404).json({ error: "Chat tidak ditemukan." });

  return res.json(chat);
});

/**
 * DELETE /api/chats/:userId/:chatId
 * Menghapus chat session
 */
app.delete("/api/chats/:userId/:chatId", (req, res) => {
  const { userId, chatId } = req.params;
  const db = readDb();

  if (!db.chats[userId]) return res.status(404).json({ error: "Chat tidak ditemukan." });

  db.chats[userId] = db.chats[userId].filter((c) => c.id !== chatId);
  writeDb(db);

  return res.json({ success: true });
});

// ==================================================================
// AI CHAT ROUTE
// ==================================================================

/**
 * POST /api/chat/:userId/:chatId
 * body: { message: string }
 * Mengirim pesan ke AI dan menyimpan riwayat percakapan.
 */
app.post("/api/chat/:userId/:chatId", async (req, res) => {
  const { userId, chatId } = req.params;
  const { message } = req.body;

  if (!message || !message.trim()) {
    return res.status(400).json({ error: "Pesan tidak boleh kosong." });
  }

  const db = readDb();
  const userChats = db.chats[userId];
  if (!userChats) return res.status(404).json({ error: "User tidak ditemukan." });

  const chat = userChats.find((c) => c.id === chatId);
  if (!chat) return res.status(404).json({ error: "Chat tidak ditemukan." });

  const userMessage = {
    role: "user",
    content: message.trim(),
    timestamp: new Date().toISOString(),
  };
  chat.messages.push(userMessage);

  // Judul otomatis diambil dari pesan pertama user
  if (chat.title === "Chat Baru") {
    chat.title =
      message.trim().slice(0, 40) + (message.trim().length > 40 ? "..." : "");
  }

  try {
    let aiReplyText;

    if (!openai) {
      // Mode fallback jika API key belum diatur (agar tetap bisa dites/didemokan)
      aiReplyText =
        "⚠️ OPENAI_API_KEY belum diatur di file `.env`. " +
        "Ini adalah balasan contoh (dummy) agar aplikasi tetap dapat dijalankan.\n\n" +
        "Daftar gratis di https://console.groq.com untuk mendapatkan API key, " +
        "lalu isi ke file `.env`.\n\n" +
        "Contoh format yang didukung:\n" +
        "- **Bold**, *italic*\n" +
        "- Bullet list\n" +
        "- `inline code`\n\n" +
        "```javascript\nfunction hello() {\n  console.log('Hello World');\n}\n```";
    } else {
      const history = chat.messages.slice(-20).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const completion = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || "gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content:
              "Kamu adalah asisten AI yang membantu, ramah, dan menjawab dalam Bahasa Indonesia kecuali diminta lain. Gunakan format Markdown jika relevan (heading, bold, italic, list, code block).",
          },
          ...history,
        ],
        temperature: 0.7,
      });

      aiReplyText = completion.choices[0].message.content;
    }

    const aiMessage = {
      role: "assistant",
      content: aiReplyText,
      timestamp: new Date().toISOString(),
    };
    chat.messages.push(aiMessage);
    chat.updatedAt = new Date().toISOString();

    writeDb(db);

    return res.json({
      reply: aiMessage,
      chatTitle: chat.title,
    });
  } catch (err) {
    console.error("Error saat memanggil OpenAI API:", err.message);
    return res.status(500).json({
      error:
        "Terjadi kesalahan saat menghubungi AI. Periksa API key atau koneksi internet.",
    });
  }
});

// ---------- Fallback ke index.html untuk root ----------
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// ---------- Start Server ----------
// Saat dijalankan di platform serverless (Vercel/Netlify), app.listen()
// tidak dipanggil oleh platform tersebut — hanya dipakai untuk run lokal
// atau di Render (yang butuh long-running server).
ensureDb();

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`✅ Server berjalan di http://localhost:${PORT}`);
    if (!process.env.OPENAI_API_KEY) {
      console.log(
        "⚠️  OPENAI_API_KEY belum diatur. Salin .env.example menjadi .env dan isi API key."
      );
    }
  });
}

module.exports = app;
