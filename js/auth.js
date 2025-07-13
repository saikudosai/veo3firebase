// js/auth.js
// Modul ini mengelola semua logika yang berkaitan dengan otentikasi pengguna.
// Diperbarui untuk menangani loading screen dan menjalankan callback.

import { auth, db } from './firebase.js';
import { onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";
import { state, setCurrentUser, updateUserCoins } from './store.js';
import { elements, updateUserAvatarInHeader, showMainContent, showAuthScreen } from './ui.js';

/**
 * Menginisialisasi listener status otentikasi Firebase.
 * @param {Function} onUserChange - Callback yang dijalankan saat status pengguna berubah.
 */
export function initAuth(onUserChange) {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            setCurrentUser(user);
            
            const docSnap = await getDoc(state.userDocRef);

            if (docSnap.exists()) {
                const userData = docSnap.data();
                const initialCoins = userData.coins !== undefined ? userData.coins : 5;
                state.coins = initialCoins;
                
                await updateDoc(state.userDocRef, {
                    lastLogin: serverTimestamp(),
                    displayName: user.displayName,
                    photoURL: user.photoURL,
                    coins: initialCoins
                });
            } else {
                state.coins = 50;
                await setDoc(state.userDocRef, {
                    email: user.email,
                    displayName: user.displayName,
                    photoURL: user.photoURL,
                    createdAt: serverTimestamp(),
                    lastLogin: serverTimestamp(),
                    coins: state.coins
                });
            }
            
            await updateUserCoins(state.coins);
            updateUserAvatarInHeader(user);
            showMainContent(); // Menyembunyikan loader dan menampilkan menu utama

        } else {
            setCurrentUser(null);
            showAuthScreen(); // Menyembunyikan loader dan menampilkan layar login
        }

        if (typeof onUserChange === 'function') {
            onUserChange(user);
        }
    });
}

/**
 * Mengganti mode antara Login dan Daftar.
 */
export function toggleAuthMode() {
    state.isLoginMode = !state.isLoginMode;
    elements.authSubmitBtn.textContent = state.isLoginMode ? 'Login' : 'Daftar';
    elements.authSwitchPrompt.textContent = state.isLoginMode ? 'Belum punya akun?' : 'Sudah punya akun?';
    elements.authSwitchBtn.textContent = state.isLoginMode ? 'Daftar' : 'Login';
    elements.authForm.reset();
    elements.authError.classList.add('hidden');
}

/**
 * Menangani proses login/daftar dengan email dan password.
 */
export async function handleEmailAuth(e) {
    e.preventDefault();
    const email = elements.authEmailInput.value;
    const password = elements.authPasswordInput.value;
    elements.authSubmitBtn.disabled = true;
    elements.authError.classList.add('hidden');

    try {
        if (state.isLoginMode) {
            await signInWithEmailAndPassword(auth, email, password);
        } else {
            await createUserWithEmailAndPassword(auth, email, password);
        }
    } catch (error) {
        elements.authError.textContent = error.message;
        elements.authError.classList.remove('hidden');
    } finally {
        elements.authSubmitBtn.disabled = false;
    }
}

/**
 * Menangani proses login dengan Google.
 */
export async function signInWithGoogle() {
    const provider = new GoogleAuthProvider();
    try {
        await signInWithPopup(auth, provider);
    } catch (error) {
        elements.authError.textContent = error.message;
        elements.authError.classList.remove('hidden');
    }
}

/**
 * Melakukan logout pengguna saat ini.
 */
export async function logout() {
    try {
        await signOut(auth);
    } catch (error) {
        console.error("Error logging out:", error);
        alert("Gagal untuk logout.");
    }
}