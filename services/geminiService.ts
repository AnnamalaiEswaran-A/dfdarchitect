
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
                protocol: { type: Type.STRING },
                isBidirectional: { type: Type.BOOLEAN }
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
    
    const prompt = `You are an expert Systems Architect. Analyze the provided diagram (possibly from Lucidchart or Visio) and convert it to a structured DFD JSON.
    
    CRITICAL ARCHITECTURE RULES:
    1. BE METICULOUS: Professional diagrams often use thin lines or small arrowheads. Do not miss any connections.
    2. Identify all PROCESSES. Assign numbers (e.g., "1.1", "1.2") logically.
    3. Identify EXTERNAL ENTITIES and DATA STORES.
    4. DATA FLOWS:
       - Detect BIDIRECTIONAL arrows (arrows at both ends of a line). Set "isBidirectional": true if found.
       - Identify protocols: 'https' (Blue), 'sql' (Orange), 'standard' (Gray).
    5. If a line has no arrowhead but connects two boxes, treat it as a 'standard' flow.`;

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
          responseSchema: this.schema
        }
      });

      return JSON.parse(response.text || '{}') as AIResponse;
    } catch (e: any) {
      console.error("Gemini Error:", e);
      throw new Error("The diagram analysis failed. Please ensure the image is clear.");
    }
  }

  async analyzeCSV(csvContent: string): Promise<AIResponse> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const prompt = `You are an expert Systems Architect. I am providing you with architectural data in CSV format. 
    Your task is to parse this CSV and turn it into a high-quality DFD Structure JSON.
    
    CSV CONTENT:
    """
    ${csvContent}
    """
    
    Instructions:
    1. Understand the columns even if they are not perfectly labeled (look for types like 'Process', 'Entity', 'Store', 'Flow').
    2. Link IDs correctly between Flows and Nodes.
    3. If bidirectional markers like '<->' or 'both' are found in flow descriptions, set "isBidirectional": true.
    4. Infer logical process numbering if not provided.`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: this.schema
        }
      });

      return JSON.parse(response.text || '{}') as AIResponse;
    } catch (e: any) {
      console.error("Gemini CSV Error:", e);
      throw new Error("Failed to process the CSV data.");
    }
  }

  async refineDFD(userMessage: string, currentState: DFDStructure, history: any[], imageBase64?: string): Promise<AIResponse> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const chat = ai.chats.create({
      model: 'gemini-3-flash-preview',
      config: {
        systemInstruction: `You are a Systems Architect modifying a DFD. 
        Current State: ${JSON.stringify(currentState)}
        Focus on flow integrity. If the user mentions bidirectional data, ensure "isBidirectional" is true for that flow.
        Always return JSON matching the specified schema.`,
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
      throw new Error("Refinement failed. Try checking your prompt or connection.");
    }
  }
}
