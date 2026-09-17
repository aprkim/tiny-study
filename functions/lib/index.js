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
const MODEL = "claude-sonnet-5";
const anthropicKey = (0, params_1.defineSecret)("ANTHROPIC_API_KEY");
function usageRef(userId) {
    return db.collection("users").doc(userId).collection("usage").doc("ai");
}
// Get current usage count
async function getUsageCount(userId) {
    var _a;
    const doc = await usageRef(userId).get();
    return doc.exists ? (((_a = doc.data()) === null || _a === void 0 ? void 0 : _a.count) || 0) : 0;
}
// Increment usage after a successful AI call, returns remaining calls
async function incrementUsage(userId) {
    return db.runTransaction(async (transaction) => {
        var _a;
        const ref = usageRef(userId);
        const doc = await transaction.get(ref);
        const currentCount = doc.exists ? (((_a = doc.data()) === null || _a === void 0 ? void 0 : _a.count) || 0) : 0;
        transaction.set(ref, {
            count: currentCount + 1,
            lastUsed: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
        return Math.max(0, TRIAL_LIMIT - currentCount - 1);
    });
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
    // Check usage limit before calling the model
    const used = await getUsageCount(userId);
    if (used >= TRIAL_LIMIT) {
        throw new https_1.HttpsError("resource-exhausted", "Trial limit reached. Please add your own API key in Settings.", { trialExhausted: true });
    }
    let responseText;
    try {
        const client = new sdk_1.default({ apiKey });
        const message = await client.messages.create({
            model: MODEL,
            max_tokens: data.maxTokens || 800,
            messages: [{ role: "user", content: data.prompt }],
        });
        const textBlock = message.content.find((block) => block.type === "text");
        responseText = textBlock && textBlock.type === "text" ? textBlock.text : "";
    }
    catch (error) {
        console.error("Anthropic API error:", error);
        throw new https_1.HttpsError("internal", "AI service error");
    }
    // Only count the call once the model actually answered
    const remaining = await incrementUsage(userId);
    return {
        text: responseText,
        remaining,
    };
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