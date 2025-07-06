// js/character.js
// Modul ini berisi semua logika untuk manajemen karakter.
// Diperbarui untuk memastikan timestamp selalu ditambahkan.

import { handleApiInteraction, callApiWithFirebase } from './api.js';
import { state, updateUserCoins, setCharacterImageData } from './store.js';
import { elements } from './ui.js';
// --- PERBAIKAN: Impor 'serverTimestamp' ---
import { doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";
import { compressImage } from './utils.js';


export async function handleCharacterImageUpload(event, type) {
    const file = event.target.files[0];
    if (!file) return;

    const compressedFile = await compressImage(file);

    const reader = new FileReader();
    reader.onload = (e) => {
        const characterUploads = {
            face: { preview: document.getElementById('preview-face'), icon: document.getElementById('icon-face') },
            clothing: { preview: document.getElementById('preview-clothing'), icon: document.getElementById('icon-clothing') },
            accessories: { preview: document.getElementById('preview-accessories'), icon: document.getElementById('icon-accessories') }
        };

        characterUploads[type].preview.src = e.target.result;
        characterUploads[type].preview.classList.remove('hidden');
        characterUploads[type].icon.classList.add('hidden');
        
        const imageData = { type: compressedFile.type, data: e.target.result.split(',')[1] };
        setCharacterImageData(type, imageData);
    };
    reader.readAsDataURL(compressedFile);
}

export function createCharacterDescription() {
    if (!state.characterImageData.face) {
        alert("Silakan unggah foto Wajah terlebih dahulu.");
        return;
    }

    handleApiInteraction(elements.createCharacterBtn, 3, async () => {
        const characterName = prompt("Masukkan nama untuk karakter ini:", "Karakter Baru");
        if (!characterName) {
            await updateUserCoins(state.coins + 3);
            return;
        }

        const characterStyleSelect = document.getElementById('characterStyle');
        const selectedStyle = characterStyleSelect.value;
        
        const { mainInstruction, imageDataForApi } = buildCharacterCreationPrompt(selectedStyle);
        const resultText = await callApiWithFirebase(mainInstruction, imageDataForApi);

        try {
            const data = JSON.parse(resultText);
            const finalDescription = formatCharacterSheet(characterName, data);
            elements.inputs.subjek.value = finalDescription;
            
            // --- PENAMBAHAN KODE ---
            // Menampilkan notifikasi bahwa karakter berhasil dibuat.
            alert(`✨ Karakter "${characterName}" berhasil dibuat dan dimuat ke kolom Subjek!`);

            const characterCreatorModal = document.getElementById('characterCreatorModal');
            if(characterCreatorModal) characterCreatorModal.classList.add('hidden');

        } catch (e) {
            console.error("Gagal parsing JSON dari hasil AI:", resultText, e);
            throw new Error("Gagal membuat Character Sheet. Respons dari AI tidak valid.");
        }
    });
}

function buildCharacterCreationPrompt(selectedStyle) {
    let vibeInstruction, styleGuideline = "", clothingPrompt;
    if (selectedStyle === 'Fiksi') {
        vibeInstruction = `- "vibe": berikan deskripsi kesan atau "vibe" keseluruhan, dan tambahkan kata yang mengandung unsur fantasi (contoh: mystical, ethereal, otherworldly).`;
        clothingPrompt = `- "attire": deskripsikan pakaian secara detail. Pastikan deskripsi mengandung unsur fantasi (contoh: jubah ajaib, armor elf).`;
    } else {
        vibeInstruction = `- "vibe": berikan deskripsi kesan atau "vibe" keseluruhan, dan pastikan TIDAK ADA kata yang mengandung unsur fantasi (contoh: professional, casual, sporty).`;
        styleGuideline = `PENTING: Untuk semua deskripsi, gunakan gaya bahasa yang harfiah, objektif, dan apa adanya seperti laporan identifikasi. Hindari penggunaan metafora, perumpamaan, atau bahasa puitis.`;
        clothingPrompt = `- "attire": deskripsikan pakaian atau busana secara detail.`;
    }

    const imageDataForApi = [];
    let imageContextText = "Analisis gambar-gambar berikut:\n";
    if (state.characterImageData.face) {
        imageContextText += "1. Gambar Wajah Karakter.\n";
        imageDataForApi.push(state.characterImageData.face);
    }
    if (state.characterImageData.clothing) {
        imageContextText += "2. Gambar Pakaian Karakter.\n";
        imageDataForApi.push(state.characterImageData.clothing);
    }
    if (state.characterImageData.accessories) {
        imageContextText += "3. Gambar Aksesori Karakter.\n";
        imageDataForApi.push(state.characterImageData.accessories);
    }

    const mainInstruction = `Berdasarkan gambar-gambar yang diberikan (${imageContextText.trim()}), analisis dan kembalikan sebuah objek JSON tunggal. Balas HANYA dengan objek JSON, tanpa teks atau format lain.\n${styleGuideline}\nObjek JSON harus memiliki semua kunci berikut: "identity", "demeanor", "vibe", "face_shape", "eyes", "nose", "lips", "hair", "skin", "facial_hair", "attire", "accessory".\n- "identity": berikan deskripsi yang berisi jenis kelamin, perkiraan usia, dan asal negara/etnis (Contoh: "Seorang pria berusia 25 tahun dari Korea").\n- "face_shape": berikan deskripsi yang mencakup bentuk wajah secara keseluruhan (oval, bulat, dll.), dahi, bentuk pipi, garis rahang, dan dagu.\n- "eyes": berikan deskripsi yang mencakup warna mata (jika warnanya tidak alami tambahkan imbuhan memakai kontak lensa), bentuk mata, ukuran mata, bentuk dan ketebalan alis, serta bulu mata.\n- "nose": berikan deskripsi yang mencakup Pangkal Hidung, Batang Hidung, Puncak Hidung, Lubang Hidung, Cuping Hidung.\n- "lips": berikan deskripsi yang mencakup ketebalan, bentuk bibir, Proporsi Bibir Atas dan Bawah, Bentuk (Cupid's Bow), Lebar Bibir, Bentuk Sudut Bibir, Definisi Garis Bibir.\n- "hair": berikan satu string tunggal yang merangkum semua detail rambut.\n- "skin": berikan deskripsi yang mencakup warna kulit (jika tidak alami, sebutkan sebagai 'dengan make up'). Sebutkan juga tanda khusus seperti tahi lalat atau lesung pipi.\n${clothingPrompt} Jawaban untuk "attire" harus berupa objek dengan kunci "top" dan "bottom".\n- "accessory": deskripsikan aksesori utama yang terlihat. Jika tidak ada, nilainya harus "none".\n${vibeInstruction}\n- Untuk kunci lainnya ("demeanor", "facial_hair"), berikan deskripsi yang sesuai.`;
    
    return { mainInstruction, imageDataForApi };
}

function formatCharacterSheet(characterName, data) {
    return `// MASTER PROMPT / CHARACTER SHEET: ${characterName} (v2.0)\n(\n    ${characterName.toLowerCase().replace(/ /g, '_')}:\n    identity: ${data.identity || 'not specified'}.\n    demeanor: ${data.demeanor || 'not specified'}.\n    vibe: ${data.vibe || 'not specified'}.\n\n    // --- Physical Appearance ---\n    face_shape: ${data.face_shape || 'not specified'}.\n    eyes: ${data.eyes || 'not specified'}.\n    nose: ${data.nose || 'not specified'}.\n    lips: ${data.lips || 'not specified'}.\n    hair: (${data.hair || 'not specified'}:1.2).\n    skin: ${data.skin || 'not specified'}.\n    facial_hair: (${data.facial_hair || 'none'}:1.5).\n\n    // --- Attire & Accessories ---\n    attire:\n        top: ${data.attire?.top || 'not specified'}.\n        bottom: ${data.attire?.bottom || 'not specified'}.\n    accessory: (${data.accessory || 'none'}:1.3).\n)`.trim();
}

/**
 * Menyimpan karakter saat ini ke Firestore.
 */
export async function saveCharacter() {
    if (!state.charactersCollection) {
        alert("Silakan login untuk menyimpan karakter.");
        return;
    }
    const subject = elements.inputs.subjek.value.trim();
    if (!subject) {
        alert("Kolom Subjek kosong, tidak ada yang bisa disimpan.");
        return;
    }

    let defaultName = "Karakter Baru";
    const nameMatch = subject.match(/\/\/\s*MASTER PROMPT\s*\/\s*CHARACTER SHEET:\s*(.*?)\s*\(v2.0\)/);
    if (nameMatch && nameMatch[1]) {
        defaultName = nameMatch[1].trim();
    }

    const characterName = prompt("Masukkan nama untuk karakter ini:", defaultName);
    if (!characterName) return;

    try {
        const characterDocRef = doc(state.charactersCollection, characterName);
        // --- PERBAIKAN: Tambahkan field 'createdAt' saat menyimpan ---
        await setDoc(characterDocRef, {
            name: characterName,
            description: subject,
            createdAt: serverTimestamp() // Ini akan menambahkan timestamp server
        });
        alert("Karakter berhasil disimpan!");
    } catch (error) {
        console.error("Error saving character:", error);
        alert("Gagal menyimpan karakter.");
    }
}