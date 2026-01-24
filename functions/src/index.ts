import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import Anthropic from "@anthropic-ai/sdk";
import { defineSecret } from "firebase-functions/params";

admin.initializeApp();
const db = admin.firestore();

const TRIAL_LIMIT = 20;
const anthropicKey = defineSecret("ANTHROPIC_API_KEY");

interface AIRequest {
  prompt: string;
  maxTokens?: number;
}

// Check and increment usage, returns remaining calls or -1 if over limit
async function checkAndIncrementUsage(userId: string): Promise<number> {
  const userRef = db.collection("users").doc(userId).collection("usage").doc("ai");

  return db.runTransaction(async (transaction) => {
    const doc = await transaction.get(userRef);
    const currentCount = doc.exists ? (doc.data()?.count || 0) : 0;

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
async function getUsageCount(userId: string): Promise<number> {
  const doc = await db.collection("users").doc(userId).collection("usage").doc("ai").get();
  return doc.exists ? (doc.data()?.count || 0) : 0;
}

// AI completion endpoint
export const aiComplete = onCall(
  { secrets: [anthropicKey] },
  async (request) => {
    // Check authentication
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be logged in");
    }

    const userId = request.auth.uid;
    const data = request.data as AIRequest;

    // Check if API key is configured
    const apiKey = anthropicKey.value();
    if (!apiKey) {
      throw new HttpsError("failed-precondition", "AI service not configured");
    }

    // Check usage limit
    const remaining = await checkAndIncrementUsage(userId);
    if (remaining < 0) {
      throw new HttpsError(
        "resource-exhausted",
        "Trial limit reached. Please add your own API key in Settings.",
        { trialExhausted: true }
      );
    }

    try {
      const client = new Anthropic({ apiKey });

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
    } catch (error) {
      console.error("Anthropic API error:", error);
      throw new HttpsError("internal", "AI service error");
    }
  }
);

// Get usage status
export const getUsageStatus = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be logged in");
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
