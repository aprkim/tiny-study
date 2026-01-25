import { EntryType, ExampleStyle } from "../types";
import { aiComplete, TrialExhaustedError } from "./aiService";

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

  try {
    const prompt = buildPrompt(term, type, style, sourceSentence);
    const responseText = await aiComplete(prompt, 800);
    return parseExamples(responseText);
  } catch (error) {
    if (error instanceof TrialExhaustedError) throw error;
    console.error("AI example generation failed:", error);
    return getFallbackExamples(term, type);
  }
}

function buildPrompt(
  term: string,
  type: EntryType,
  _style: ExampleStyle,
  sourceSentence?: string
): string {
  let prompt = `Generate 3 example sentences using the ${type} "${term}".\n\n`;

  if (sourceSentence) {
    prompt += `Original context: "${sourceSentence}"\n\n`;
  }

  prompt += `Requirements:
- Each sentence should naturally incorporate "${term}"
- Sentences should be practical, realistic, and most useful for learning
- Vary the sentence structure and context (casual, formal, everyday)
- Keep sentences concise (under 20 words each)
- For ${type === "word" ? "words, show different grammatical usages" : type === "idiom" ? "idioms, show natural conversational usage" : type === "expression" ? "expressions, show how native speakers use it" : "sentence patterns, show variations"}

Respond with a JSON array of exactly 3 strings, no additional text:
["sentence 1", "sentence 2", "sentence 3"]`;

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
        examples = parsed.slice(0, 3).map((s) => String(s));
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
      examples = lines.slice(0, 3);
    }
  }

  if (examples.length === 0) {
    return ["Could not generate examples. Please try again."];
  }

  // Ensure we always return exactly 3 examples
  while (examples.length < 3) {
    examples.push(`[Example ${examples.length + 1} - try regenerating]`);
  }

  return examples.slice(0, 3);
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
  ];
}
