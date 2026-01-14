import { EntryType, ExampleStyle } from "../types";
import { getClient, hasApiKey } from "./anthropic";

interface GenerateParams {
  term: string;
  type: EntryType;
  style: ExampleStyle;
  sourceSentence?: string;
}

export async function generateExamples(
  params: GenerateParams
): Promise<string[]> {
  const { term, type, style, sourceSentence } = params;

  // Check if API key is available
  if (!hasApiKey()) {
    return getFallbackExamples(term, type);
  }

  const client = getClient();
  if (!client) {
    return getFallbackExamples(term, type);
  }

  try {
    const prompt = buildPrompt(term, type, style, sourceSentence);

    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 800,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const responseText =
      message.content[0].type === "text" ? message.content[0].text : "";

    return parseExamples(responseText);
  } catch (error) {
    console.error("AI example generation failed:", error);
    return getFallbackExamples(term, type);
  }
}

function buildPrompt(
  term: string,
  type: EntryType,
  style: ExampleStyle,
  sourceSentence?: string
): string {
  const styleDescriptions: Record<ExampleStyle, string> = {
    neutral: "general, balanced tone suitable for any context",
    casual: "informal, conversational, like talking with friends",
    formal: "professional, academic, or official contexts",
    work: "workplace and business settings",
    daily: "everyday life situations and routines",
    short: "brief and concise sentences",
  };

  let prompt = `Generate 6 example sentences using the ${type} "${term}" in a ${styleDescriptions[style]} style.\n\n`;

  if (sourceSentence) {
    prompt += `Original context: "${sourceSentence}"\n\n`;
  }

  prompt += `Requirements:
- Each sentence should naturally incorporate "${term}"
- Sentences should be practical and realistic
- Vary the sentence structure
- Keep sentences concise (under 20 words each)
- For ${type === "word" ? "words, show different grammatical usages" : type === "idiom" ? "idioms, show natural conversational usage" : type === "expression" ? "expressions, show how native speakers use it" : "sentence patterns, show variations"}

Respond with a JSON array of exactly 6 strings, no additional text:
["sentence 1", "sentence 2", "sentence 3", "sentence 4", "sentence 5", "sentence 6"]`;

  return prompt;
}

function parseExamples(response: string): string[] {
  let examples: string[] = [];

  try {
    // Try to extract JSON array from the response
    const arrayMatch = response.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      const parsed = JSON.parse(arrayMatch[0]);
      if (Array.isArray(parsed) && parsed.length > 0) {
        examples = parsed.slice(0, 6).map((s) => String(s));
      }
    }
  } catch {
    // If JSON parsing fails, try to extract lines
  }

  // Fallback: split by newlines and filter
  if (examples.length === 0) {
    const lines = response
      .split("\n")
      .map((line) => line.replace(/^[\d\.\-\*]+\s*/, "").trim())
      .filter((line) => line.length > 10 && line.length < 200);

    if (lines.length >= 3) {
      examples = lines.slice(0, 6);
    }
  }

  if (examples.length === 0) {
    return ["Could not generate examples. Please try again."];
  }

  // Ensure we always return exactly 6 examples
  while (examples.length < 6) {
    examples.push(`[Example ${examples.length + 1} - try regenerating]`);
  }

  return examples.slice(0, 6);
}

function getFallbackExamples(term: string, type: EntryType): string[] {
  // Provide helpful placeholder when no API key
  const typeLabel =
    type === "word"
      ? "word"
      : type === "idiom"
        ? "idiom"
        : type === "expression"
          ? "expression"
          : "sentence";

  return [
    `Add your API key in Settings to generate AI-powered examples for "${term}".`,
    `Example 1: [Your ${typeLabel} "${term}" used in context]`,
    `Example 2: [Another way to use "${term}"]`,
    `Example 3: [${term} in a question form]`,
    `Example 4: [${term} in a casual conversation]`,
    `Example 5: [${term} in a formal setting]`,
    `Example 6: [${term} with a different meaning or usage]`,
  ];
}
