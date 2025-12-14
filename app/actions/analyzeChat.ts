"use server";

import {
  GoogleGenerativeAI,
  type Schema,
  SchemaType,
} from "@google/generative-ai";

const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
  // In a real app, you might want to handle this more gracefully
  // but for now, we need to know if the key is missing.
  console.error("GEMINI_API_KEY is not set in environment variables");
}

// Initialize Gemini API
// Note: We check for API_KEY existence before creating the client to avoid runtime errors on import if possible,
// though 'use server' modules are imported on the server.
const genAI = new GoogleGenerativeAI(API_KEY || "");

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

// Initialize the model
// Using gemini-2.5-flash as requested.
const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash",
  generationConfig: {
    responseMimeType: "application/json",
    responseSchema: schema,
  },
});

export type ChatAnalysisResult = {
  tension: number;
  communicationStyle: number;
};

/**
 * Analyzes chat text to extract tension and communication style parameters.
 *
 * @param text The current chat message to analyze.
 * @param history Optional array of recent chat history strings for context.
 * @returns Promise resolving to the analysis result.
 */
export async function analyzeChat(
  text: string,
  history: string[] = [],
): Promise<ChatAnalysisResult> {
  if (!API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const historyText =
    history.length > 0
      ? `\n\nContext (Recent History):\n${history.join("\n")}`
      : "";

  const prompt = `
Analyze the following chat message and extract the tension level and communication style based on the provided schema.

Input Text: "${text}"${historyText}

Provide the output in JSON format.
`;

  try {
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
