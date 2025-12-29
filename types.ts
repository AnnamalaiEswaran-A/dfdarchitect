
export type DFDElementType = 'external_entity' | 'process' | 'data_store';

export interface DFDEntity {
  id: string;
  name: string;
  x?: number;
  y?: number;
}

export interface DFDProcess {
  id: string;
  number: string;
  name: string;
  description?: string;
  x?: number;
  y?: number;
}

export interface DFDDataStore {
  id: string;
  name: string;
  prefix?: string;
  x?: number;
  y?: number;
}

export interface DFDDataFlow {
  id: string;
  sourceId: string;
  targetId: string;
  label: string;
  protocol?: 'https' | 'sql' | 'standard';
  isBidirectional?: boolean;
}

export interface DFDStructure {
  externalEntities: DFDEntity[];
  processes: DFDProcess[];
  dataStores: DFDDataStore[];
  dataFlows: DFDDataFlow[];
  title?: string;
  level?: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  image?: string;
  suggestedPrompts?: string[];
}

export interface AIResponse {
  action: 'update' | 'question' | 'complete';
  message: string;
  updated_dfd?: DFDStructure;
  clarification_needed?: string;
  suggested_prompts?: string[];
}
