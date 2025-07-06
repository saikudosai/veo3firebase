// js/utils.js
// File ini berisi fungsi-fungsi bantuan (utilities) yang bisa digunakan di seluruh aplikasi.
// Kita akan menaruh logika kompresi gambar di sini agar rapi dan bisa dipakai ulang.

// --- PERBAIKAN: Ubah URL untuk memuat file modul (.mjs) yang benar ---
import imageCompression from 'https://cdn.jsdelivr.net/npm/browser-image-compression@2.0.1/dist/browser-image-compression.mjs';

/**
 * Mengompres file gambar sebelum diunggah.
 * @param {File} file - File gambar asli yang dipilih pengguna.
 * @returns {Promise<File>} File gambar yang sudah dikompres.
 */
export async function compressImage(file) {
  // Opsi untuk kompresi, bisa disesuaikan
  const options = {
    maxSizeMB: 0.2,
    maxWidthOrHeight: 800,
    useWebWorker: true,
    initialQuality: 0.8
  };

  console.log(`Mengompres gambar: ${file.name}, ukuran asli: ${(file.size / 1024 / 1024).toFixed(2)} MB`);

  try {
    const compressedFile = await imageCompression(file, options);
    console.log(`Kompresi berhasil: ${compressedFile.name}, ukuran baru: ${(compressedFile.size / 1024 / 1024).toFixed(2)} MB`);
    
    return compressedFile;
  } catch (error) {
    console.error('Gagal mengompres gambar:', error);
    // Jika gagal, kembalikan file asli agar aplikasi tetap berjalan
    return file;
  }
}
