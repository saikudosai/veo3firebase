// js/firebase.js
// File ini sekarang akan memilih konfigurasi secara dinamis
// antara lingkungan Produksi dan Development.

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";
import { getFunctions } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-functions.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-storage.js";

// Impor kedua file konfigurasi
import { firebaseConfig as prodConfig } from './firebase-config-prod.js';
import { firebaseConfig as devConfig } from './firebase-config-dev.js';

// --- PEMILIHAN KONFIGURASI OTOMATIS ---
// Periksa apakah hostname saat ini adalah URL produksi Anda
const isProduction = window.location.hostname === 'veo3fire-app.web.app';

// Pilih konfigurasi yang sesuai
const firebaseConfig = isProduction ? prodConfig : devConfig;

// Tampilkan di konsol untuk memastikan konfigurasi yang benar dimuat
console.log(`Mode aplikasi: ${isProduction ? 'Produksi' : 'Development'}`);

// Inisialisasi aplikasi Firebase dengan konfigurasi yang dipilih
const app = initializeApp(firebaseConfig);

// Ekspor instance layanan Firebase untuk digunakan di modul lain
export const db = getFirestore(app);
export const functions = getFunctions(app, 'us-central1'); // Pastikan region sudah benar
export const auth = getAuth(app);
export const storage = getStorage(app);