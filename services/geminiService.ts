
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
                  description: "Set true if the flow has arrows at both ends or indicates a two-way transaction (e.g. Request/Response)."
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
    
    const prompt = `You are a World-Class Senior Systems Architect specializing in Data Flow Diagrams (DFD). 
    Your task is to analyze the provided architectural screenshot and reconstruct its logic with 100% fidelity.

    RECOGNITION RULES:
    1. EXTERNAL ENTITIES (Actors): Squares or rectangles, often representing users, systems, or organizations. Ensure they are mapped as "externalEntities".
    2. PROCESSES: Circles or rounded rectangles with a numbering system (e.g., 1.0, 1.1). Map to "processes".
    3. DATA STORES: Open-ended rectangles or parallel lines (often labeled D1, D2 or DB). Map to "dataStores".
    4. DATA FLOWS (Connections): 
       - CRITICAL: Look for double-headed arrows. If a line connects two nodes and has arrows on BOTH ends, you MUST set "isBidirectional": true.
       - PROTOCOLS: Infer protocols. Use "https" for web-like interactions, "sql" for database flows, otherwise "standard".
       - Do NOT miss any label on a line. Every label is a "dataFlow" name.
       - If a connection implies a "Request/Response" cycle in a single line, mark as bidirectional.

    5. MAPPING FIDELITY: Ensure the sourceId and targetId correctly reflect the flow direction shown by the arrows.

    Analyze the image and produce a high-precision DFD JSON structure.`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview', // Using advanced model for complex reasoning
        contents: {
          parts: [
            { inlineData: { mimeType: 'image/png', data: base64Image.split(',')[1] || base64Image } },
            { text: prompt }
          ]
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: this.schema,
          thinkingConfig: { thinkingBudget: 2000 } // Enable reasoning for better structural understanding
        }
      });

      return JSON.parse(response.text || '{}') as AIResponse;
    } catch (e: any) {
      console.error("Gemini Error:", e);
      throw new Error(e.message || "Deep analysis failed. Please try a clearer image.");
    }
  }

  async analyzeCSV(csvContent: string): Promise<AIResponse> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const prompt = `You are a Senior Systems Architect. Convert the following architectural CSV data into a perfect DFD Level-1 diagram.

    CSV DATA:
    """
    ${csvContent}
    """
    
    INSTRUCTIONS:
    1. EXTRACT NODES: Identify all unique entities, processes, and stores.
    2. LINK LOGIC: Map 'Source' and 'Target' names to consistent IDs.
    3. BIDIRECTIONAL DETECTION: If a flow contains keywords like 'bidirectional', '<->', 'sync', 'roundtrip', or 'dual-way', set "isBidirectional": true.
    4. SCHEMA: Assign logical numbering to processes if not provided.
    
    Respond with a comprehensive architectural JSON structure.`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: this.schema,
          thinkingConfig: { thinkingBudget: 1000 }
        }
      });

      return JSON.parse(response.text || '{}') as AIResponse;
    } catch (e: any) {
      console.error("Gemini CSV Error:", e);
      throw new Error(e.message || "Failed to parse system logic from CSV.");
    }
  }

  async refineDFD(userMessage: string, currentState: DFDStructure, history: any[], imageBase64?: string): Promise<AIResponse> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const chat = ai.chats.create({
      model: 'gemini-3-pro-preview',
      config: {
        systemInstruction: `You are a World-Class Systems Architect. You are editing a live DFD structure based on user feedback.
        
        CURRENT SYSTEM ARCHITECTURE:
        ${JSON.stringify(currentState)}

        GOALS:
        1. Maintain consistency. If a user asks to "connect X and Y", find their IDs and add a flow.
        2. If a user asks to "change protocol to secure", update the flow protocol to "https".
        3. If a user asks about "bidirectional", ensure "isBidirectional" is true for that flow.
        4. Be proactive. If adding a flow implies a missing Data Store, suggest it in the message.
        
        Always return valid JSON. Ensure IDs remain consistent across updates.`,
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
      throw new Error("Architecture refinement failed. Please try a more specific request.");
    }
  }
}
