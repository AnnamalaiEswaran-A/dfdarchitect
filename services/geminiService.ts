
import { GoogleGenAI, Type } from "@google/genai";
import { DFDStructure, AIResponse } from "../types";

export class GeminiService {
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
                protocol: { 
                  type: Type.STRING,
                  description: "Use 'https' for web/api, 'sql' for DB queries, or 'standard' for others."
                },
                isBidirectional: { 
                  type: Type.BOOLEAN,
                  description: "Set true if the flow indicates a two-way transaction or has double arrows."
                }
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
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const prompt = `Analyze this system architecture diagram.
    Extract:
    1. Actors (External Entities): Squares/rectangles.
    2. Processes: Circles/rounded boxes with numbers (1.0, 2.0).
    3. Data Stores: Open rectangles (DB/Disk).
    4. Data Flows: Connections with labels. 
       - CRITICAL: Detect double-headed arrows or bi-directional text (e.g., sync, round-trip) and set "isBidirectional": true.
       - MAP IDs correctly between source and target.
    
    Output high-fidelity DFD JSON structure.`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: {
          parts: [
            { inlineData: { mimeType: 'image/png', data: base64Image.split(',')[1] || base64Image } },
            { text: prompt }
          ]
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: this.schema,
        }
      });

      return JSON.parse(response.text || '{}') as AIResponse;
    } catch (e: any) {
      console.error("Gemini Error:", e);
      throw new Error("Analysis failed. Please try again with a clearer image.");
    }
  }

  async analyzeCSV(csvContent: string): Promise<AIResponse> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const prompt = `Convert this CSV to a DFD structure:
    ${csvContent}
    
    Identify unique nodes and map flows. Detect bi-directional logic if keywords like 'bidirectional', '<->', or 'sync' appear.`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: this.schema,
        }
      });

      return JSON.parse(response.text || '{}') as AIResponse;
    } catch (e: any) {
      console.error("Gemini CSV Error:", e);
      throw new Error("CSV parsing failed.");
    }
  }

  async refineDFD(userMessage: string, currentState: DFDStructure, history: any[], imageBase64?: string): Promise<AIResponse> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const chat = ai.chats.create({
      model: 'gemini-3-flash-preview',
      config: {
        systemInstruction: `You are a Systems Architect editing this DFD: ${JSON.stringify(currentState)}.
        Focus on flow accuracy and bidirectional transactions. 
        Always return JSON.`,
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

      const response = await chat.sendMessage({ 
        message: imageBase64 ? promptParts : userMessage 
      });
      
      return JSON.parse(response.text || '{}') as AIResponse;
    } catch (e: any) {
      console.error("Refinement Error:", e);
      throw new Error("Refinement failed.");
    }
  }
}
