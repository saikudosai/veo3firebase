// js/prompt.js
// Modul ini berisi logika inti aplikasi: membuat prompt video
// berdasarkan input pengguna dan menerjemahkannya.

import { handleApiInteraction, callApiWithFirebase } from './api.js';
import { state } from './store.js';
import { elements } from './ui.js';

/**
 * Fungsi utama untuk membuat prompt dan menerjemahkannya.
 * Ini adalah wrapper yang menggunakan handleApiInteraction.
 */
export function createAndTranslatePrompt() {
    handleApiInteraction(elements.generateBtn, 1, async () => {
        const indonesianPrompt = generateIndonesianPrompt();
        const promptIndonesiaEl = document.getElementById('promptIndonesia');
        const promptEnglishEl = document.getElementById('promptEnglish');

        promptIndonesiaEl.value = indonesianPrompt;
        promptEnglishEl.value = 'Menerjemahkan...';

        if (!indonesianPrompt) {
            promptEnglishEl.value = '';
            return; // Jangan panggil API jika prompt kosong
        }

        const instruction = `Translate the following creative video prompt from Indonesian to English. Keep the structure and comma separation. Be concise and direct. Respond only with the translated prompt. Text to translate: "${indonesianPrompt}"`;
        promptEnglishEl.value = await callApiWithFirebase(instruction);
    });
}

/**
 * Membuat string prompt dalam Bahasa Indonesia berdasarkan mode scene dan input.
 * @returns {string} Prompt yang telah digabungkan.
 */
function generateIndonesianPrompt() {
    const { inputs } = elements;
    if (state.currentSceneMode === 'conversation') {
        return generateConversationPrompt(inputs);
    } else {
        return generateSingleScenePrompt(inputs);
    }
}

/**
 * Helper untuk membuat prompt untuk mode adegan tunggal.
 * @param {object} inputs - Objek yang berisi elemen-elemen input UI.
 * @returns {string} Prompt untuk adegan tunggal.
 */
function generateSingleScenePrompt(inputs) {
    const subjectValue = inputs.subjek.value.trim();

    // Jika menggunakan Character Sheet, formatnya berbeda
    if (subjectValue.includes('// MASTER PROMPT / CHARACTER SHEET')) {
        const promptParts = [
            inputs.style.value,
            inputs.sudutKamera.value,
            inputs.kamera.value,
            subjectValue,
            inputs.aksi.value.trim() ? `// --- Action/Scene ---\n${inputs.aksi.value.trim()}` : '',
            inputs.ekspresi.value.trim() ? `dengan ekspresi ${inputs.ekspresi.value.trim()}` : '',
            inputs.tempat.value.trim() ? `di ${inputs.tempat.value.trim()}` : '',
            inputs.waktu.value.trim() ? `saat ${inputs.waktu.value.trim()}` : '',
            inputs.pencahayaan.value.trim() ? `dengan pencahayaan ${inputs.pencahayaan.value.trim()}` : '',
            inputs.suasana.value.trim() ? `suasana ${inputs.suasana.value.trim()}` : '',
            inputs.backsound.value.trim() ? `dengan suara ${inputs.backsound.value.trim()}` : '',
            inputs.kalimat.value.trim() ? `mengucapkan kalimat: "${inputs.kalimat.value.trim()}"` : '',
            inputs.detail.value
        ];
        return promptParts.filter(part => part && part.trim()).join(',\n');
    }

    // Format prompt standar
    let sceneDescription = `sebuah adegan tentang ${subjectValue || 'seseorang'}`;
    const action = inputs.aksi.value.trim();
    const expression = inputs.ekspresi.value.trim();
    if (action && expression) {
        sceneDescription += ` yang sedang ${action} dengan ekspresi ${expression}`;
    } else if (action) {
        sceneDescription += ` yang sedang ${action}`;
    } else if (expression) {
        sceneDescription += ` dengan ekspresi ${expression}`;
    }
    if (inputs.tempat.value.trim()) sceneDescription += ` di ${inputs.tempat.value.trim()}`;
    if (inputs.waktu.value.trim()) sceneDescription += ` saat ${inputs.waktu.value.trim()}`;

    const promptParts = [
        inputs.style.value,
        inputs.sudutKamera.value,
        inputs.kamera.value,
        sceneDescription,
        inputs.pencahayaan.value.trim() ? `dengan pencahayaan ${inputs.pencahayaan.value.trim()}` : '',
        inputs.suasana.value.trim() ? `suasana ${inputs.suasana.value.trim()}` : '',
        inputs.backsound.value.trim() ? `dengan suara ${inputs.backsound.value.trim()}` : '',
        inputs.kalimat.value.trim() ? `mengucapkan kalimat: "${inputs.kalimat.value.trim()}"` : '',
        inputs.detail.value
    ];
    return promptParts.filter(part => part && part.trim()).join(', ');
}

/**
 * Helper untuk membuat prompt untuk mode percakapan.
 * @param {object} inputs - Objek yang berisi elemen-elemen input UI.
 * @returns {string} Prompt untuk adegan percakapan.
 */
function generateConversationPrompt(inputs) {
    const sceneContextParts = [
        inputs.tempat.value.trim() ? `di ${inputs.tempat.value.trim()}` : '',
        inputs.waktu.value.trim() ? `saat ${inputs.waktu.value.trim()}` : '',
        inputs.pencahayaan.value.trim() ? `dengan pencahayaan ${inputs.pencahayaan.value.trim()}` : '',
        inputs.suasana.value.trim() ? `suasana ${inputs.suasana.value.trim()}` : '',
    ].filter(Boolean);
    const sceneContext = sceneContextParts.length > 0 ? `// --- Scene Context ---\n${sceneContextParts.join(', ')}` : '';

    const interactionBlock = inputs.sceneInteraction.value.trim() ? `// --- Scene Interaction ---\n${inputs.sceneInteraction.value.trim()}` : '';
    
    const charactersBlock = state.selectedCharacters.length > 0
        ? `// --- Characters in Scene ---\n${state.selectedCharacters.map(c => c.description).join('\n')}`
        : '';
        
    const dialogueBlock = state.dialogueLines.length > 0
        ? `// --- Dialogue ---\n${state.dialogueLines.map(d => `${d.speaker || 'N/A'}: "${d.line || ''}" ${d.tone ? `(${d.tone})` : ''}`.trim()).join('\n')}`
        : '';

    const promptParts = [
        inputs.style.value,
        inputs.sudutKamera.value,
        inputs.kamera.value,
        sceneContext,
        interactionBlock,
        charactersBlock,
        dialogueBlock,
        inputs.backsound.value.trim() ? `// --- Audio ---\ndengan suara ${inputs.backsound.value.trim()}` : '',
        inputs.detail.value
    ];
    return promptParts.filter(part => part && part.trim()).join(',\n');
}
