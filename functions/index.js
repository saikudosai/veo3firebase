// functions/index.js (Fixed for ESLint)

// Menggunakan require untuk mengimpor modul di lingkungan Node.js
const functions = require("firebase-functions/v2");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const fetch = require("node-fetch");
// --- PENAMBAHAN KODE: Impor layanan Admin Firestore ---
const { getFirestore } = require("firebase-admin/firestore");
const { initializeApp } = require("firebase-admin/app");

// Inisialisasi Firebase Admin SDK
initializeApp();
const db = getFirestore();

// Definisikan secret untuk API Key Gemini Anda
const geminiApiKey = defineSecret("GEMINI_API_KEY");

// Ekspor Cloud Function Anda
exports.callGeminiAPI = onCall({ secrets: [geminiApiKey] }, async (request) => {
  // ... (kode fungsi callGeminiAPI Anda yang sudah ada, tidak perlu diubah)
  const payload = request.data;
  const model = "gemini-1.5-flash-latest";
  const apiKey = geminiApiKey.value();
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  try {
    const googleResponse = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!googleResponse.ok) {
      const errorBody = await googleResponse.text();
      console.error("Google API Error:", errorBody);
      throw new HttpsError(
          "internal",
          `Google API error: ${googleResponse.statusText}`,
          errorBody,
      );
    }
    const data = await googleResponse.json();
    return data;
  } catch (error) {
    console.error("Internal Server Error:", error);
    throw new HttpsError(
        "internal",
        "Terjadi kesalahan internal di server.",
    );
  }
});


// --- PENAMBAHAN KODE BARU DI BAWAH INI ---

/**
 * Cloud Function untuk menangani pembelian karakter dari koleksi global.
 */
exports.purchaseCharacter = onCall(async (request) => {
  const { globalCharId } = request.data;
  const currentUserId = request.auth?.uid;

  if (!currentUserId) {
    throw new HttpsError("unauthenticated", "Anda harus login untuk melakukan aksi ini.");
  }
  if (!globalCharId) {
    throw new HttpsError("invalid-argument", "ID karakter global tidak diberikan.");
  }

  const cost = 20;
  const reward = 15;

  const globalCharRef = db.collection("globalCharacters").doc(globalCharId);
  const currentUserRef = db.collection("users").doc(currentUserId);

  try {
    const result = await db.runTransaction(async (t) => {
      // 1. Ambil semua dokumen yang diperlukan dalam transaksi
      const globalCharDoc = await t.get(globalCharRef);
      if (!globalCharDoc.exists) {
        throw new HttpsError("not-found", "Karakter global tidak ditemukan.");
      }

      const currentUserDoc = await t.get(currentUserRef);
      if (!currentUserDoc.exists) {
        throw new HttpsError("not-found", "Data pengguna saat ini tidak ditemukan.");
      }
      
      const globalCharData = globalCharDoc.data();
      const currentUserData = currentUserDoc.data();
      const ownerId = globalCharData.ownerId;

      if (ownerId === currentUserId) {
          throw new HttpsError("failed-precondition", "Anda tidak bisa membeli karakter milik sendiri.");
      }
      if (currentUserData.coins < cost) {
          throw new HttpsError("failed-precondition", "Koin Anda tidak cukup.");
      }

      const userCharRef = db.collection("users").doc(currentUserId).collection("characters").doc(globalCharData.name);
      const userCharDoc = await t.get(userCharRef);
      if (userCharDoc.exists) {
        throw new HttpsError("already-exists", "Anda sudah memiliki karakter dengan nama ini.");
      }

      const ownerRef = db.collection("users").doc(ownerId);
      const ownerDoc = await t.get(ownerRef);

      // 2. Lakukan operasi tulis
      // A. Kurangi koin pembeli
      t.update(currentUserRef, { coins: currentUserData.coins - cost });

      // B. Tambah koin penjual (jika ada)
      if (ownerDoc.exists) {
        const ownerData = ownerDoc.data();
        t.update(ownerRef, { coins: (ownerData.coins || 0) + reward });
      }

      // C. Salin data karakter ke koleksi pribadi
      const newCharacterData = {
          name: globalCharData.name,
          description: globalCharData.description,
          illustrationUrl: globalCharData.illustrationUrl || null,
          createdAt: new Date() // Gunakan timestamp server
      };
      t.set(userCharRef, newCharacterData);
      
      return { success: true, message: `Karakter "${globalCharData.name}" berhasil ditambahkan!` };
    });
    return result;

  } catch (error) {
    console.error("Transaction failed:", error);
    // Jika error sudah HttpsError, lempar kembali. Jika tidak, buat yang baru.
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", "Gagal menyelesaikan transaksi.", error.message);
  }
});