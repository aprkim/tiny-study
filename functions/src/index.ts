import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import Anthropic from "@anthropic-ai/sdk";
import { defineSecret } from "firebase-functions/params";

admin.initializeApp();
const db = admin.firestore();

const TRIAL_LIMIT = 20;
const MODEL = "claude-sonnet-5";
const anthropicKey = defineSecret("ANTHROPIC_API_KEY");

interface AIRequest {
  prompt: string;
  maxTokens?: number;
}

function usageRef(userId: string) {
  return db.collection("users").doc(userId).collection("usage").doc("ai");
}

// Get current usage count
async function getUsageCount(userId: string): Promise<number> {
  const doc = await usageRef(userId).get();
  return doc.exists ? (doc.data()?.count || 0) : 0;
}

// Increment usage after a successful AI call, returns remaining calls
async function incrementUsage(userId: string): Promise<number> {
  return db.runTransaction(async (transaction) => {
    const ref = usageRef(userId);
    const doc = await transaction.get(ref);
    const currentCount = doc.exists ? (doc.data()?.count || 0) : 0;

    transaction.set(ref, {
      count: currentCount + 1,
      lastUsed: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    return Math.max(0, TRIAL_LIMIT - currentCount - 1);
  });
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

    // Check usage limit before calling the model
    const used = await getUsageCount(userId);
    if (used >= TRIAL_LIMIT) {
      throw new HttpsError(
        "resource-exhausted",
        "Trial limit reached. Please add your own API key in Settings.",
        { trialExhausted: true }
      );
    }

    let responseText: string;
    try {
      const client = new Anthropic({ apiKey });

      const message = await client.messages.create({
        model: MODEL,
        max_tokens: data.maxTokens || 800,
        messages: [{ role: "user", content: data.prompt }],
      });

      responseText = message.content[0].type === "text" ? message.content[0].text : "";
    } catch (error) {
      console.error("Anthropic API error:", error);
      throw new HttpsError("internal", "AI service error");
    }

    // Only count the call once the model actually answered
    const remaining = await incrementUsage(userId);

    return {
      text: responseText,
      remaining,
    };
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
