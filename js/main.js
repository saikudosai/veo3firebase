// js/main.js
// Perbaikan: Menambahkan deklarasi variabel untuk notificationBtn.

// --- IMPOR MODUL ---
import { auth, db } from './firebase.js';
import { handleApiInteraction, callApiWithFirebase } from './api.js';
import { elements, copyText, openInGemini, updateUserAvatarInHeader, openModal } from './ui.js';
import { state, setCurrentUser, updateUserCoins, setSingleUploadedImageData, updateButtonState } from './store.js';
import { initAuth, toggleAuthMode, handleEmailAuth, signInWithGoogle, logout } from './auth.js';
import { handleCharacterImageUpload, createCharacterDescription, saveCharacter } from './character.js';
import { switchSceneMode, renderSceneCharacters, renderDialogueEditor, addDialogueLine } from './scene.js';
import { createAndTranslatePrompt } from './prompt.js';
import { query, orderBy, getDocs, doc, deleteDoc, collection, where, onSnapshot } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";
import { compressImage } from './utils.js';
import { initProfileModal, initCharactersModal, initGlobalCharactersModal, closeModal, initTopUpModal, initNotificationModal } from './modals.js';

// --- FUNGSI BARU UNTUK MEMANTAU NOTIFIKASI ---
let unsubscribeNotifications = null;
function listenForNotifications(user) {
    if (unsubscribeNotifications) {
        unsubscribeNotifications(); // Hentikan listener lama jika ada
    }

    const notificationBadge = document.getElementById('notificationBadge');
    if (!user) {
        if (notificationBadge) notificationBadge.classList.add('hidden');
        return;
    }
    
    const notifRef = collection(db, 'users', user.uid, 'notifications');
    const q = query(notifRef, where("isRead", "==", false));

    unsubscribeNotifications = onSnapshot(q, (snapshot) => {
        if (notificationBadge) {
            notificationBadge.classList.toggle('hidden', snapshot.empty);
        }
    }, (error) => {
        console.error("Gagal memantau notifikasi:", error);
    });
}

// --- EVENT LISTENER UTAMA ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("Aplikasi Dimulai!");
    initAuth(listenForNotifications);
    setupAuthEventListeners();
    setupNavEventListeners();
    setupCoinEventListeners();
    setupPromptEventListeners();
    setupImageUploadEventListeners();
    setupSceneEventListeners();
    setupCharacterEventListeners();
    setupGlobalModalEventListeners();
    switchSceneMode('single');
    renderDialogueEditor();
    updateButtonState();
});


// --- FUNGSI SETUP EVENT LISTENER ---
function setupAuthEventListeners() {
    if (elements.googleSignInBtn) elements.googleSignInBtn.addEventListener('click', signInWithGoogle);
    if (elements.authSwitchBtn) elements.authSwitchBtn.addEventListener('click', toggleAuthMode);
    if (elements.authForm) elements.authForm.addEventListener('submit', handleEmailAuth);
}

function setupNavEventListeners() {
    const navMenuBtn = document.getElementById('navMenuBtn');
    const navDropdown = document.getElementById('navDropdown');
    const logoutBtnInMenu = document.getElementById('logoutBtn');
    const profileBtnInMenu = document.getElementById('profileBtnInMenu');
    const charactersBtnInMenu = document.getElementById('koleksicharactersBtnInMenu');
    const globalCharactersBtnInMenu = document.getElementById('globalCharactersBtnInMenu');
    const guideBtnInMenu = document.getElementById('guideBtnInMenu');
    const notificationBtn = document.getElementById('notificationBtn'); // --- PERBAIKAN: Baris ini ditambahkan ---

    if (navMenuBtn) {
        navMenuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            navDropdown.classList.toggle('hidden');
        });
    }

    window.addEventListener('click', (e) => {
        if (navDropdown && !navDropdown.classList.contains('hidden')) {
            if (!navMenuBtn.contains(e.target) && !navDropdown.contains(e.target)) {
                navDropdown.classList.add('hidden');
            }
        }
    });

    if (logoutBtnInMenu) logoutBtnInMenu.addEventListener('click', logout);
    
    document.body.addEventListener('click', (e) => {
        const avatarBtn = e.target.closest('#avatarBtn');
        if (avatarBtn) {
            if (!state.currentUser) { alert("Anda harus login."); return; }
            openModal('profil.html', initProfileModal);
        }
    });

    if (profileBtnInMenu) profileBtnInMenu.addEventListener('click', () => {
        if (!state.currentUser) { alert("Anda harus login."); return; }
        openModal('profil.html', initProfileModal);
    });
    
    if (charactersBtnInMenu) charactersBtnInMenu.addEventListener('click', () => {
        if (!state.currentUser) { alert("Anda harus login."); return; }
        openModal('koleksi-characters.html', initCharactersModal);
    });
    
    if (globalCharactersBtnInMenu) globalCharactersBtnInMenu.addEventListener('click', () => {
        if (!state.currentUser) { alert("Anda harus login."); return; }
        openModal('global-characters.html', initGlobalCharactersModal);
    });

    if (guideBtnInMenu) guideBtnInMenu.addEventListener('click', () => {
        const guideModal = document.getElementById('guideModal');
        if(guideModal) guideModal.classList.remove('hidden');
    });

    // Event listener untuk tombol lonceng notifikasi
    if(notificationBtn) notificationBtn.addEventListener('click', () => {
        if (!state.currentUser) { alert("Anda harus login untuk melihat notifikasi."); return; }
        openModal('notifications.html', initNotificationModal);
    });
}

function setupCoinEventListeners() {
    const topUpBtn = document.getElementById('addCoinBtn'); 
    if (topUpBtn) {
        topUpBtn.title = "Top Up Koin";
        topUpBtn.innerHTML = `+`;

        topUpBtn.addEventListener('click', () => {
            if (!state.currentUser) {
                alert("Anda harus login untuk melakukan top up.");
                return;
            }
            openModal('topup.html', initTopUpModal);
        });
    }
}

// ... (Sisa kode dari setupPromptEventListeners hingga akhir tidak berubah)
function setupPromptEventListeners() {
    if (elements.generateBtn) elements.generateBtn.addEventListener('click', createAndTranslatePrompt);

    const copyBtnId = document.getElementById('copyBtnId');
    const copyBtnEn = document.getElementById('copyBtnEn');
    const openGeminiIdBtn = document.getElementById('openGeminiIdBtn');
    const openGeminiEnBtn = document.getElementById('openGeminiEnBtn');
    const promptIndonesia = document.getElementById('promptIndonesia');
    const promptEnglish = document.getElementById('promptEnglish');

    if (copyBtnId) copyBtnId.addEventListener('click', () => copyText(promptIndonesia, copyBtnId));
    if (copyBtnEn) copyBtnEn.addEventListener('click', () => copyText(promptEnglish, copyBtnEn));
    if (openGeminiIdBtn) openGeminiIdBtn.addEventListener('click', () => openInGemini(promptIndonesia, openGeminiIdBtn));
    if (openGeminiEnBtn) openGeminiEnBtn.addEventListener('click', () => openInGemini(promptEnglish, openGeminiEnBtn));
}

function setupImageUploadEventListeners() {
    const imageUploadInput = document.getElementById('imageUploadInput');
    if (imageUploadInput) {
        imageUploadInput.addEventListener('change', handleSingleImageUpload);
    }
    if (elements.describeSubjectBtn) {
        elements.describeSubjectBtn.addEventListener('click', () => describeSingleImage('subject'));
    }
    if (elements.describePlaceBtn) {
        elements.describePlaceBtn.addEventListener('click', () => describeSingleImage('place'));
    }
    
    const imageUploadContainer = document.getElementById('imageUploadContainer');
    if (imageUploadContainer) {
        setupDragAndDrop(imageUploadContainer.parentElement, imageUploadInput, handleSingleImageUpload);
    }
}

function setupSceneEventListeners() {
    if (elements.singleSceneBtn) elements.singleSceneBtn.addEventListener('click', () => switchSceneMode('single'));
    if (elements.conversationSceneBtn) elements.conversationSceneBtn.addEventListener('click', () => switchSceneMode('conversation'));

    const addSceneCharacterBtn = document.getElementById('addSceneCharacterBtn');
    if (addSceneCharacterBtn) addSceneCharacterBtn.addEventListener('click', () => populateCharacterModal('conversation'));

    const addDialogueLineBtn = document.getElementById('addDialogueLineBtn');
    if (addDialogueLineBtn) addDialogueLineBtn.addEventListener('click', addDialogueLine);
}

function setupCharacterEventListeners() {
    if (elements.saveCharacterBtn) elements.saveCharacterBtn.addEventListener('click', saveCharacter);
    if (elements.loadCharacterBtn) elements.loadCharacterBtn.addEventListener('click', () => populateCharacterModal('single'));
    if (elements.createCharacterBtn) elements.createCharacterBtn.addEventListener('click', createCharacterDescription);

    const characterUploads = {
        face: { input: document.getElementById('input-face'), container: document.getElementById('upload-container-face') },
        clothing: { input: document.getElementById('input-clothing'), container: document.getElementById('upload-container-clothing') },
        accessories: { input: document.getElementById('input-accessories'), container: document.getElementById('upload-container-accessories') }
    };

    Object.keys(characterUploads).forEach(type => {
        const { input, container } = characterUploads[type];
        if (input && container) {
            input.addEventListener('change', (e) => handleCharacterImageUpload(e, type));
            setupDragAndDrop(container, input, (e) => handleCharacterImageUpload(e, type));
        }
    });
    
    const openCharacterCreatorBtn = document.getElementById('openCharacterCreatorBtn');
    if (openCharacterCreatorBtn) {
        openCharacterCreatorBtn.addEventListener('click', () => {
            const characterCreatorModal = document.getElementById('characterCreatorModal');
            if (characterCreatorModal) {
                characterCreatorModal.classList.remove('hidden');
            }
        });
    }
}

function setupGlobalModalEventListeners() {
    const modalContainer = document.getElementById('modal-container');

    modalContainer.addEventListener('click', (e) => {
        if (e.target.closest('.close-modal-btn') || e.target === modalContainer) {
            closeModal();
        }
    });
    
    document.addEventListener('characterLoaded', () => {
        switchSceneMode('single');
    });

    const staticModals = ['guideModal', 'characterCreatorModal', 'loadCharacterModal'];
    staticModals.forEach(modalId => {
        const modal = document.getElementById(modalId);
        if (modal) {
            const closeBtn = modal.querySelector('.close-modal-btn');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => {
                    modal.classList.add('hidden');
                });
            }
        }
    });
}


async function handleSingleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    const compressedFile = await compressImage(file);
    const reader = new FileReader();
    reader.onload = (e) => {
        elements.imagePreview.src = e.target.result;
        elements.imagePreview.classList.remove('hidden');
        elements.imageUploadIcon.classList.add('hidden');
        const imageData = { type: compressedFile.type, data: e.target.result.split(',')[1] };
        setSingleUploadedImageData(imageData);
    };
    reader.readAsDataURL(compressedFile);
}

function describeSingleImage(type) {
    if (!state.singleUploadedImageData) {
        alert("Silakan unggah gambar terlebih dahulu.");
        return;
    }
    const button = type === 'subject' ? elements.describeSubjectBtn : elements.describePlaceBtn;
    handleApiInteraction(button, 1, async () => {
        const instruction = type === 'subject'
            ? "Analisis secara spesifik hanya orang/subjek utama dalam gambar ini..."
            : "Anda adalah seorang prompt engineer. Analisis gambar ini...";
        const description = await callApiWithFirebase(instruction, [state.singleUploadedImageData]);
        const targetInput = type === 'subject' ? elements.inputs.subjek : elements.inputs.tempat;
        targetInput.value = description;
    });
}

function setupDragAndDrop(dropArea, fileInput, onFileDrop) {
    dropArea.addEventListener('dragover', (e) => { e.preventDefault(); dropArea.classList.add('border-indigo-500'); });
    dropArea.addEventListener('dragleave', (e) => { e.preventDefault(); dropArea.classList.remove('border-indigo-500'); });
    dropArea.addEventListener('drop', (e) => {
        e.preventDefault();
        dropArea.classList.remove('border-indigo-500');
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            fileInput.files = files;
            const changeEvent = new Event('change', { bubbles: true });
            fileInput.dispatchEvent(changeEvent);
        }
    });
}

async function populateCharacterModal(mode = 'single') {
    if (!state.charactersCollection) {
        alert("Silakan login untuk memuat karakter.");
        return;
    }
    const loadCharacterModal = document.getElementById('loadCharacterModal');
    const characterList = document.getElementById('characterList');
    if (!loadCharacterModal || !characterList) return;

    loadCharacterModal.classList.remove('hidden');
    characterList.innerHTML = '<p class="text-gray-400">Memuat karakter...</p>';

    try {
        const q = query(state.charactersCollection, orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        const characters = querySnapshot.docs.map(doc => doc.data());
        
        characterList.innerHTML = '';
        if (characters.length === 0) {
            characterList.innerHTML = '<p class="text-gray-400">Belum ada karakter.</p>';
        }

        if (mode === 'single') {
            characters.forEach((char) => {
                const charEl = document.createElement('div');
                charEl.className = 'flex justify-between items-center p-3 bg-gray-700 rounded-lg hover:bg-gray-600';
                const nameEl = document.createElement('span');
                nameEl.textContent = char.name;
                nameEl.className = 'cursor-pointer flex-grow';
                nameEl.onclick = () => {
                    elements.inputs.subjek.value = char.description;
                    loadCharacterModal.classList.add('hidden');
                };
                const deleteBtn = createDeleteButton(char.name, mode);
                charEl.appendChild(nameEl);
                charEl.appendChild(deleteBtn);
                characterList.appendChild(charEl);
            });
        } else {
            characters.forEach((char) => {
                const charEl = document.createElement('div');
                charEl.className = 'flex items-center p-3 bg-gray-700 rounded-lg';
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.id = `char-conv-${char.name.replace(/\s+/g, '-')}`;
                checkbox.value = char.name;
                checkbox.dataset.description = char.description;
                if (state.selectedCharacters.some(sc => sc.name === char.name)) checkbox.checked = true;
                checkbox.className = 'h-4 w-4 text-indigo-600 bg-gray-600 border-gray-500 rounded focus:ring-indigo-500';
                const label = document.createElement('label');
                label.htmlFor = checkbox.id;
                label.textContent = char.name;
                label.className = 'ml-3 block text-sm font-medium text-gray-300 cursor-pointer';
                charEl.appendChild(checkbox);
                charEl.appendChild(label);
                characterList.appendChild(charEl);
            });
            
            const existingFooter = loadCharacterModal.querySelector('.modal-footer');
            if (existingFooter) existingFooter.remove();

            const footer = document.createElement('div');
            footer.className = 'modal-footer mt-4 pt-4 border-t border-gray-700';
            const addButton = document.createElement('button');
            addButton.textContent = 'Tambahkan ke Adegan';
            addButton.className = 'w-full text-white bg-indigo-600 hover:bg-indigo-700 font-medium rounded-lg text-sm px-5 py-2.5 text-center transition-colors';
            addButton.onclick = () => {
                const selectedCheckboxes = characterList.querySelectorAll('input[type="checkbox"]:checked');
                state.selectedCharacters = Array.from(selectedCheckboxes).map(cb => ({
                    name: cb.value,
                    description: cb.dataset.description
                }));
                renderSceneCharacters();
                renderDialogueEditor();
                loadCharacterModal.classList.add('hidden');
            };
            footer.appendChild(addButton);
            loadCharacterModal.querySelector('.bg-gray-800').appendChild(footer);
        }

    } catch (error) {
        console.error("Error getting characters:", error);
        characterList.innerHTML = `<p class="text-red-400">Gagal memuat karakter.</p>`;
    }
}

function createDeleteButton(charName, mode) {
    const deleteBtn = document.createElement('button');
    deleteBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clip-rule="evenodd" /></svg>`;
    deleteBtn.className = 'text-gray-400 hover:text-white hover:bg-red-600 p-1 rounded-full';
    deleteBtn.onclick = async (e) => {
        e.stopPropagation();
        if (confirm(`Yakin ingin menghapus "${charName}"? Aksi ini tidak dapat dibatalkan.`)) {
            try {
                await deleteDoc(doc(state.charactersCollection, charName));
                populateCharacterModal(mode);
            } catch (err) {
                console.error("Gagal menghapus karakter:", err);
                alert("Gagal menghapus karakter.");
            }
        }
    };
    return deleteBtn;
}