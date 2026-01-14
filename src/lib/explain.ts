import { EntryType } from "../types";
import { getClient, hasApiKey } from "./anthropic";

interface ExplainInput {
  type: EntryType;
  term: string;
  sourceSentence?: string;
}

interface ExplainOutput {
  meaning: string;
  nuance?: string;
}

export async function explainEntry(input: ExplainInput): Promise<ExplainOutput> {
  const { type, term, sourceSentence } = input;

  // Check if API key is available
  if (!hasApiKey()) {
    return getFallbackExplanation(input);
  }

  const client = getClient();
  if (!client) {
    return getFallbackExplanation(input);
  }

  try {
    const prompt = buildPrompt(type, term, sourceSentence);

    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 500,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const responseText =
      message.content[0].type === "text" ? message.content[0].text : "";

    return parseResponse(responseText);
  } catch (error) {
    console.error("AI explanation failed:", error);
    return getFallbackExplanation(input);
  }
}

function buildPrompt(
  type: EntryType,
  term: string,
  sourceSentence?: string
): string {
  let prompt = `You are a helpful English language tutor. Explain the following ${type} to a language learner.\n\n`;
  prompt += `Term: "${term}"\n`;

  if (sourceSentence) {
    prompt += `Context sentence: "${sourceSentence}"\n`;
  }

  prompt += `\nProvide a response in the following JSON format:
{
  "meaning": "A clear, concise definition or explanation (1-2 sentences). For words, include part of speech. For idioms/expressions, explain the figurative meaning.",
  "nuance": "Optional: Usage notes, formality level, cultural context, common mistakes, or when to use/avoid this term. Leave empty if not applicable."
}

Respond ONLY with the JSON object, no additional text.`;

  return prompt;
}

function parseResponse(response: string): ExplainOutput {
  try {
    // Try to extract JSON from the response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        meaning: parsed.meaning || "Could not parse meaning.",
        nuance: parsed.nuance || undefined,
      };
    }
  } catch {
    // If JSON parsing fails, use the response as-is
  }

  // Fallback: use the whole response as meaning
  return {
    meaning: response.trim() || "Could not generate explanation.",
  };
}

function getFallbackExplanation(input: ExplainInput): ExplainOutput {
  const { type, term, sourceSentence } = input;

  // Provide helpful placeholder when no API key
  const typeLabels: Record<EntryType, string> = {
    word: "Word",
    idiom: "Idiom",
    expression: "Expression",
    sentence: "Sentence Pattern",
  };

  let meaning = `[${typeLabels[type]}] "${term}" - Add your API key in Settings to get AI-powered explanations, or edit this entry manually.`;

  if (sourceSentence) {
    meaning += ` Context: "${sourceSentence.slice(0, 60)}${sourceSentence.length > 60 ? "..." : ""}"`;
  }

  return {
    meaning,
    nuance:
      "Set up your Anthropic API key to enable automatic explanations and example generation.",
  };
}
