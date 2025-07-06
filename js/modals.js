// js/modals.js
// File ini berisi semua fungsi untuk inisialisasi dan manajemen modal.
// Semua kode di sini telah diperbarui ke sintaks Firebase v9.

import { db, auth, storage, functions } from './firebase.js'; // --- PERBAIKAN: Impor 'functions'
import {
    doc, getDoc, setDoc, updateDoc, deleteDoc, serverTimestamp,
    collection, query, getDocs, orderBy
} from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";
import { ref, uploadBytesResumable, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-storage.js";
import { httpsCallable } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-functions.js"; // --- PERBAIKAN: Impor 'httpsCallable'
import { updateProfile, sendPasswordResetEmail, signOut } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";
import { compressImage } from './utils.js';
import { state, updateUserCoins } from './store.js';

// --- Helper Umum ---
export const closeModal = () => {
    const modalContainer = document.getElementById('modal-container');
    if (modalContainer) {
        modalContainer.innerHTML = '';
        modalContainer.classList.add('hidden');
    }
};

// --- Modal Profil ---
export function initProfileModal() {
    // ... (kode fungsi initProfileModal Anda yang sudah ada, tidak perlu diubah)
    const user = state.currentUser;
    if (!user) return;
    
    const profileLogoutBtn = document.getElementById('profileLogoutBtn');
    const changeNameBtn = document.getElementById('changeNameBtn');
    const photoUploadInput = document.getElementById('photoUpload');
    const resetPasswordBtn = document.getElementById('resetPasswordBtn');
    const displayNameInput = document.getElementById('displayNameInput');
    const profileAvatar = document.getElementById('profileAvatar');
    const profileEmail = document.getElementById('profileEmail');
    const profileCoinCount = document.getElementById('profileCoinCount');
    const profileCharacterCount = document.getElementById('profileCharacterCount');
    const profileMessage = document.getElementById('profileMessage');
    const profileAvatarContainer = profileAvatar.parentElement;

    const showProfileMessage = (message, isError = false) => {
        if (!profileMessage) return;
        profileMessage.textContent = message;
        profileMessage.className = `p-2 rounded-md text-white text-sm transition-transform duration-300 ${isError ? 'bg-red-600' : 'bg-green-600'}`;
        profileMessage.style.transform = 'translateY(0)';
        setTimeout(() => {
            profileMessage.style.transform = 'translateY(150%)';
        }, 3000);
    };

    profileAvatar.src = user.photoURL || `https://placehold.co/96x96/4A5568/E2E8F0?text=${user.email.charAt(0).toUpperCase()}`;
    displayNameInput.value = user.displayName || '';
    profileEmail.textContent = user.email;

    const handleChangeName = async () => {
        const newName = displayNameInput.value.trim();
        if (newName === user.displayName || !newName) return;
        changeNameBtn.disabled = true;
        changeNameBtn.textContent = '...';
        try {
            await updateProfile(auth.currentUser, { displayName: newName });
            await updateDoc(doc(db, 'users', user.uid), { displayName: newName });
            showProfileMessage('Nama berhasil diperbarui!');
            document.dispatchEvent(new Event('userProfileUpdated'));
        } catch (error) {
            showProfileMessage(`Gagal: ${error.message}`, true);
        } finally {
            changeNameBtn.disabled = false;
            changeNameBtn.textContent = 'Simpan';
        }
    };

    const handleChangePhoto = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const loadingOverlay = document.createElement('div');
        loadingOverlay.className = 'absolute inset-0 bg-black bg-opacity-75 flex flex-col items-center justify-center rounded-full';
        loadingOverlay.innerHTML = `<div class="w-12 h-12 border-4 border-t-4 border-t-indigo-500 border-gray-600 rounded-full animate-spin"></div><p id="uploadProgressText" class="text-white text-xs mt-2 font-semibold">0%</p>`;
        profileAvatarContainer.appendChild(loadingOverlay);
        const progressText = document.getElementById('uploadProgressText');

        try {
            const compressedFile = await compressImage(file);
            const storageRef = ref(storage, `avatars/${user.uid}/${compressedFile.name}`);
            const uploadTask = uploadBytesResumable(storageRef, compressedFile);

            uploadTask.on('state_changed',
                (snapshot) => {
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    if (progressText) progressText.textContent = `Unggah ${Math.round(progress)}%`;
                },
                (error) => {
                    showProfileMessage(`Upload gagal: ${error.code}`, true);
                    loadingOverlay.remove();
                },
                async () => {
                    const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                    await updateProfile(auth.currentUser, { photoURL: downloadURL });
                    await updateDoc(doc(db, 'users', user.uid), { photoURL: downloadURL });
                    profileAvatar.src = downloadURL;
                    showProfileMessage('Foto profil berhasil diperbarui!');
                    document.dispatchEvent(new Event('userProfileUpdated'));
                    loadingOverlay.remove();
                }
            );
        } catch (error) {
            showProfileMessage('Gagal mengompres gambar.', true);
            loadingOverlay.remove();
        }
    };

    const handleResetPassword = () => {
        if (!user.email) return;
        resetPasswordBtn.disabled = true;
        sendPasswordResetEmail(auth, user.email)
            .then(() => {
                showProfileMessage('Email untuk reset password telah dikirim.');
                resetPasswordBtn.textContent = 'Email Terkirim';
            })
            .catch((error) => {
                showProfileMessage(`Gagal: ${error.message}`, true);
                resetPasswordBtn.disabled = false;
            });
    };
    
    profileLogoutBtn.addEventListener('click', () => signOut(auth).then(closeModal));
    changeNameBtn.addEventListener('click', handleChangeName);
    photoUploadInput.addEventListener('change', handleChangePhoto);
    resetPasswordBtn.addEventListener('click', handleResetPassword);

    getDoc(doc(db, 'users', user.uid)).then(docSnap => {
        if (docSnap.exists()) {
            profileCoinCount.textContent = docSnap.data().coins || '0';
        }
    });
    getDocs(collection(db, 'users', user.uid, 'characters')).then(snapshot => {
        profileCharacterCount.textContent = snapshot.size;
    });
}


// --- Modal Koleksi Karakter Milik Pengguna ---
export function initCharactersModal() {
    // ... (kode fungsi initCharactersModal Anda yang sudah ada, tidak perlu diubah)
    const handleCharacterPhotoUpload = async (e, charName, imgElement, imageContainer) => {
        const file = e.target.files[0];
        if (!file) return;

        const loadingOverlay = document.createElement('div');
        loadingOverlay.className = 'absolute inset-0 bg-black bg-opacity-75 flex flex-col items-center justify-center';
        loadingOverlay.innerHTML = `<div class="w-10 h-10 border-4 border-t-4 border-t-indigo-500 border-gray-600 rounded-full animate-spin"></div><p id="progress-${charName.replace(/\s+/g, '-')}" class="text-white text-xs mt-2 font-semibold">0%</p>`;
        imageContainer.appendChild(loadingOverlay);
        const progressText = document.getElementById(`progress-${charName.replace(/\s+/g, '-')}`);

        try {
            const compressedFile = await compressImage(file);
            const storageRef = ref(storage, `characters/${auth.currentUser.uid}/${charName}/${compressedFile.name}`);
            const uploadTask = uploadBytesResumable(storageRef, compressedFile);

            uploadTask.on('state_changed',
                (snapshot) => {
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    if (progressText) progressText.textContent = `Unggah ${Math.round(progress)}%`;
                },
                (error) => {
                    alert(`Gagal mengunggah gambar: ${error.message}`);
                    loadingOverlay.remove();
                },
                async () => {
                    const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                    const charDocRef = doc(db, 'users', auth.currentUser.uid, 'characters', charName);
                    await updateDoc(charDocRef, { illustrationUrl: downloadURL });
                    imgElement.src = downloadURL;
                    loadingOverlay.remove();
                }
            );
        } catch (error) {
            alert('Gagal mengompres gambar.');
            loadingOverlay.remove();
        }
    };

    const renderCharacters = (characters) => {
        const container = document.getElementById('character-collection-container');
        if (!container) {
            console.error("Elemen 'character-collection-container' tidak ditemukan saat merender karakter.");
            return;
        }

        container.innerHTML = '';
        if (characters.length === 0) {
            container.innerHTML = '<p class="text-center text-gray-400">Anda belum memiliki karakter tersimpan.</p>';
            return;
        }
        const grid = document.createElement('div');
        grid.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4';
        characters.forEach(char => {
            const card = document.createElement('div');
            card.className = 'bg-gray-700/50 p-4 rounded-lg flex flex-col border border-gray-600';
            
            const imageContainer = document.createElement('div');
            imageContainer.className = 'relative group w-full h-48 mb-4 bg-gray-900 rounded-md overflow-hidden';
            const imgElement = document.createElement('img');
            imgElement.src = char.illustrationUrl || 'https://placehold.co/300x300/1F2937/9CA3AF?text=No+Image';
            imgElement.className = 'w-full h-full object-cover transition-transform duration-300 group-hover:scale-110';
            const uploadLabel = document.createElement('label');
            uploadLabel.htmlFor = `upload-${char.name.replace(/\s+/g, '-')}`;
            uploadLabel.className = 'absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 text-white text-sm font-semibold cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity';
            uploadLabel.textContent = 'Ganti Foto';
            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.id = `upload-${char.name.replace(/\s+/g, '-')}`;
            fileInput.className = 'hidden';
            fileInput.accept = 'image/*';
            fileInput.addEventListener('change', (e) => handleCharacterPhotoUpload(e, char.name, imgElement, imageContainer));
            imageContainer.append(imgElement, uploadLabel, fileInput);

            const name = document.createElement('h3');
            name.className = 'font-bold text-lg text-white mb-2 truncate';
            name.textContent = char.name;
            
            const description = document.createElement('p');
            description.className = 'text-sm text-gray-400 flex-grow mb-4';
            description.textContent = char.description.substring(0, 100) + (char.description.length > 100 ? '...' : '');

            const buttonGroup = document.createElement('div');
            buttonGroup.className = 'flex flex-col space-y-2';
            const topButtonGroup = document.createElement('div');
            topButtonGroup.className = 'flex space-x-2';
            const loadBtn = document.createElement('button');
            loadBtn.textContent = 'Muat';
            loadBtn.className = 'flex-1 text-white bg-indigo-600 hover:bg-indigo-700 font-medium rounded-lg text-sm px-4 py-2 text-center';
            loadBtn.onclick = () => {
                document.getElementById('subjek').value = char.description;
                document.dispatchEvent(new CustomEvent('characterLoaded'));
                closeModal();
            };
            const deleteBtn = document.createElement('button');
            deleteBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z"/><path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z"/></svg>`;
            deleteBtn.className = 'p-2 text-white bg-red-600 hover:bg-red-700 font-medium rounded-lg';
            deleteBtn.onclick = async () => {
                if (confirm(`Yakin ingin menghapus "${char.name}"?`)) {
                    await deleteDoc(doc(db, 'users', auth.currentUser.uid, 'characters', char.name));
                    fetchAndRenderCharacters();
                }
            };
            topButtonGroup.append(loadBtn, deleteBtn);

            const shareBtn = document.createElement('button');
            shareBtn.textContent = 'Bagikan ke Global';
            shareBtn.className = 'w-full text-white bg-teal-600 hover:bg-teal-700 font-medium rounded-lg text-sm px-4 py-2';
            shareBtn.onclick = async () => {
                if (confirm(`Bagikan karakter "${char.name}" ke koleksi global?`)) {
                    const globalCharData = {
                        ...char,
                        ownerId: auth.currentUser.uid,
                        ownerName: auth.currentUser.displayName || 'Anonim',
                        sharedAt: serverTimestamp()
                    };
                    const globalDocId = `${char.name.replace(/\s+/g, '_')}_${auth.currentUser.uid}`;
                    await setDoc(doc(db, 'globalCharacters', globalDocId), globalCharData);
                    alert('Karakter berhasil dibagikan!');
                }
            };

            buttonGroup.append(topButtonGroup, shareBtn);
            card.append(imageContainer, name, description, buttonGroup);
            grid.appendChild(card);
        });
        container.appendChild(grid);
    };

    const fetchAndRenderCharacters = async () => {
        const charactersCollectionRef = collection(db, 'users', auth.currentUser.uid, 'characters');
        const q = query(charactersCollectionRef, orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);
        const characters = snapshot.docs.map(doc => doc.data());
        renderCharacters(characters);
    };

    fetchAndRenderCharacters();
}


// --- Modal Koleksi Karakter Global ---
export function initGlobalCharactersModal() {
    
    // --- PERBAIKAN: Definisikan Cloud Function yang bisa dipanggil ---
    const purchaseCharacter = httpsCallable(functions, 'purchaseCharacter');

    const renderGlobalCharacters = (characters) => {
        const container = document.getElementById('global-character-collection-container');
        if (!container) return;

        container.innerHTML = '';
        if (characters.length === 0) {
            container.innerHTML = '<p class="text-center text-gray-400">Belum ada karakter global.</p>';
            return;
        }
        const grid = document.createElement('div');
        grid.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4';
        
        characters.forEach(char => {
            const card = document.createElement('div');
            card.className = 'bg-gray-700/50 p-4 rounded-lg flex flex-col border border-gray-600';
            const imageContainer = document.createElement('div');
            imageContainer.className = 'w-full h-48 mb-4 bg-gray-900 rounded-md overflow-hidden';
            const imgElement = document.createElement('img');
            imgElement.src = char.illustrationUrl || 'https://placehold.co/300x300/1F2937/9CA3AF?text=No+Image';
            imgElement.className = 'w-full h-full object-cover';
            imageContainer.appendChild(imgElement);

            const name = document.createElement('h3');
            name.className = 'font-bold text-lg text-white truncate';
            name.textContent = char.name;

            const owner = document.createElement('p');
            owner.className = 'text-xs text-indigo-400 mb-2';
            owner.textContent = `Oleh: ${char.ownerName || 'Anonim'}`;

            const description = document.createElement('p');
            description.className = 'text-sm text-gray-400 flex-grow mb-4';
            description.textContent = char.description.substring(0, 80) + (char.description.length > 80 ? '...' : '');
            
            const actionBtn = document.createElement('button');
            actionBtn.textContent = 'Tambah ke Koleksi (20 Koin)';
            actionBtn.className = 'w-full mt-auto text-white bg-indigo-600 hover:bg-indigo-700 font-medium rounded-lg text-sm px-4 py-2 text-center transition-colors';
            
            // --- PERBAIKAN: Logika baru untuk memanggil Cloud Function ---
            actionBtn.onclick = async () => {
                if (char.ownerId === auth.currentUser.uid) {
                    alert("Anda tidak bisa menambahkan karakter milik sendiri.");
                    return;
                }
                if (!confirm(`Tambahkan "${char.name}" ke koleksi Anda dengan biaya 20 koin?`)) {
                    return;
                }

                actionBtn.disabled = true;
                actionBtn.textContent = 'Memproses...';

                try {
                    const result = await purchaseCharacter({ globalCharId: char.id });
                    
                    // Kurangi koin di UI secara langsung untuk respons cepat
                    await updateUserCoins(state.coins - 20);
                    
                    alert(result.data.message || 'Karakter berhasil ditambahkan!');
                
                } catch (error) {
                    console.error("Error purchasing character:", error);
                    // Menampilkan pesan error yang lebih informatif dari Cloud Function
                    alert(`Gagal: ${error.message}`);
                } finally {
                    actionBtn.disabled = false;
                    actionBtn.textContent = 'Tambah ke Koleksi (20 Koin)';
                }
            };
            
            card.append(imageContainer, name, owner, description, actionBtn);
            grid.appendChild(card);
        });
        container.appendChild(grid);
    };

    const fetchAndRenderGlobalCharacters = async () => {
        try {
            const q = query(collection(db, 'globalCharacters'), orderBy("sharedAt", "desc"));
            const snapshot = await getDocs(q);
            // --- PERBAIKAN: Sertakan ID dokumen saat memetakan data ---
            const characters = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderGlobalCharacters(characters);
        } catch (error) {
            console.error("Error fetching global characters:", error);
            const container = document.getElementById('global-character-collection-container');
            if(container) {
                container.innerHTML = `<p class="text-red-400">Gagal memuat koleksi global. Error: ${error.message}</p>`;
            }
        }
    };

    fetchAndRenderGlobalCharacters();
}