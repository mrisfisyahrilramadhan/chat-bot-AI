# 🤖 AI Chatbot Website

Website AI Chatbot sederhana, modern, dan responsive — dibangun dengan **HTML, CSS, JavaScript (frontend)** dan **Node.js + Express.js (backend)**, terintegrasi dengan **OpenAI API**. Proyek ini cocok untuk tugas kuliah dan siap di-deploy ke **Vercel**, **Render**, atau **Netlify**.

---

## ✨ Fitur

- **Halaman awal**: pilih *Masuk menggunakan Username* atau *Lanjut sebagai Guest*
- **Login sederhana** tanpa password (cukup username; otomatis dibuatkan akun jika belum ada)
- **Guest Mode** dengan nama otomatis `Guest-xxxx` dan sesi sendiri
- **Multi chat session** per user — riwayat tidak tercampur antar user
- **New Chat** untuk memulai percakapan baru
- **Sidebar** berisi riwayat chat, bisa dibuka kembali atau dihapus
- Balasan AI dengan indikator **"AI sedang mengetik..."**
- **Auto scroll** dan **timestamp** di setiap pesan
- Dukungan **Markdown** penuh (heading, bold, italic, list, link, dll.)
- **Code block** dengan **syntax highlighting** dan **tombol Copy Code** satu klik
- **Dark mode**, tema biru, rounded corner, animasi ringan
- **Responsive** di desktop, laptop, tablet, dan smartphone

---

## 🧱 Teknologi

| Bagian    | Teknologi                          |
| --------- | ----------------------------------- |
| Frontend  | HTML, CSS, JavaScript (vanilla)     |
| Backend   | Node.js, Express.js                 |
| AI        | OpenAI API (`gpt-4o-mini` default)  |
| Markdown  | [marked.js](https://marked.js.org/) |
| Highlight | [highlight.js](https://highlightjs.org/) |
| Storage   | File JSON sederhana (`data/db.json`)|

---

## 📁 Struktur Folder

```
/project
├── index.html              # Halaman utama (auth + chat UI)
├── style.css                # Styling (dark mode, biru, responsive)
├── script.js                 # Logika frontend
├── server.js                  # Backend Express + OpenAI API
├── package.json
├── .env.example                # Contoh konfigurasi environment
├── .gitignore
├── vercel.json                  # Konfigurasi deploy ke Vercel
├── netlify.toml                  # Konfigurasi deploy ke Netlify
├── netlify/functions/api.js       # Wrapper Express untuk Netlify Functions
├── data/                            # Dibuat otomatis, isi db.json (jangan di-commit)
└── README.md
```

---

## 🚀 Menjalankan di Lokal (Development)

### 1. Prasyarat

- [Node.js](https://nodejs.org/) versi 18 ke atas
- API Key **gratis** dari Google Gemini atau Groq — lihat langkah 3 di bawah

### 2. Instalasi

```bash
# masuk ke folder project
cd project

# install dependencies
npm install
```

### 3. Konfigurasi Environment (Pakai AI Gratis)

Project ini mendukung provider AI mana pun yang kompatibel dengan format API
OpenAI, cukup ganti `OPENAI_BASE_URL` dan `OPENAI_MODEL` di `.env`. Dua pilihan
gratis yang direkomendasikan:

**A. Google Gemini (gratis)**
1. Buka [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
2. Login dengan akun Google, klik **Create API Key**
3. Copy key yang muncul (diawali `AIza...`)

**B. Groq (gratis, alternatif)**
1. Buka [console.groq.com](https://console.groq.com) dan login
2. Menu **API Keys** → **Create API Key**
3. Copy key (diawali `gsk_...`)

Salin `.env.example` menjadi `.env`:

```bash
cp .env.example .env
```

Buka file `.env`, lalu isi salah satu opsi (pastikan opsi lain di-*comment*
dengan `#` agar tidak bentrok). Contoh pakai Gemini:

```
OPENAI_API_KEY=AIzaSyxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
OPENAI_MODEL=gemini-2.5-flash
OPENAI_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai/
PORT=3000
```

> ⚠️ Jika `OPENAI_API_KEY` tidak diisi, aplikasi tetap bisa dijalankan dan akan
> memberi balasan dummy (contoh) agar kamu tetap bisa menguji tampilan dan alur aplikasi.

> 💡 **Ingin pakai OpenAI asli (berbayar)?** Hapus/kosongkan baris `OPENAI_BASE_URL`,
> lalu isi `OPENAI_API_KEY` dengan key dari [platform.openai.com](https://platform.openai.com/api-keys)
> dan ganti `OPENAI_MODEL` menjadi misalnya `gpt-4o-mini`.

> ⚠️ **Setiap kali mengubah isi `.env`, server harus di-restart** (`Ctrl+C` lalu
> `npm start` lagi) — Node.js tidak membaca ulang `.env` secara otomatis.

### 4. Jalankan Server

```bash
npm start
```

Server berjalan di: **http://localhost:3000**

Buka URL tersebut di browser, lalu:
1. Pilih **Lanjut sebagai Guest** untuk langsung mencoba, atau
2. Pilih **Masuk menggunakan Username** untuk membuat/menggunakan akun sederhana.

---

## 🗄️ Cara Kerja Penyimpanan Data

Proyek ini menggunakan **file JSON sederhana** (`data/db.json`) sebagai database, dibuat otomatis saat server pertama kali berjalan. Struktur data:

```json
{
  "users": {
    "user_andi": { "id": "user_andi", "username": "andi", "type": "registered" },
    "guest_xxxx": { "id": "guest_xxxx", "username": "Guest-1024", "type": "guest" }
  },
  "chats": {
    "user_andi": [ { "id": "chat_1", "title": "...", "messages": [...] } ],
    "guest_xxxx": [ { "id": "chat_2", "title": "...", "messages": [...] } ]
  }
}
```

Setiap user (baik terdaftar maupun guest) memiliki daftar chat sendiri sehingga riwayat tidak tercampur. Sesi login disimpan di **localStorage** browser (`ai_chatbot_session`) agar user tetap "login" saat membuka kembali website.

> 💡 **Catatan untuk deployment serverless (Vercel/Netlify):** platform ini memiliki
> filesystem *read-only*, kecuali folder sementara `/tmp` yang dapat direset kapan saja
> (misalnya saat *cold start*). Proyek ini sudah dikonfigurasi untuk otomatis memakai
> `/tmp` di lingkungan tersebut agar tidak error, namun artinya **riwayat chat tidak
> permanen** di Vercel/Netlify. Untuk penyimpanan yang benar-benar permanen:
> - Gunakan **Render** (server Node.js berjalan terus-menerus, folder `data/` persisten
>   selama instance tidak di-restart/redeploy), atau
> - Ganti backend storage dengan database sungguhan (MongoDB Atlas, Supabase, dll).
>   Ini di luar cakupan proyek dasar ini, tapi struktur kode (`readDb`/`writeDb` di
>   `server.js`) sudah dipisah agar mudah diganti.

---

## ☁️ Panduan Deployment

### Opsi A — Deploy ke **Render** (Direkomendasikan, paling sederhana & data lebih persisten)

1. Push project ini ke repository GitHub.
2. Buka [render.com](https://render.com) → **New** → **Web Service**.
3. Hubungkan repository GitHub kamu.
4. Isi konfigurasi:
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Environment**: Node
5. Tambahkan Environment Variable:
   - `OPENAI_API_KEY` = API key kamu
   - `OPENAI_MODEL` = `gemini-2.5-flash` (opsional)
   - `OPENAI_BASE_URL` = `https://generativelanguage.googleapis.com/v1beta/openai/`
6. Klik **Create Web Service**. Render akan otomatis build & jalankan aplikasi.
7. Setelah selesai, aplikasi bisa diakses melalui URL yang diberikan Render
   (contoh: `https://nama-app.onrender.com`).

---

### Opsi B — Deploy ke **Vercel**

1. Push project ke repository GitHub.
2. Install Vercel CLI (opsional) atau langsung via dashboard:
   ```bash
   npm install -g vercel
   ```
3. Login dan deploy:
   ```bash
   vercel login
   vercel
   ```
   Atau, via dashboard [vercel.com](https://vercel.com):
   - **New Project** → import repository GitHub kamu.
   - Vercel akan otomatis mendeteksi konfigurasi dari `vercel.json`.
4. Tambahkan Environment Variable di **Project Settings → Environment Variables**:
   - `OPENAI_API_KEY`
   - `OPENAI_MODEL` (opsional, default: gemini-2.5-flash)
   - `OPENAI_BASE_URL` = `https://generativelanguage.googleapis.com/v1beta/openai/`
5. Klik **Deploy**. Setelah selesai, aplikasi dapat diakses melalui domain `*.vercel.app`.

> File `vercel.json` sudah disertakan agar `server.js` dijalankan sebagai
> Serverless Function dan menangani seluruh route (`/`, `/api/*`, file statis).

---

### Opsi C — Deploy ke **Netlify**

1. Push project ke repository GitHub.
2. Buka [app.netlify.com](https://app.netlify.com) → **Add new site** → **Import an existing project**.
3. Pilih repository GitHub kamu.
4. Konfigurasi build:
   - **Build command**: `npm install`
   - **Publish directory**: `.`
   - **Functions directory**: `netlify/functions` (otomatis terbaca dari `netlify.toml`)
5. Tambahkan Environment Variable di **Site settings → Environment variables**:
   - `OPENAI_API_KEY`
   - `OPENAI_MODEL` (opsional, default: gemini-2.5-flash)
   - `OPENAI_BASE_URL` = `https://generativelanguage.googleapis.com/v1beta/openai/`
6. Klik **Deploy site**.

> Proyek ini sudah menyertakan `netlify.toml` dan `netlify/functions/api.js`
> yang membungkus Express app menggunakan `serverless-http`, sehingga seluruh
> endpoint `/api/*` otomatis berjalan sebagai Netlify Function.

---

## 🔒 Keamanan & Catatan Tambahan

- Ini adalah proyek pembelajaran (tugas kuliah) — sistem login **tidak menggunakan password**
  dan tidak cocok untuk data sensitif atau produksi skala besar.
- Selalu simpan `OPENAI_API_KEY` di file `.env` (sudah masuk `.gitignore`) — **jangan pernah**
  di-commit ke repository publik.
- Untuk kebutuhan produksi nyata, tambahkan validasi input lebih ketat, rate limiting,
  serta autentikasi yang lebih aman.

---

## 📝 Lisensi

Proyek ini bebas digunakan dan dimodifikasi untuk keperluan belajar/tugas kuliah.
