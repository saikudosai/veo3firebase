// js/modals.js
// Perbaikan: Menambahkan 'export' pada fungsi initNotificationModal.

import { db, auth, storage, functions } from './firebase.js';
import {
    doc, getDoc, setDoc, updateDoc, deleteDoc, serverTimestamp,
    collection, query, getDocs, orderBy, writeBatch
} from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";
import { ref, uploadBytesResumable, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-storage.js";
import { httpsCallable } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-functions.js";
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
    const purchaseCharacter = httpsCallable(functions, 'purchaseCharacter');
    const voteOnCharacter = httpsCallable(functions, 'voteOnCharacter');

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
        
        const currentUserId = auth.currentUser.uid;

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
            
            const statsContainer = document.createElement('div');
            statsContainer.className = 'flex items-center justify-start space-x-4 text-xs text-gray-400 mb-3 mt-auto pt-3 border-t border-gray-600';

            const likeButton = document.createElement('button');
            const dislikeButton = document.createElement('button');
            const likeCountSpan = document.createElement('span');
            const dislikeCountSpan = document.createElement('span');
            const copyCountSpan = document.createElement('span');
            
            const updateUI = () => {
                likeCountSpan.textContent = char.likeCount || 0;
                dislikeCountSpan.textContent = char.dislikeCount || 0;
                copyCountSpan.textContent = char.copyCount || 0;

                const userHasLiked = char.likes && char.likes[currentUserId];
                const userHasDisliked = char.dislikes && char.dislikes[currentUserId];
                
                likeButton.classList.toggle('text-green-400', userHasLiked);
                likeButton.classList.toggle('text-gray-400', !userHasLiked);
                dislikeButton.classList.toggle('text-red-400', userHasDisliked);
                dislikeButton.classList.toggle('text-gray-400', !userHasDisliked);
            };

            likeButton.innerHTML = `<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333V19a1 1 0 001 1h8.158c.94 0 1.764-.663 1.93-1.578l1.458-5.83A2 2 0 0016.5 9h-2.29a2 2 0 00-1.921 1.447L11.5 13.5v-3.333a2 2 0 00-2-2H6z"/></svg>`;
            dislikeButton.innerHTML = `<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M18 9.5a1.5 1.5 0 11-3 0v-6a1.5 1.5 0 013 0v6zM14 9.667V1a1 1 0 00-1-1H4.842A1.933 1.933 0 003.07 2.578l-1.458 5.83A2 2 0 003.5 11h2.29a2 2 0 001.92-1.447L8.5 6.5v3.333a2 2 0 002 2H14z"/></svg>`;
            
            likeButton.title = "Suka";
            dislikeButton.title = "Tidak Suka";
            
            likeButton.className = 'flex items-center space-x-1 hover:text-green-300 transition-colors';
            dislikeButton.className = 'flex items-center space-x-1 hover:text-red-300 transition-colors';
            
            likeButton.appendChild(likeCountSpan);
            dislikeButton.appendChild(dislikeCountSpan);

            const copyContainer = document.createElement('div');
            copyContainer.className = 'flex items-center space-x-1';
            copyContainer.innerHTML = `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>`;
            copyContainer.appendChild(copyCountSpan);
            
            copyContainer.title = "Jumlah disalin";
            
            statsContainer.append(likeButton, dislikeButton, copyContainer);
            updateUI();

            const handleVote = async (voteType) => {
                likeButton.disabled = true;
                dislikeButton.disabled = true;
                try {
                    await voteOnCharacter({ globalCharId: char.id, voteType: voteType });
                    const updatedCharDoc = await getDoc(doc(db, "globalCharacters", char.id));
                    if (updatedCharDoc.exists()) {
                        Object.assign(char, updatedCharDoc.data());
                        updateUI();
                    }
                } catch (e) {
                    console.error(`Gagal melakukan ${voteType}:`, e);
                    alert(`Gagal menyimpan pilihan: ${e.message}`);
                } finally {
                    likeButton.disabled = false;
                    dislikeButton.disabled = false;
                }
            };

            likeButton.onclick = () => handleVote('like');
            dislikeButton.onclick = () => handleVote('dislike');

            const actionBtn = document.createElement('button');
            actionBtn.textContent = 'Tambah ke Koleksi (20 Koin)';
            actionBtn.className = 'w-full mt-2 text-white bg-indigo-600 hover:bg-indigo-700 font-medium rounded-lg text-sm px-4 py-2 text-center transition-colors';
            
            actionBtn.onclick = async () => {
                if (char.ownerId === auth.currentUser.uid) {
                    alert("Anda tidak bisa menambahkan karakter milik sendiri."); return;
                }
                if (!confirm(`Tambahkan "${char.name}" ke koleksi Anda dengan biaya 20 koin?`)) {
                    return;
                }
                actionBtn.disabled = true;
                actionBtn.textContent = 'Memproses...';
                try {
                    const result = await purchaseCharacter({ globalCharId: char.id });
                    await updateUserCoins(state.coins - 20);
                    char.copyCount = (char.copyCount || 0) + 1;
                    updateUI();
                    alert(result.data.message || 'Karakter berhasil ditambahkan!');
                } catch (error) {
                    console.error("Error purchasing character:", error);
                    alert(`Gagal: ${error.message}`);
                } finally {
                    actionBtn.disabled = false;
                    actionBtn.textContent = 'Tambah ke Koleksi (20 Koin)';
                }
            };
            
            card.append(imageContainer, name, owner, description, statsContainer, actionBtn);
            grid.appendChild(card);
        });
        container.appendChild(grid);
    };

    const fetchAndRenderGlobalCharacters = async () => {
        try {
            const q = query(collection(db, 'globalCharacters'), orderBy("sharedAt", "desc"));
            const snapshot = await getDocs(q);
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

// --- FUNGSI BARU UNTUK MODAL TOP UP ---
export function initTopUpModal() {
    const createTopUpTransaction = httpsCallable(functions, 'createTopUpTransaction');
    const optionsContainer = document.getElementById('topup-options-container');
    const topUpButtons = document.querySelectorAll('.topup-option-btn');

    topUpButtons.forEach(button => {
        button.addEventListener('click', async () => {
            const amount = parseInt(button.dataset.amount, 10);
            const coins = parseInt(button.dataset.coins, 10);
            const orderId = `${state.currentUser.uid}-${Date.now()}`;

            topUpButtons.forEach(btn => btn.disabled = true);
            button.textContent = 'Memproses...';

            try {
                const result = await createTopUpTransaction({
                    orderId: orderId,
                    amount: amount,
                    coins: coins
                });

                const transactionToken = result.data.token;
                optionsContainer.classList.add('hidden');

                window.snap.pay(transactionToken, {
                    onSuccess: async function(result){
                      alert("Pembayaran sukses!"); console.log(result);
                      await updateUserCoins(state.coins + coins);
                      closeModal();
                    },
                    onPending: function(result){
                      alert("Menunggu pembayaran Anda!"); console.log(result);
                      closeModal();
                    },
                    onError: function(result){
                      alert("Pembayaran gagal!"); console.log(result);
                      closeModal();
                    },
                    onClose: function(){
                      console.log('Anda menutup popup tanpa menyelesaikan pembayaran');
                      optionsContainer.classList.remove('hidden');
                      topUpButtons.forEach(btn => btn.disabled = false);
                      button.innerHTML = `<span class="text-2xl font-bold text-yellow-400">${coins.toLocaleString('id-ID')} Koin</span> <span class="text-base font-semibold text-gray-300">Rp ${amount.toLocaleString('id-ID')}</span>`;
                    }
                });

            } catch (error) {
                console.error("Gagal membuat transaksi:", error);
                alert(`Gagal memulai transaksi: ${error.message}`);
                topUpButtons.forEach(btn => btn.disabled = false);
                button.innerHTML = `<span class="text-2xl font-bold text-yellow-400">${coins.toLocaleString('id-ID')} Koin</span> <span class="text-base font-semibold text-gray-300">Rp ${amount.toLocaleString('id-ID')}</span>`;
            }
        });
    });
}

// --- FUNGSI BARU UNTUK MODAL NOTIFIKASI ---
export async function initNotificationModal() {
    const container = document.getElementById('notifications-list-container');
    if (!container) return;

    container.innerHTML = '<p class="text-center text-gray-400">Memuat notifikasi...</p>';

    const user = auth.currentUser;
    if (!user) {
        container.innerHTML = '<p class="text-center text-gray-400">Anda harus login untuk melihat notifikasi.</p>';
        return;
    }

    const notifCollection = collection(db, 'users', user.uid, 'notifications');
    const q = query(notifCollection, orderBy("timestamp", "desc"));

    try {
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            container.innerHTML = '<p class="text-center text-gray-400">Tidak ada notifikasi.</p>';
            return;
        }

        container.innerHTML = '';
        const unreadNotifs = [];

        snapshot.docs.forEach(docSnap => {
            const notif = docSnap.data();
            const li = document.createElement('li');
            li.className = `p-3 border-b border-gray-700 flex items-start space-x-3 list-none ${!notif.isRead ? 'bg-indigo-900/30' : ''}`;
            
            const iconContainer = document.createElement('div');
            iconContainer.className = 'flex-shrink-0 h-10 w-10 rounded-full bg-gray-600 flex items-center justify-center text-xl';
            
            switch (notif.type) {
                case 'CHARACTER_COPY':
                    iconContainer.innerHTML = '👥';
                    break;
                case 'VOTE_LIKE':
                    iconContainer.innerHTML = '👍';
                    break;
                case 'VOTE_DISLIKE':
                    iconContainer.innerHTML = '👎';
                    break;
                case 'TRANSACTION_SUCCESS':
                    iconContainer.innerHTML = '💰';
                    break;
                default:
                    iconContainer.innerHTML = '🔔';
            }

            const textContainer = document.createElement('div');
            const messageP = document.createElement('p');
            messageP.className = 'text-sm text-gray-200';
            messageP.textContent = notif.message;
            
            const timeP = document.createElement('p');
            timeP.className = 'text-xs text-gray-500 mt-1';
            timeP.textContent = notif.timestamp ? new Date(notif.timestamp.toDate()).toLocaleString('id-ID') : 'Baru saja';

            textContainer.append(messageP, timeP);
            li.append(iconContainer, textContainer);
            container.appendChild(li);

            if (!notif.isRead) {
                unreadNotifs.push(docSnap.ref);
            }
        });

        if (unreadNotifs.length > 0) {
            const batch = writeBatch(db);
            unreadNotifs.forEach(ref => {
                batch.update(ref, { isRead: true });
            });
            await batch.commit();
        }

    } catch (error) {
        console.error("Gagal mengambil notifikasi:", error);
        container.innerHTML = '<p class="text-center text-red-400">Gagal memuat notifikasi.</p>';
    }
}