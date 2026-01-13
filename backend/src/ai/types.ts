/**
 * AI Module Types
 * Type definitions for OpenAI integration
 */

/**
 * Supported AI Models
 */
export enum AIModel {
  GPT_4 = 'gpt-4',
  GPT_4_TURBO = 'gpt-4-turbo-preview',
  GPT_4O = 'gpt-4o',
  GPT_4O_MINI = 'gpt-4o-mini',
  GPT_35_TURBO = 'gpt-3.5-turbo',
}

/**
 * Message Role
 */
export enum MessageRole {
  SYSTEM = 'system',
  USER = 'user',
  ASSISTANT = 'assistant',
  FUNCTION = 'function',
  TOOL = 'tool',
}

/**
 * Chat Message
 */
export interface ChatMessage {
  role: MessageRole;
  content: string;
  name?: string;
  functionCall?: {
    name: string;
    arguments: string;
  };
  toolCalls?: ToolCall[];
}

/**
 * Tool Call
 */
export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

/**
 * AI Completion Options
 */
export interface CompletionOptions {
  model?: AIModel;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stop?: string | string[];
  stream?: boolean;
  responseFormat?: 'text' | 'json_object';
  seed?: number;
  tools?: AITool[];
  toolChoice?: 'auto' | 'none' | 'required' | { type: 'function'; function: { name: string } };
}

/**
 * AI Tool Definition
 */
export interface AITool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, AIToolParameter>;
      required?: string[];
    };
  };
}

/**
 * AI Tool Parameter
 */
export interface AIToolParameter {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description?: string;
  enum?: string[];
  items?: AIToolParameter;
  properties?: Record<string, AIToolParameter>;
}

/**
 * AI Response
 */
export interface AIResponse {
  id: string;
  model: string;
  content: string | null;
  finishReason: 'stop' | 'length' | 'tool_calls' | 'content_filter' | null;
  toolCalls?: ToolCall[];
  usage: TokenUsage;
  created: Date;
}

/**
 * Token Usage
 */
export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

/**
 * Streaming Chunk
 */
export interface StreamingChunk {
  id: string;
  model: string;
  delta: {
    role?: MessageRole;
    content?: string;
    toolCalls?: Partial<ToolCall>[];
  };
  finishReason: 'stop' | 'length' | 'tool_calls' | 'content_filter' | null;
}

/**
 * Conversation Context
 */
export interface ConversationContext {
  id: string;
  userId: string;
  messages: ChatMessage[];
  metadata: Record<string, any>;
  tokenCount: number;
  maxTokens: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Prompt Template
 */
export interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  userPromptTemplate: string;
  variables: string[];
  defaultModel: AIModel;
  defaultOptions: Partial<CompletionOptions>;
  category: PromptCategory;
}

/**
 * Prompt Category
 */
export enum PromptCategory {
  FIELD_MAPPING = 'field_mapping',
  DATA_TRANSFORMATION = 'data_transformation',
  ERROR_DIAGNOSIS = 'error_diagnosis',
  QUERY_GENERATION = 'query_generation',
  DATA_CLASSIFICATION = 'data_classification',
  REPORT_SUMMARY = 'report_summary',
  GENERAL = 'general',
}

/**
 * AI Service Configuration
 */
export interface AIServiceConfig {
  apiKey: string;
  organization?: string;
  defaultModel: AIModel;
  maxRetries: number;
  timeout: number;
  maxTokensPerRequest: number;
  rateLimitPerMinute: number;
}

/**
 * AI Error Types
 */
export enum AIErrorType {
  RATE_LIMIT = 'rate_limit',
  INVALID_REQUEST = 'invalid_request',
  AUTHENTICATION = 'authentication',
  CONTEXT_LENGTH = 'context_length',
  CONTENT_FILTER = 'content_filter',
  SERVICE_UNAVAILABLE = 'service_unavailable',
  TIMEOUT = 'timeout',
  UNKNOWN = 'unknown',
}

/**
 * AI Error
 */
export interface AIError {
  type: AIErrorType;
  message: string;
  code?: string;
  retryable: boolean;
  retryAfter?: number;
}

/**
 * Embedding Options
 */
export interface EmbeddingOptions {
  model?: 'text-embedding-3-small' | 'text-embedding-3-large' | 'text-embedding-ada-002';
  dimensions?: number;
}

/**
 * Embedding Response
 */
export interface EmbeddingResponse {
  embedding: number[];
  usage: {
    promptTokens: number;
    totalTokens: number;
  };
}

/**
 * Token Count Result
 */
export interface TokenCountResult {
  tokens: number;
  model: AIModel;
  truncated: boolean;
  originalLength?: number;
}

