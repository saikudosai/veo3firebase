// js/scene.js
// Modul ini mengelola logika yang berkaitan dengan mode adegan (scene),
// seperti beralih antara mode tunggal dan percakapan, serta mengelola dialog.

import { state } from './store.js';
import { elements } from './ui.js';
// Fungsi populateCharacterModal akan diimpor di main.js dan dipanggil dari sana
// untuk menghindari circular dependency.

/**
 * Beralih antara mode 'single' dan 'conversation'.
 * @param {string} mode - Mode yang diinginkan ('single' atau 'conversation').
 */
export function switchSceneMode(mode) {
    state.currentSceneMode = mode;
    const {
        singleSceneModeContainer,
        conversationSceneModeContainer,
        singleSceneBtn,
        conversationSceneBtn,
        inputs
    } = elements;

    if (mode === 'single') {
        singleSceneModeContainer.classList.remove('hidden');
        conversationSceneModeContainer.classList.add('hidden');
        singleSceneBtn.classList.replace('bg-gray-600', 'bg-indigo-600');
        conversationSceneBtn.classList.replace('bg-indigo-600', 'bg-gray-600');
        inputs.kalimat.parentElement.classList.remove('hidden');
    } else if (mode === 'conversation') {
        singleSceneModeContainer.classList.add('hidden');
        conversationSceneModeContainer.classList.remove('hidden');
        conversationSceneBtn.classList.replace('bg-gray-600', 'bg-indigo-600');
        singleSceneBtn.classList.replace('bg-indigo-600', 'bg-gray-600');
        inputs.kalimat.parentElement.classList.add('hidden');
        renderDialogueEditor(); // Pastikan editor dialog dirender saat beralih
    }
}

/**
 * Merender daftar karakter yang dipilih untuk adegan percakapan.
 */
export function renderSceneCharacters() {
    const sceneCharactersList = document.getElementById('sceneCharactersList');
    if (!sceneCharactersList) return;

    sceneCharactersList.innerHTML = '';
    if (state.selectedCharacters.length === 0) {
        sceneCharactersList.innerHTML = '<p class="text-sm text-gray-400">Belum ada karakter yang ditambahkan.</p>';
        return;
    }
    state.selectedCharacters.forEach(char => {
        const charEl = document.createElement('div');
        charEl.className = 'flex items-center justify-between bg-gray-700 px-3 py-2 rounded-lg';
        charEl.textContent = char.name;
        sceneCharactersList.appendChild(charEl);
    });
}

/**
 * Merender editor dialog berdasarkan karakter dan baris dialog saat ini.
 */
export function renderDialogueEditor() {
    const dialogueEditor = document.getElementById('dialogueEditor');
    if (!dialogueEditor) return;

    dialogueEditor.innerHTML = '';
    if (state.selectedCharacters.length === 0) {
        dialogueEditor.innerHTML = '<p class="text-sm text-gray-400 text-center">Tambah karakter untuk memulai dialog.</p>';
        return;
    }

    state.dialogueLines.forEach((dialogue, index) => {
        const lineEl = document.createElement('div');
        lineEl.className = 'grid grid-cols-1 md:grid-cols-3 gap-2 items-center mb-4 p-2 border border-gray-700 rounded-lg';

        // Speaker dropdown
        const speakerSelect = document.createElement('select');
        speakerSelect.className = 'bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full p-2.5';
        speakerSelect.innerHTML = `<option value="">Pilih Pembicara...</option>`;
        state.selectedCharacters.forEach(char => {
            const option = document.createElement('option');
            option.value = char.name;
            option.textContent = char.name;
            if (dialogue.speaker === char.name) option.selected = true;
            speakerSelect.appendChild(option);
        });
        speakerSelect.onchange = (e) => { state.dialogueLines[index].speaker = e.target.value; };

        // Dialogue input
        const lineInput = document.createElement('input');
        lineInput.type = 'text';
        lineInput.value = dialogue.line;
        lineInput.placeholder = 'Dialog...';
        lineInput.className = 'md:col-span-2 bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full p-2.5';
        lineInput.oninput = (e) => { state.dialogueLines[index].line = e.target.value; };

        // Tone input and Delete button container
        const actionContainer = document.createElement('div');
        actionContainer.className = 'md:col-span-3 grid grid-cols-3 gap-2 mt-2';
        
        const toneInput = document.createElement('input');
        toneInput.type = 'text';
        toneInput.value = dialogue.tone;
        toneInput.placeholder = 'Nada/Ekspresi (opsional)...';
        toneInput.className = 'col-span-2 bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full p-2.5';
        toneInput.oninput = (e) => { state.dialogueLines[index].tone = e.target.value; };

        const deleteBtn = document.createElement('button');
        deleteBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clip-rule="evenodd" />
            </svg>
        `;
        deleteBtn.className = 'col-span-1 text-white bg-red-600 hover:bg-red-700 font-medium rounded-lg text-sm px-4 py-2 text-center flex justify-center items-center';
        deleteBtn.onclick = () => removeDialogueLine(index);

        actionContainer.appendChild(toneInput);
        actionContainer.appendChild(deleteBtn);
        
        lineEl.appendChild(speakerSelect);
        lineEl.appendChild(lineInput);
        lineEl.appendChild(actionContainer);
        dialogueEditor.appendChild(lineEl);
    });
}

/**
 * Menambahkan baris dialog baru ke state dan merender ulang editor.
 */
export function addDialogueLine() {
    state.dialogueLines.push({ speaker: '', line: '', tone: '' });
    renderDialogueEditor();
}

/**
 * Menghapus baris dialog dari state dan merender ulang editor.
 * @param {number} index - Indeks baris dialog yang akan dihapus.
 */
function removeDialogueLine(index) {
    state.dialogueLines.splice(index, 1);
    renderDialogueEditor();
}
