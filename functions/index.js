// functions/index.js
// Perbaikan: Memperbaiki logika update field Map (likes/dislikes) di dalam transaksi Firestore.

const functions = require("firebase-functions/v2");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const fetch = require("node-fetch");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { initializeApp } = require("firebase-admin/app");
const midtransClient = require('midtrans-client');

initializeApp();
const db = getFirestore();

// Definisikan semua secrets yang akan digunakan
const geminiApiKey = defineSecret("GEMINI_API_KEY");
const midtransServerKey = defineSecret("MIDTRANS_SERVER_KEY");
const midtransClientKey = defineSecret("MIDTRANS_CLIENT_KEY");

exports.callGeminiAPI = onCall({ secrets: [geminiApiKey] }, async (request) => {
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
            throw new HttpsError(
                "internal",
                `Google API error: ${googleResponse.statusText}`,
                errorBody
            );
        }
        const data = await googleResponse.json();
        return data;
    } catch (error) {
        console.error("Internal Server Error:", error);
        throw new HttpsError(
            "internal",
            "Terjadi kesalahan internal di server."
        );
    }
});

exports.purchaseCharacter = onCall(async (request) => {
    const { globalCharId } = request.data;
    const currentUserId = request.auth?.uid;

    if (!currentUserId) {
        throw new HttpsError("unauthenticated", "Anda harus login untuk melakukan aksi ini.");
    }
    if (!globalCharId) {
        throw new HttpsError("invalid-argument", "ID karakter global tidak diberikan.");
    }

    const cost = 20;
    const reward = 15;
    const globalCharRef = db.collection("globalCharacters").doc(globalCharId);
    const currentUserRef = db.collection("users").doc(currentUserId);

    try {
        await db.runTransaction(async (t) => {
            const globalCharDoc = await t.get(globalCharRef);
            if (!globalCharDoc.exists) throw new HttpsError("not-found", "Karakter global tidak ditemukan.");
            
            const currentUserDoc = await t.get(currentUserRef);
            if (!currentUserDoc.exists) throw new HttpsError("not-found", "Data pengguna saat ini tidak ditemukan.");
            
            const globalCharData = globalCharDoc.data();
            const currentUserData = currentUserDoc.data();
            const ownerId = globalCharData.ownerId;

            if (ownerId === currentUserId) throw new HttpsError("failed-precondition", "Anda tidak bisa membeli karakter milik sendiri.");
            if (currentUserData.coins < cost) throw new HttpsError("failed-precondition", "Koin Anda tidak cukup.");

            const userCharRef = currentUserRef.collection("characters").doc(globalCharData.name);
            const userCharDoc = await t.get(userCharRef);
            if (userCharDoc.exists) throw new HttpsError("already-exists", "Anda sudah memiliki karakter dengan nama ini.");

            const ownerRef = db.collection("users").doc(ownerId);
            const ownerDoc = await t.get(ownerRef);

            t.update(currentUserRef, { coins: currentUserData.coins - cost });
            if (ownerDoc.exists) {
                t.update(ownerRef, { coins: FieldValue.increment(reward) });
            }

            t.update(globalCharRef, { copyCount: FieldValue.increment(1) });
            
            const newCharacterData = {
                name: globalCharData.name,
                description: globalCharData.description,
                illustrationUrl: globalCharData.illustrationUrl || null,
                createdAt: FieldValue.serverTimestamp()
            };
            t.set(userCharRef, newCharacterData);

            // Buat notifikasi untuk pemilik karakter
            const ownerNotifRef = db.collection('users').doc(ownerId).collection('notifications').doc();
            t.set(ownerNotifRef, {
                type: 'CHARACTER_COPY',
                message: `Karakter "${globalCharData.name}" Anda disalin oleh ${currentUserData.displayName || 'seseorang'}. Anda mendapat +${reward} koin!`,
                timestamp: FieldValue.serverTimestamp(),
                isRead: false
            });
            
        });
        return { success: true, message: `Karakter berhasil ditambahkan!` };
    } catch (error) {
        console.error("Transaction failed:", error);
        if (error instanceof HttpsError) throw error;
        throw new HttpsError("internal", "Gagal menyelesaikan transaksi.", error.message);
    }
});

// --- FUNGSI VOTE YANG DIPERBAIKI ---
exports.voteOnCharacter = onCall(async (request) => {
    const { globalCharId, voteType } = request.data;
    const userId = request.auth?.uid;

    if (!userId) {
        throw new HttpsError("unauthenticated", "Anda harus login untuk memilih.");
    }
    if (!globalCharId || !['like', 'dislike'].includes(voteType)) {
        throw new HttpsError("invalid-argument", "Argumen tidak valid.");
    }

    const charRef = db.collection("globalCharacters").doc(globalCharId);
    const voterRef = db.collection('users').doc(userId);
    
    try {
        await db.runTransaction(async (t) => {
            const charDoc = await t.get(charRef);
            if (!charDoc.exists) {
                throw new HttpsError("not-found", "Karakter tidak ditemukan.");
            }
            const voterDoc = await t.get(voterRef);

            const data = charDoc.data();
            let likeCount = data.likeCount || 0;
            let dislikeCount = data.dislikeCount || 0;
            const likes = data.likes || {};
            const dislikes = data.dislikes || {};

            const hasLiked = likes[userId] === true;
            const hasDisliked = dislikes[userId] === true;
            let message = '';

            if (voteType === 'like') {
                if (hasLiked) {
                    delete likes[userId];
                    likeCount--;
                } else {
                    likes[userId] = true;
                    likeCount++;
                    message = `menyukai karakter "${data.name}" Anda.`;
                    if (hasDisliked) {
                        delete dislikes[userId];
                        dislikeCount--;
                    }
                }
            } else if (voteType === 'dislike') {
                if (hasDisliked) {
                    delete dislikes[userId];
                    dislikeCount--;
                } else {
                    dislikes[userId] = true;
                    dislikeCount++;
                    message = `tidak menyukai karakter "${data.name}" Anda.`;
                    if (hasLiked) {
                        delete likes[userId];
                        likeCount--;
                    }
                }
            }
            
            t.update(charRef, {
                likes: likes,
                dislikes: dislikes,
                likeCount: likeCount,
                dislikeCount: dislikeCount
            });

            const ownerId = data.ownerId;
            if (ownerId !== userId && message) {
                // --- PERBAIKAN DI SINI ---
                const voterName = voterDoc.exists && voterDoc.data().displayName ? voterDoc.data().displayName : 'Seseorang';
                const ownerNotifRef = db.collection('users').doc(ownerId).collection('notifications').doc();
                
                t.set(ownerNotifRef, {
                    type: `VOTE_${voteType.toUpperCase()}`,
                    message: `${voterName} ${message}`,
                    timestamp: FieldValue.serverTimestamp(),
                    isRead: false
                });
            }
        });
        return { success: true };

    } catch (error) {
        console.error("Vote transaction failed:", error);
        if (error instanceof HttpsError) throw error;
        throw new HttpsError("internal", `Gagal menyimpan pilihan. Detail: ${error.message}`);
    }
});




exports.createTopUpTransaction = onCall({ secrets: [midtransServerKey, midtransClientKey] }, async (request) => {
    const userId = request.auth?.uid;
    if (!userId) {
        throw new HttpsError("unauthenticated", "Anda harus login untuk top up.");
    }

    const { orderId, amount, coins } = request.data;
    if (!orderId || !amount || !coins) {
        throw new HttpsError("invalid-argument", "Data transaksi tidak lengkap.");
    }
    
    const snap = new midtransClient.Snap({
        isProduction: false,
        serverKey: midtransServerKey.value(),
        clientKey: midtransClientKey.value()
    });

    const transactionRef = db.collection('transactions').doc(orderId);
    await transactionRef.set({
        userId: userId,
        amount: amount,
        coins: coins,
        status: 'pending',
        createdAt: FieldValue.serverTimestamp()
    });

    const parameter = {
        "transaction_details": { "order_id": orderId, "gross_amount": amount },
        "customer_details": { "first_name": request.auth.token.name || "Pengguna", "email": request.auth.token.email },
        "item_details": [{ "id": `coins-${coins}`, "price": amount, "quantity": 1, "name": `${coins.toLocaleString('id-ID')} Koin` }]
    };

    try {
        const transaction = await snap.createTransaction(parameter);
        return transaction;
    } catch (e) {
        console.error("Midtrans API Error:", e);
        throw new HttpsError('internal', "Gagal membuat transaksi dengan Midtrans.", e.message);
    }
});

exports.handlePaymentNotification = functions.https.onRequest({ secrets: [midtransServerKey, midtransClientKey] }, async (req, res) => {
    
    const core = new midtransClient.CoreApi({
        isProduction: false,
        serverKey: midtransServerKey.value(),
        clientKey: midtransClientKey.value()
    });

    try {
        const notificationJson = await core.transaction.notification(req.body);
        
        const orderId = notificationJson.order_id;
        const transactionStatus = notificationJson.transaction_status;
        const fraudStatus = notificationJson.fraud_status;

        console.log(`Menerima notifikasi untuk order ${orderId}: ${transactionStatus}`);
        
        const transactionRef = db.collection('transactions').doc(orderId);
        const transactionDoc = await transactionRef.get();

        if (!transactionDoc.exists) throw new Error("Transaksi tidak ditemukan.");
        
        const transactionData = transactionDoc.data();
        if (transactionData.status === 'success') {
            res.status(200).send("Transaksi sudah diproses.");
            return;
        }

        if (transactionStatus == 'capture' || transactionStatus == 'settlement') {
            if (fraudStatus == 'accept') {
                await transactionRef.update({ status: 'success', updatedAt: FieldValue.serverTimestamp() });
                const userRef = db.collection('users').doc(transactionData.userId);
                await userRef.update({ coins: FieldValue.increment(transactionData.coins) });
                
                const userNotifRef = db.collection('users').doc(transactionData.userId).collection('notifications').doc();
                await userNotifRef.set({
                    type: 'TRANSACTION_SUCCESS',
                    message: `Top up sebesar Rp ${transactionData.amount.toLocaleString('id-ID')} berhasil. ${transactionData.coins} koin telah ditambahkan.`,
                    timestamp: FieldValue.serverTimestamp(),
                    isRead: false,
                    orderId: orderId
                });

                console.log(`Sukses: ${transactionData.coins} koin ditambahkan ke user ${transactionData.userId}`);
            }
        } else if (['cancel', 'expire', 'deny'].includes(transactionStatus)) {
            await transactionRef.update({ status: 'failed', updatedAt: FieldValue.serverTimestamp() });
        }
        
        res.status(200).send("Notifikasi berhasil diterima.");
    } catch (error) {
        console.error("Gagal memproses notifikasi:", error);
        res.status(500).send(error.message);
    }
});