
import { GoogleGenAI, Type } from "@google/genai";
import { DFDStructure, AIResponse } from "../types";

export class GeminiService {
  // Use a schema to ensure structured JSON responses from the model.
  private readonly schema = {
    type: Type.OBJECT,
    properties: {
      action: { type: Type.STRING },
      message: { type: Type.STRING },
      updated_dfd: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          externalEntities: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                name: { type: Type.STRING }
              },
              required: ['id', 'name']
            }
          },
          processes: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                number: { type: Type.STRING },
                name: { type: Type.STRING },
                description: { type: Type.STRING }
              },
              required: ['id', 'number', 'name']
            }
          },
          dataStores: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                name: { type: Type.STRING },
                prefix: { type: Type.STRING }
              },
              required: ['id', 'name']
            }
          },
          dataFlows: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                sourceId: { type: Type.STRING },
                targetId: { type: Type.STRING },
                label: { type: Type.STRING },
                protocol: { type: Type.STRING }
              },
              required: ['id', 'sourceId', 'targetId', 'label']
            }
          }
        },
        required: ['externalEntities', 'processes', 'dataStores', 'dataFlows']
      },
      suggested_prompts: {
        type: Type.ARRAY,
        items: { type: Type.STRING }
      }
    },
    required: ['action', 'message']
  };

  async analyzeInitialImage(base64Image: string): Promise<AIResponse> {
    // Create new instance before use as per guidelines
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const prompt = `You are an expert Systems Architect. Analyze the provided diagram and convert it to a structured DFD JSON.
    
    CRITICAL ARCHITECTURE RULES:
    1. Identify all PROCESSES. Assign them numbers (e.g., "1.1", "1.2") based on their logical order in the flow from left to right.
    2. Identify EXTERNAL ENTITIES (boxes that provide input or receive output).
    3. Identify DATA STORES (databases or file storage).
    4. Identify DATA FLOWS and their protocols:
       - 'https' (Blue) for web/api calls.
       - 'sql' (Orange) for database queries.
       - 'standard' (Gray) for others.`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: {
          parts: [
            { inlineData: { mimeType: 'image/png', data: base64Image.split(',')[1] || base64Image } },
            { text: prompt }
          ]
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: this.schema
        }
      });

      // Directly access .text property as per guidelines.
      return JSON.parse(response.text || '{}') as AIResponse;
    } catch (e: any) {
      console.error("Gemini Error:", e);
      if (e.message?.includes("Requested entity was not found")) {
        throw new Error("API_KEY_NOT_FOUND");
      }
      throw new Error("The diagram analysis failed. Please ensure you have a valid API key selected.");
    }
  }

  async refineDFD(userMessage: string, currentState: DFDStructure, history: any[], imageBase64?: string): Promise<AIResponse> {
    // Create new instance before use as per guidelines
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const chat = ai.chats.create({
      model: 'gemini-3-pro-preview',
      config: {
        systemInstruction: `You are a Systems Architect modifying a DFD. 
        Current State: ${JSON.stringify(currentState)}
        Always return JSON matching the specified schema. Keep process numbering (1.1, 1.2) for linear layout.`,
        responseMimeType: "application/json",
        responseSchema: this.schema
      }
    });

    try {
      const promptParts: any[] = [{ text: userMessage }];
      if (imageBase64) {
        promptParts.push({
          inlineData: { mimeType: 'image/png', data: imageBase64.split(',')[1] || imageBase64 }
        });
      }

      // chat.sendMessage accepts string or Array<Part> in the message property.
      const response = await chat.sendMessage({ 
        message: imageBase64 ? promptParts : userMessage 
      });
      
      // Directly access .text property as per guidelines.
      return JSON.parse(response.text || '{}') as AIResponse;
    } catch (e: any) {
      if (e.message?.includes("Requested entity was not found")) {
        throw new Error("API_KEY_NOT_FOUND");
      }
      throw new Error("Refinement failed. Try checking your connection or API key.");
    }
  }
}
