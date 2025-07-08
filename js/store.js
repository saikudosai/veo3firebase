// js/store.js
// Modul ini berfungsi sebagai "single source of truth" untuk state global aplikasi.
// Diperbarui untuk Firebase v9 (modular).

import { db } from './firebase.js';
import { doc, updateDoc, collection } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";
// --- PERBAIKAN: Impor elemen UI dan fungsi UI yang dibutuhkan ---
import { updateCoinDisplay, elements, setActionsDisabled } from './ui.js';

// Objek state untuk menyimpan data global
export const state = {
    currentUser: null,
    userDocRef: null,
    charactersCollection: null,
    coins: 0,
    isLoginMode: true,
    isWaitingForAdReward: false,
    adOpenedTime: null,
    singleUploadedImageData: null,
    characterImageData: { face: null, clothing: null, accessories: null },
    currentSceneMode: 'single',
    selectedCharacters: [],
    dialogueLines: []
};

/**
 * Mengatur state pengguna saat ini.
 * @param {object|null} user - Objek pengguna dari Firebase Auth, atau null.
 */
export function setCurrentUser(user) {
    state.currentUser = user;
    if (user) {
        state.userDocRef = doc(db, 'users', user.uid);
        state.charactersCollection = collection(state.userDocRef, 'characters');
    } else {
        state.userDocRef = null;
        state.charactersCollection = null;
        state.coins = 0;
    }
    updateButtonState();
}

/**
 * Mengupdate jumlah koin di state dan Firestore.
 * @param {number} newCoinValue - Jumlah koin yang baru.
 */
export async function updateUserCoins(newCoinValue) {
    if (!state.userDocRef) return;
    state.coins = newCoinValue;
    try {
        await updateDoc(state.userDocRef, { coins: newCoinValue });
    } catch (error) {
        console.error("Gagal update koin di Firestore:", error);
    }
    updateCoinDisplay(state.coins);
    updateButtonState();
}

/**
 * Mengatur data gambar yang diunggah untuk scene tunggal.
 * @param {object|null} data - Objek data gambar atau null.
 */
export function setSingleUploadedImageData(data) {
    state.singleUploadedImageData = data;
    updateButtonState();
}

/**
 * Mengatur data gambar yang diunggah untuk pembuatan karakter.
 * @param {string} type - Tipe gambar ('face', 'clothing', 'accessories').
 * @param {object|null} data - Objek data gambar atau null.
 */
export function setCharacterImageData(type, data) {
    state.characterImageData[type] = data;
    updateButtonState();
}

/**
 * Memperbarui status tombol berdasarkan state aplikasi saat ini.
 * Logika ini sekarang berada di store.js untuk akses langsung ke state.
 */
export function updateButtonState() {
    if (!state.currentUser) {
        setActionsDisabled(true);
        return;
    }

    setActionsDisabled(false);

    if (elements.generateBtn) {
        elements.generateBtn.disabled = state.coins < 1;
        elements.generateBtn.textContent = (state.coins < 1) ? 'Koin Habis' : 'Generate Prompt';
    }

    if (elements.createCharacterBtn) {
        if (state.coins < 3) {
            elements.createCharacterBtn.textContent = 'Koin Kurang (Butuh 3)';
            elements.createCharacterBtn.disabled = true;
        } else {
            elements.createCharacterBtn.textContent = 'Buat Karakter & Isi Subjek';
            elements.createCharacterBtn.disabled = !state.characterImageData.face;
        }
    }

    if (elements.describeSubjectBtn) {
        elements.describeSubjectBtn.disabled = !state.singleUploadedImageData;
    }
    if (elements.describePlaceBtn) {
        elements.describePlaceBtn.disabled = !state.singleUploadedImageData;
    }
}
