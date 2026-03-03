import { GoogleGenAI, Type } from "@google/genai";

const SYSTEM_INSTRUCTION = `You are the Jumptech Project Assistant.
Your goal is to transform raw Jumptech project data (PROJECT_JSON) into a concise, friendly update for a customer.

CRITICAL RULES:
- BILINGUAL: You MUST return the response in BOTH English and Spanish.
- NO BOT NAME: Do not name yourself (e.g., do not say "I'm Jumpy").
- GREETING: Start the customer_message with "Hi [First Name]!" using the customer's first name from the data.
- CONCISE: Keep messages short and direct. Avoid fluff.
- SECURITY: NEVER include ANY location information. No address, no street, no house number, no town, no state. Zero location data.
- PROJECT DETAILS (key_details): ONLY include "Charger Type" and "Quote Status" (Sent, Approved, or Rejected). Do not include anything else here.
- WHAT'S BEEN DONE (what_happened): This should be a timeline of events that have occurred. Include things like:
    - Project created
    - Site survey scheduled (or not)
    - Quote sent
    - Any other major milestones from the project history.
- SITE SURVEY: If a survey is mentioned, always phrase it as "We may need a site survey" rather than saying it is definitely required.
- QUOTE FORMAT: 
    - Provide a single "Total" amount.
    - List the items included in the quote as a simple list of strings, WITHOUT their individual prices.
- NO JARGON: Use simple terms.

REQUIRED OUTPUT FORMAT:
Return a single JSON object with this structure:
{
  "en": {
    "customer_message": string,
    "status_summary": string,
    "what_happened": [string, ...],
    "what_happens_next": [string, ...],
    "quote_total": string (e.g. "$1,200.00"),
    "quote_items": [string, ...] (List of items included, no prices),
    "key_details": [string, ...],
    "needs_info": [string, ...]
  },
  "es": {
    "customer_message": string,
    "status_summary": string,
    "what_happened": [string, ...],
    "what_happens_next": [string, ...],
    "quote_total": string,
    "quote_items": [string, ...],
    "key_details": [string, ...],
    "needs_info": [string, ...]
  }
}

TONE: Friendly, professional, and very concise.`;

export interface AssistantResponse {
  en: {
    customer_message: string;
    status_summary: string;
    what_happened: string[];
    what_happens_next: string[];
    quote_total: string;
    quote_items: string[];
    key_details: string[];
    needs_info: string[];
  };
  es: {
    customer_message: string;
    status_summary: string;
    what_happened: string[];
    what_happens_next: string[];
    quote_total: string;
    quote_items: string[];
    key_details: string[];
    needs_info: string[];
  };
}

export async function generateAssistantResponse(projectJson: any): Promise<AssistantResponse> {
  const apiKey = (process.env.GEMINI_API_KEY as string);
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured. Please set it in the environment.");
  }
  const ai = new GoogleGenAI({ apiKey });
  
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `PROJECT_JSON: ${JSON.stringify(projectJson)}`,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          en: {
            type: Type.OBJECT,
            properties: {
              customer_message: { type: Type.STRING },
              status_summary: { type: Type.STRING },
              what_happened: { type: Type.ARRAY, items: { type: Type.STRING } },
              what_happens_next: { type: Type.ARRAY, items: { type: Type.STRING } },
              quote_total: { type: Type.STRING },
              quote_items: { type: Type.ARRAY, items: { type: Type.STRING } },
              key_details: { type: Type.ARRAY, items: { type: Type.STRING } },
              needs_info: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
            required: ["customer_message", "status_summary", "what_happened", "what_happens_next", "quote_total", "quote_items", "key_details", "needs_info"]
          },
          es: {
            type: Type.OBJECT,
            properties: {
              customer_message: { type: Type.STRING },
              status_summary: { type: Type.STRING },
              what_happened: { type: Type.ARRAY, items: { type: Type.STRING } },
              what_happens_next: { type: Type.ARRAY, items: { type: Type.STRING } },
              quote_total: { type: Type.STRING },
              quote_items: { type: Type.ARRAY, items: { type: Type.STRING } },
              key_details: { type: Type.ARRAY, items: { type: Type.STRING } },
              needs_info: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
            required: ["customer_message", "status_summary", "what_happened", "what_happens_next", "quote_total", "quote_items", "key_details", "needs_info"]
          }
        },
        required: ["en", "es"]
      }
    }
  });

  const text = response.text;
  if (!text) {
    throw new Error("Empty response from Gemini");
  }

  return JSON.parse(text);
}
