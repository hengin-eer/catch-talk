"use server";

import {
  type GenerativeModel,
  GoogleGenerativeAI,
  type Schema,
  SchemaType,
} from "@google/generative-ai";

export type Speaker = "player1" | "player2";

export type Message = {
  speaker: Speaker;
  text: string;
};

export type ChatAnalysisResult = {
  tension: number;
  communicationStyle: number;
};

// Initialize Gemini API lazily to avoid build-time/test-time env var issues
let model: GenerativeModel | null = null;

function getModel() {
  if (model) return model;

  const API_KEY = process.env.GEMINI_API_KEY;
  if (!API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const genAI = new GoogleGenerativeAI(API_KEY);

  // Define the response schema for structured output
  const schema: Schema = {
    description: "Analysis of chat content for tension and communication style",
    type: SchemaType.OBJECT,
    properties: {
      tension: {
        type: SchemaType.NUMBER,
        description:
          "Tension level of the conversation. Range: -1.0 (Low/Calm) to 1.0 (High/Excited)",
        nullable: false,
      },
      communicationStyle: {
        type: SchemaType.NUMBER,
        description:
          "Communication style. Range: -1.0 (Discussion/Solution-oriented) to 1.0 (Empathy/Acceptance-oriented)",
        nullable: false,
      },
    },
    required: ["tension", "communicationStyle"],
  };

  model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: schema,
    },
  });

  return model;
}

/**
 * Analyzes chat text to extract tension and communication style parameters.
 *
 * @param messages Array of chat messages. The last message is the target for analysis.
 * @returns Promise resolving to the analysis result.
 */
export async function analyzeChat(
  messages: Message[],
): Promise<ChatAnalysisResult> {
  if (messages.length === 0) {
    throw new Error("Messages array cannot be empty");
  }

  try {
    const model = getModel();

    const targetMessage = messages[messages.length - 1];
    const historyMessages = messages.slice(0, messages.length - 1);

    const historyText =
      historyMessages.length > 0
        ? `\n\nContext (Recent History):\n${historyMessages.map((m) => `${m.speaker}: ${m.text}`).join("\n")}`
        : "";

    const prompt = `
Analyze the following chat message and extract the tension level and communication style based on the provided schema.

Input Text (${targetMessage.speaker}): "${targetMessage.text}"${historyText}

Provide the output in JSON format.
`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const jsonText = response.text();

    // Parse the JSON response
    const data = JSON.parse(jsonText);

    return {
      tension: data.tension,
      communicationStyle: data.communicationStyle,
    };
  } catch (error) {
    console.error("Error analyzing chat with Gemini:", error);
    throw new Error("Failed to analyze chat content");
  }
}
