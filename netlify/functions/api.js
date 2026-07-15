/**
 * netlify/functions/api.js
 * Membungkus aplikasi Express (server.js) agar dapat berjalan
 * sebagai Netlify Function menggunakan library "serverless-http".
 *
 * Semua request ke /api/* akan diarahkan (redirect) ke function ini
 * melalui konfigurasi di netlify.toml.
 */

const serverless = require("serverless-http");
const app = require("../../server.js");

module.exports.handler = serverless(app);
