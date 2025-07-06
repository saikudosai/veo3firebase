// functions/index.js (Fixed for ESLint)

// Menggunakan require untuk mengimpor modul di lingkungan Node.js
const functions = require("firebase-functions/v2");
const { onCall } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const fetch = require("node-fetch");

// Definisikan secret untuk API Key Gemini Anda
const geminiApiKey = defineSecret("GEMINI_API_KEY");

// Ekspor Cloud Function Anda
exports.callGeminiAPI = onCall({ secrets: [geminiApiKey] }, async (request) => {
  // Data yang dikirim dari frontend ada di `request.data`
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
      // Melemparkan error yang bisa ditangkap oleh frontend
      throw new functions.https.HttpsError(
          "internal",
          `Google API error: ${googleResponse.statusText}`,
          errorBody,
      );
    }

    const data = await googleResponse.json();
    return data; // Kirim kembali data yang berhasil ke frontend
  } catch (error) {
    console.error("Internal Server Error:", error);
    // Melemparkan error umum jika terjadi masalah lain
    throw new functions.https.HttpsError(
        "internal",
        "Terjadi kesalahan internal di server.",
    );
  }
});
