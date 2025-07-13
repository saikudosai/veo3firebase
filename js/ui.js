// js/ui.js
// Modul ini bertanggung jawab untuk semua manipulasi DOM dan interaksi UI
// yang bersifat umum dan tidak terikat pada fitur spesifik.
// Ditambahkan elemen loadingScreen.

// --- UI ELEMENTS CACHE ---
export const elements = {
    loadingScreen: document.getElementById('loadingScreen'), // <-- TAMBAHAN
    mainContent: document.querySelector('main'),
    authScreen: document.getElementById('authScreen'),
    authForm: document.getElementById('authForm'),
    authSubmitBtn: document.getElementById('authSubmitBtn'),
    authSwitchBtn: document.getElementById('authSwitchBtn'),
    authSwitchPrompt: document.getElementById('authSwitchPrompt'),
    authEmailInput: document.getElementById('authEmail'),
    authPasswordInput: document.getElementById('authPassword'),
    authError: document.getElementById('authError'),
    googleSignInBtn: document.getElementById('googleSignInBtn'),
    userAuthSection: document.getElementById('user-auth-section'),
    navMenuBtn: document.getElementById('navMenuBtn'),
    navDropdown: document.getElementById('navDropdown'),
    modalContainer: document.getElementById('modal-container'),
    coinCount: document.getElementById('coinCount'),
    noCoinsNotification: document.getElementById('noCoinsNotification'),
    generateBtn: document.getElementById('generateBtn'),
    describeSubjectBtn: document.getElementById('describeSubjectBtn'),
    describePlaceBtn: document.getElementById('describePlaceBtn'),
    createCharacterBtn: document.getElementById('createCharacterBtn'),
    saveCharacterBtn: document.getElementById('saveCharacterBtn'),
    loadCharacterBtn: document.getElementById('loadCharacterBtn'),
    singleSceneBtn: document.getElementById('singleSceneBtn'),
    conversationSceneBtn: document.getElementById('conversationSceneBtn'),
    singleSceneModeContainer: document.getElementById('singleSceneModeContainer'),
    conversationSceneModeContainer: document.getElementById('conversationSceneModeContainer'),
    inputs: {
        subjek: document.getElementById('subjek'),
        aksi: document.getElementById('aksi'),
        ekspresi: document.getElementById('ekspresi'),
        tempat: document.getElementById('tempat'),
        waktu: document.getElementById('waktu'),
        sudutKamera: document.getElementById('sudutKamera'),
        kamera: document.getElementById('kamera'),
        pencahayaan: document.getElementById('pencahayaan'),
        style: document.getElementById('style'),
        suasana: document.getElementById('suasana'),
        backsound: document.getElementById('backsound'),
        kalimat: document.getElementById('kalimat'),
        detail: document.getElementById('detail'),
        sceneInteraction: document.getElementById('sceneInteraction')
    },
    imagePreview: document.getElementById('imagePreview'),
    imageUploadIcon: document.getElementById('imageUploadIcon'),
};

export function showCopyFeedback(button, text = 'Berhasil Disalin!') {
    const originalText = button.textContent;
    button.textContent = text;
    button.classList.add('bg-green-600', 'hover:bg-green-700');
    button.classList.remove('bg-indigo-600', 'hover:bg-indigo-700');

    setTimeout(() => {
        button.textContent = originalText;
        button.classList.remove('bg-green-600', 'hover:bg-green-700');
        button.classList.add('bg-indigo-600', 'hover:bg-indigo-700');
    }, 2000);
}

export function copyText(textarea, button) {
    const promptText = textarea.value.trim();
    if (!promptText) return;

    if (navigator.clipboard) {
        navigator.clipboard.writeText(promptText)
            .then(() => showCopyFeedback(button))
            .catch(() => fallbackCopyText(textarea, button));
    } else {
        fallbackCopyText(textarea, button);
    }
}

function fallbackCopyText(textarea, button) {
    textarea.select();
    textarea.setSelectionRange(0, 99999);
    try {
        document.execCommand('copy');
        showCopyFeedback(button);
    } catch (err) {
        console.error('Fallback: Gagal menyalin', err);
        alert('Gagal menyalin teks.');
    }
}

export function openInGemini(textarea, button) {
    const promptText = textarea.value.trim();
    const geminiUrl = `https://gemini.google.com/app`;

    if (promptText) {
        copyText(textarea, button);
    }
    window.open(geminiUrl, '_blank');
}

export function setActionsDisabled(disabled) {
    const actionButtons = [
        elements.generateBtn, elements.describeSubjectBtn, elements.describePlaceBtn,
        elements.createCharacterBtn, elements.saveCharacterBtn, elements.loadCharacterBtn
    ];
    actionButtons.forEach(btn => {
        if (btn) btn.disabled = disabled;
    });
}

export function showNoCoinsNotification() {
    if (elements.noCoinsNotification) {
        elements.noCoinsNotification.classList.remove('hidden');
        setTimeout(() => {
            elements.noCoinsNotification.classList.add('hidden');
        }, 3000);
    }
}

export function updateCoinDisplay(coinAmount) {
    if (elements.coinCount) {
        elements.coinCount.textContent = coinAmount;
    }
}

export function updateUserAvatarInHeader(user) {
    if (!user || !elements.userAuthSection) return;

    const avatarSrc = user.photoURL || `https://placehold.co/32x32/4A5568/E2E8F0?text=${(user.email || 'U').charAt(0).toUpperCase()}`;

    let avatarBtn = document.getElementById('avatarBtn');
    if (!avatarBtn) {
        elements.userAuthSection.innerHTML = `
            <button id="avatarBtn" title="Lihat Profil" class="focus:outline-none">
                <img src="${avatarSrc}" alt="Avatar" class="w-8 h-8 rounded-full border-2 border-gray-600 hover:border-indigo-500 transition">
            </button>
        `;
    } else {
        const img = avatarBtn.querySelector('img');
        if (img) img.src = avatarSrc;
    }
}

// --- PERUBAHAN: Fungsi diperbarui untuk menangani loading screen ---
export function showMainContent() {
    if (elements.loadingScreen) elements.loadingScreen.classList.add('hidden');
    if (elements.mainContent) elements.mainContent.classList.remove('hidden');
    if (elements.authScreen) elements.authScreen.classList.add('hidden');
}

export function showAuthScreen() {
    if (elements.loadingScreen) elements.loadingScreen.classList.add('hidden');
    if (elements.mainContent) elements.mainContent.classList.add('hidden');
    if (elements.authScreen) elements.authScreen.classList.remove('hidden');
    if (elements.userAuthSection) elements.userAuthSection.innerHTML = '';
}
// --- AKHIR PERUBAHAN ---

export async function openModal(htmlFile, initFunction, ...args) {
    try {
        const response = await fetch(htmlFile);
        if (!response.ok) throw new Error(`Gagal memuat ${htmlFile} (status: ${response.status})`);
        const modalHTMLText = await response.text();

        if (!modalHTMLText) throw new Error(`File ${htmlFile} kosong.`);

        elements.modalContainer.innerHTML = modalHTMLText;
        elements.modalContainer.classList.remove('hidden');

        requestAnimationFrame(() => {
            if (typeof initFunction === 'function') {
                initFunction(...args);
            } else {
                console.error(`Fungsi inisialisasi untuk ${htmlFile} tidak ditemukan.`);
            }
        });

    } catch (error) {
        console.error(`Error membuka modal dari ${htmlFile}:`, error);
        alert(`Gagal membuka halaman: ${error.message}`);
        elements.modalContainer.innerHTML = '';
        elements.modalContainer.classList.add('hidden');
    }
}