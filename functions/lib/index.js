"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUsageStatus = exports.aiComplete = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const sdk_1 = require("@anthropic-ai/sdk");
const params_1 = require("firebase-functions/params");
admin.initializeApp();
const db = admin.firestore();
const TRIAL_LIMIT = 20;
const anthropicKey = (0, params_1.defineSecret)("ANTHROPIC_API_KEY");
// Check and increment usage, returns remaining calls or -1 if over limit
async function checkAndIncrementUsage(userId) {
    const userRef = db.collection("users").doc(userId).collection("usage").doc("ai");
    return db.runTransaction(async (transaction) => {
        var _a;
        const doc = await transaction.get(userRef);
        const currentCount = doc.exists ? (((_a = doc.data()) === null || _a === void 0 ? void 0 : _a.count) || 0) : 0;
        if (currentCount >= TRIAL_LIMIT) {
            return -1; // Over limit
        }
        transaction.set(userRef, {
            count: currentCount + 1,
            lastUsed: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
        return TRIAL_LIMIT - currentCount - 1; // Remaining calls after this one
    });
}
// Get current usage count
async function getUsageCount(userId) {
    var _a;
    const doc = await db.collection("users").doc(userId).collection("usage").doc("ai").get();
    return doc.exists ? (((_a = doc.data()) === null || _a === void 0 ? void 0 : _a.count) || 0) : 0;
}
// AI completion endpoint
exports.aiComplete = (0, https_1.onCall)({ secrets: [anthropicKey] }, async (request) => {
    // Check authentication
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "User must be logged in");
    }
    const userId = request.auth.uid;
    const data = request.data;
    // Check if API key is configured
    const apiKey = anthropicKey.value();
    if (!apiKey) {
        throw new https_1.HttpsError("failed-precondition", "AI service not configured");
    }
    // Check usage limit
    const remaining = await checkAndIncrementUsage(userId);
    if (remaining < 0) {
        throw new https_1.HttpsError("resource-exhausted", "Trial limit reached. Please add your own API key in Settings.", { trialExhausted: true });
    }
    try {
        const client = new sdk_1.default({ apiKey });
        const message = await client.messages.create({
            model: "claude-sonnet-4-20250514",
            max_tokens: data.maxTokens || 800,
            messages: [{ role: "user", content: data.prompt }],
        });
        const responseText = message.content[0].type === "text" ? message.content[0].text : "";
        return {
            text: responseText,
            remaining: remaining,
        };
    }
    catch (error) {
        console.error("Anthropic API error:", error);
        throw new https_1.HttpsError("internal", "AI service error");
    }
});
// Get usage status
exports.getUsageStatus = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "User must be logged in");
    }
    const userId = request.auth.uid;
    const count = await getUsageCount(userId);
    return {
        used: count,
        limit: TRIAL_LIMIT,
        remaining: Math.max(0, TRIAL_LIMIT - count),
        trialExhausted: count >= TRIAL_LIMIT,
    };
});
//# sourceMappingURL=index.js.map