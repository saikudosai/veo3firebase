// js/api.js
// Modul ini mengelola semua panggilan ke API eksternal,
// dalam hal ini Firebase Cloud Function untuk Gemini.
// Diperbarui untuk Firebase v9 (modular).

import { functions } from './firebase.js';
// --- PERBAIKAN: Impor 'httpsCallable' sebagai fungsi terpisah dari SDK functions ---
import { httpsCallable } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-functions.js";
import { state, updateUserCoins } from './store.js';
import { setActionsDisabled, showNoCoinsNotification } from './ui.js';

// --- PERBAIKAN: Gunakan sintaks v9 yang benar untuk membuat fungsi yang dapat dipanggil ---
// Sintaks yang benar adalah httpsCallable(instance, namaFungsi)
const callGeminiCloudFunction = httpsCallable(functions, 'callGeminiAPI');

/**
 * Memanggil Cloud Function 'callGeminiAPI' dengan payload yang diberikan.
 * @param {string} instruction - Instruksi teks untuk API.
 * @param {Array} [imageDataArray=[]] - Array objek gambar (jika ada).
 * @returns {Promise<string>} Teks respons dari API.
 */
export async function callApiWithFirebase(instruction, imageDataArray = []) {
    const parts = [{ text: instruction }];
    (imageDataArray || []).forEach(imgData => {
        if (imgData && imgData.type && imgData.data) {
            parts.push({ inline_data: { mime_type: imgData.type, data: imgData.data } });
        }
    });

    const payload = { contents: [{ parts: parts }] };

    try {
        const result = await callGeminiCloudFunction(payload);
        const text = result?.data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
            return text.replace(/```json/g, '').replace(/```/g, '').trim();
        } else {
            console.error("Invalid response structure from Cloud Function", result);
            throw new Error("Struktur respons dari API tidak valid atau kosong.");
        }
    } catch (error) {
        console.error("Error calling Cloud Function:", error);
        throw new Error(`Error pada Cloud Function: ${error.message}`);
    }
}

/**
 * Wrapper untuk menangani interaksi API yang memerlukan biaya (koin).
 * Mengelola status UI, pengurangan koin, dan penanganan error.
 * @param {HTMLElement} button - Tombol yang memicu aksi.
 * @param {number} cost - Jumlah koin yang dibutuhkan.
 * @param {Function} apiFunction - Fungsi async yang melakukan panggilan API.
 */
export async function handleApiInteraction(button, cost, apiFunction) {
    if (state.coins < cost) {
        showNoCoinsNotification();
        return;
    }
    const originalButtonText = button.textContent;
    setActionsDisabled(true);
    button.textContent = 'Memproses...';

    const initialCoins = state.coins;
    await updateUserCoins(initialCoins - cost);

    try {
        await apiFunction();
    } catch (error) {
        console.error("API Interaction Error:", error);
        alert(`Terjadi kesalahan saat memproses permintaan. Detail: ${error.message}`);
        await updateUserCoins(initialCoins);
    } finally {
        setActionsDisabled(false);
        button.textContent = originalButtonText;
    }
}
