/**
 * AI Service
 * Unified service for all AI functionality
 */

import { logger } from '../config/logger';
import { openAIService, OpenAIService } from './OpenAIService';
import { promptTemplateManager, PromptTemplateManager } from './PromptTemplates';
import { contextManager, ContextManager } from './ContextManager';
import { tokenCounter, TokenCounter } from './TokenCounter';
import {
  AIModel,
  ChatMessage,
  MessageRole,
  CompletionOptions,
  AIResponse,
  StreamingChunk,
  PromptCategory,
  AIError,
  AIErrorType,
} from './types';

/**
 * Field Mapping Suggestion Result
 */
export interface FieldMappingSuggestion {
  mappings: Array<{
    sourceField: string;
    targetField: string;
    confidence: number;
    transformation: string;
    notes: string;
  }>;
  unmappedSource: string[];
  unmappedTarget: string[];
  recommendations: string[];
}

/**
 * OData Query Result
 */
export interface ODataQueryResult {
  odataQuery: string;
  explanation: string;
  filters: Array<{
    field: string;
    operator: string;
    value: string;
  }>;
  select: string[];
  orderBy: Array<{
    field: string;
    direction: 'asc' | 'desc';
  }>;
  top: number | null;
  skip: number | null;
  expand: string[];
  warnings: string[];
}

/**
 * Error Diagnosis Result
 */
export interface ErrorDiagnosisResult {
  rootCause: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  solutions: Array<{
    priority: number;
    action: string;
    details: string;
  }>;
  preventiveMeasures: string[];
  relatedIssues: string[];
}

/**
 * AI Service Class
 * High-level API for AI features
 */
export class AIService {
  private openai: OpenAIService;
  private templates: PromptTemplateManager;
  private contexts: ContextManager;
  private tokens: TokenCounter;

  constructor() {
    this.openai = openAIService;
    this.templates = promptTemplateManager;
    this.contexts = contextManager;
    this.tokens = tokenCounter;

    logger.info('[AIService] Initialized');
  }

  // ==========================================
  // FIELD MAPPING FEATURES
  // ==========================================

  /**
   * Suggest field mappings between source and target schemas
   */
  async suggestFieldMappings(
    sourceSchema: Record<string, any>,
    targetSchema: Record<string, any>,
    context?: string
  ): Promise<FieldMappingSuggestion> {
    logger.debug('[AIService] Suggesting field mappings');

    const messages = this.templates.buildMessages('FIELD_MAPPING', {
      sourceSchema: JSON.stringify(sourceSchema, null, 2),
      targetSchema: JSON.stringify(targetSchema, null, 2),
      context: context || 'No additional context provided',
    });

    const template = this.templates.getTemplate('FIELD_MAPPING')!;
    const response = await this.openai.createCompletion(messages, {
      ...template.defaultOptions,
      model: template.defaultModel,
    });

    return JSON.parse(response.content || '{}') as FieldMappingSuggestion;
  }

  // ==========================================
  // QUERY GENERATION FEATURES
  // ==========================================

  /**
   * Convert natural language to OData query
   */
  async naturalLanguageToOData(
    query: string,
    entitySet: string,
    fields: string[],
    version: 'v2' | 'v4' = 'v4'
  ): Promise<ODataQueryResult> {
    logger.debug('[AIService] Converting NL to OData:', query);

    const messages = this.templates.buildMessages('NL_TO_ODATA', {
      query,
      entitySet,
      fields: fields.join(', '),
      version,
    });

    const template = this.templates.getTemplate('NL_TO_ODATA')!;
    const response = await this.openai.createCompletion(messages, {
      ...template.defaultOptions,
      model: template.defaultModel,
    });

    return JSON.parse(response.content || '{}') as ODataQueryResult;
  }

  // ==========================================
  // ERROR DIAGNOSIS FEATURES
  // ==========================================

  /**
   * Diagnose an error and suggest solutions
   */
  async diagnoseError(
    errorType: string,
    errorMessage: string,
    errorCode: string | undefined,
    context: {
      system: string;
      operation: string;
      timestamp?: Date;
      logs?: string;
    }
  ): Promise<ErrorDiagnosisResult> {
    logger.debug('[AIService] Diagnosing error:', errorMessage);

    const messages = this.templates.buildMessages('ERROR_DIAGNOSIS', {
      errorType,
      errorMessage,
      errorCode: errorCode || 'N/A',
      system: context.system,
      operation: context.operation,
      timestamp: (context.timestamp || new Date()).toISOString(),
      logs: context.logs || 'No additional logs available',
    });

    const template = this.templates.getTemplate('ERROR_DIAGNOSIS')!;
    const response = await this.openai.createCompletion(messages, {
      ...template.defaultOptions,
      model: template.defaultModel,
    });

    return JSON.parse(response.content || '{}') as ErrorDiagnosisResult;
  }

  // ==========================================
  // DATA CLASSIFICATION FEATURES
  // ==========================================

  /**
   * Classify data fields for sensitivity
   */
  async classifyData(
    fields: Array<{ name: string; type: string; description?: string }>,
    sampleData?: Record<string, any>[],
    context?: string
  ): Promise<any> {
    logger.debug('[AIService] Classifying data fields');

    const messages = this.templates.buildMessages('DATA_CLASSIFICATION', {
      fields: JSON.stringify(fields, null, 2),
      sampleData: sampleData ? JSON.stringify(sampleData, null, 2) : 'Not provided',
      context: context || 'No additional context',
    });

    const template = this.templates.getTemplate('DATA_CLASSIFICATION')!;
    const response = await this.openai.createCompletion(messages, {
      ...template.defaultOptions,
      model: template.defaultModel,
    });

    return JSON.parse(response.content || '{}');
  }

  // ==========================================
  // REPORT SUMMARIZATION FEATURES
  // ==========================================

  /**
   * Summarize a data report
   */
  async summarizeReport(
    reportType: string,
    timePeriod: string,
    data: any,
    focusAreas?: string[]
  ): Promise<any> {
    logger.debug('[AIService] Summarizing report');

    const messages = this.templates.buildMessages('REPORT_SUMMARY', {
      reportType,
      timePeriod,
      data: typeof data === 'string' ? data : JSON.stringify(data, null, 2),
      focusAreas: focusAreas?.join(', ') || 'No specific focus areas',
    });

    const template = this.templates.getTemplate('REPORT_SUMMARY')!;
    const response = await this.openai.createCompletion(messages, {
      ...template.defaultOptions,
      model: template.defaultModel,
    });

    return JSON.parse(response.content || '{}');
  }

  // ==========================================
  // DATA TRANSFORMATION FEATURES
  // ==========================================

  /**
   * Generate data transformation rules
   */
  async generateTransformationRules(
    sourceFormat: Record<string, any>,
    targetFormat: Record<string, any>,
    sampleData?: any,
    businessRules?: string
  ): Promise<any> {
    logger.debug('[AIService] Generating transformation rules');

    const messages = this.templates.buildMessages('DATA_TRANSFORMATION', {
      sourceFormat: JSON.stringify(sourceFormat, null, 2),
      targetFormat: JSON.stringify(targetFormat, null, 2),
      sampleData: sampleData ? JSON.stringify(sampleData, null, 2) : 'Not provided',
      businessRules: businessRules || 'No specific business rules',
    });

    const template = this.templates.getTemplate('DATA_TRANSFORMATION')!;
    const response = await this.openai.createCompletion(messages, {
      ...template.defaultOptions,
      model: template.defaultModel,
    });

    return JSON.parse(response.content || '{}');
  }

  // ==========================================
  // CHAT / ASSISTANT FEATURES
  // ==========================================

  /**
   * Create a new chat session
   */
  createChatSession(
    userId: string,
    systemPrompt?: string
  ): string {
    const context = this.contexts.createContext(userId, {
      systemPrompt: systemPrompt || this.templates.getTemplate('ERP_ASSISTANT')!.systemPrompt,
    });
    return context.id;
  }

  /**
   * Send a chat message and get response
   */
  async chat(
    sessionId: string,
    message: string,
    options?: CompletionOptions
  ): Promise<AIResponse> {
    logger.debug(`[AIService] Chat message in session ${sessionId}`);

    // Add user message to context
    this.contexts.addUserMessage(sessionId, message);

    // Get all messages
    const messages = this.contexts.getMessages(sessionId);

    // Get completion
    const response = await this.openai.createCompletion(messages, {
      model: AIModel.GPT_4O_MINI,
      ...options,
    });

    // Add assistant response to context
    if (response.content) {
      this.contexts.addAssistantMessage(sessionId, response.content);
    }

    return response;
  }

  /**
   * Send a chat message with streaming response
   */
  async *chatStream(
    sessionId: string,
    message: string,
    options?: CompletionOptions
  ): AsyncGenerator<StreamingChunk, void, unknown> {
    logger.debug(`[AIService] Streaming chat in session ${sessionId}`);

    // Add user message to context
    this.contexts.addUserMessage(sessionId, message);

    // Get all messages
    const messages = this.contexts.getMessages(sessionId);

    // Stream completion
    let fullContent = '';
    for await (const chunk of this.openai.createStreamingCompletion(messages, {
      model: AIModel.GPT_4O_MINI,
      ...options,
    })) {
      if (chunk.delta.content) {
        fullContent += chunk.delta.content;
      }
      yield chunk;
    }

    // Add assistant response to context
    if (fullContent) {
      this.contexts.addAssistantMessage(sessionId, fullContent);
    }
  }

  /**
   * Clear chat session history
   */
  clearChatHistory(sessionId: string): void {
    this.contexts.clearHistory(sessionId);
    logger.debug(`[AIService] Cleared chat history for ${sessionId}`);
  }

  /**
   * End chat session
   */
  endChatSession(sessionId: string): void {
    this.contexts.deleteContext(sessionId);
    logger.debug(`[AIService] Ended chat session ${sessionId}`);
  }

  // ==========================================
  // SIMPLE COMPLETION METHODS
  // ==========================================

  /**
   * Simple text completion
   */
  async complete(
    prompt: string,
    systemPrompt?: string,
    options?: CompletionOptions
  ): Promise<string> {
    return this.openai.complete(prompt, systemPrompt, options);
  }

  /**
   * JSON completion
   */
  async completeJSON<T = any>(
    prompt: string,
    systemPrompt?: string,
    options?: CompletionOptions
  ): Promise<T> {
    return this.openai.completeJSON<T>(prompt, systemPrompt, options);
  }

  // ==========================================
  // UTILITY METHODS
  // ==========================================

  /**
   * Count tokens in text
   */
  countTokens(text: string): number {
    return this.tokens.countTokens(text);
  }

  /**
   * Estimate cost for a request
   */
  estimateCost(
    promptTokens: number,
    completionTokens: number,
    model?: AIModel
  ): {
    promptCost: number;
    completionCost: number;
    totalCost: number;
  } {
    return this.tokens.estimateCost(promptTokens, completionTokens, model);
  }

  /**
   * Get available templates
   */
  getTemplates(): any[] {
    return this.templates.getAllTemplates();
  }

  /**
   * Get templates by category
   */
  getTemplatesByCategory(category: PromptCategory): any[] {
    return this.templates.getTemplatesByCategory(category);
  }

  /**
   * Get available models
   */
  getAvailableModels(): AIModel[] {
    return this.openai.getAvailableModels();
  }

  /**
   * Set default model
   */
  setDefaultModel(model: AIModel): void {
    this.openai.setDefaultModel(model);
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{
    status: 'ok' | 'error';
    model: AIModel;
    latency?: number;
    error?: string;
  }> {
    const startTime = Date.now();
    try {
      await this.openai.complete('Hello', undefined, {
        maxTokens: 5,
        model: AIModel.GPT_4O_MINI,
      });

      return {
        status: 'ok',
        model: this.openai.getDefaultModel(),
        latency: Date.now() - startTime,
      };
    } catch (error) {
      return {
        status: 'error',
        model: this.openai.getDefaultModel(),
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// Export singleton instance
export const aiService = new AIService();

