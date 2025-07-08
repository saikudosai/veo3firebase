// js/firebase.js
// File ini bertanggung jawab untuk inisialisasi Firebase
// dan mengekspor instance layanan yang akan digunakan di seluruh aplikasi.
// Diperbarui untuk Firebase v9 (modular).

// Impor fungsi yang diperlukan dari Firebase SDK v9
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";
import { getFunctions } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-functions.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-storage.js";


// --- FIREBASE SETUP ---
// Ganti dengan konfigurasi Firebase proyek Anda
const firebaseConfig = {
    apiKey: "AIzaSyBTZy4IWjw9OLNo9UaDzSxTDe5f2ojHcVs",
    authDomain: "veo3fire-app.firebaseapp.com",
    projectId: "veo3fire-app",
    storageBucket: "veo3fire-app.firebasestorage.app",
    messagingSenderId: "802935715216",
    appId: "1:802935715216:web:10298676bb5ae35d2d6f15"
};

// Inisialisasi aplikasi Firebase
const app = initializeApp(firebaseConfig);

// Ekspor instance layanan Firebase untuk digunakan di modul lain
export const db = getFirestore(app);
export const functions = getFunctions(app, 'US-CENTRAL1'); // Contoh jika Anda perlu menentukan region
export const auth = getAuth(app);
export const storage = getStorage(app);