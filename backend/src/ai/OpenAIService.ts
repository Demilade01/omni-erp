/**
 * OpenAI Service
 * Core service for interacting with OpenAI API
 */

import OpenAI from 'openai';
import { logger } from '../config/logger';
import { env } from '../config/env';
import {
  AIModel,
  MessageRole,
  ChatMessage,
  CompletionOptions,
  AIResponse,
  StreamingChunk,
  AIError,
  AIErrorType,
  EmbeddingOptions,
  EmbeddingResponse,
} from './types';

export class OpenAIService {
  private client: OpenAI;
  private defaultModel: AIModel;

  constructor() {
    this.client = new OpenAI({
      apiKey: env.OPENAI_API_KEY,
      maxRetries: 3,
      timeout: 60000, // 60 seconds
    });

    this.defaultModel = AIModel.GPT_4O_MINI;

    logger.info('[OpenAIService] Initialized with model:', this.defaultModel);
  }

  /**
   * Create a chat completion
   */
  async createCompletion(
    messages: ChatMessage[],
    options: CompletionOptions = {}
  ): Promise<AIResponse> {
    const model = options.model || this.defaultModel;

    logger.debug(`[OpenAIService] Creating completion with ${messages.length} messages`);

    try {
      const response = await this.client.chat.completions.create({
        model,
        messages: this.formatMessages(messages),
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens,
        top_p: options.topP,
        frequency_penalty: options.frequencyPenalty,
        presence_penalty: options.presencePenalty,
        stop: options.stop,
        response_format: options.responseFormat
          ? { type: options.responseFormat }
          : undefined,
        seed: options.seed,
        tools: options.tools?.map((tool) => ({
          type: tool.type,
          function: tool.function,
        })),
        tool_choice: options.toolChoice,
      });

      const choice = response.choices[0];
      const usage = response.usage;

      const result: AIResponse = {
        id: response.id,
        model: response.model,
        content: choice.message.content,
        finishReason: choice.finish_reason as AIResponse['finishReason'],
        toolCalls: choice.message.tool_calls?.map((tc) => ({
          id: tc.id,
          type: tc.type,
          function: {
            name: tc.function.name,
            arguments: tc.function.arguments,
          },
        })),
        usage: {
          promptTokens: usage?.prompt_tokens || 0,
          completionTokens: usage?.completion_tokens || 0,
          totalTokens: usage?.total_tokens || 0,
        },
        created: new Date(response.created * 1000),
      };

      logger.debug(`[OpenAIService] Completion successful, tokens: ${result.usage.totalTokens}`);

      return result;
    } catch (error) {
      const aiError = this.handleError(error);
      logger.error(`[OpenAIService] Completion failed:`, aiError);
      throw aiError;
    }
  }

  /**
   * Create a streaming chat completion
   */
  async *createStreamingCompletion(
    messages: ChatMessage[],
    options: CompletionOptions = {}
  ): AsyncGenerator<StreamingChunk, void, unknown> {
    const model = options.model || this.defaultModel;

    logger.debug(`[OpenAIService] Creating streaming completion`);

    try {
      const stream = await this.client.chat.completions.create({
        model,
        messages: this.formatMessages(messages),
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens,
        top_p: options.topP,
        frequency_penalty: options.frequencyPenalty,
        presence_penalty: options.presencePenalty,
        stop: options.stop,
        stream: true,
        tools: options.tools?.map((tool) => ({
          type: tool.type,
          function: tool.function,
        })),
        tool_choice: options.toolChoice,
      });

      for await (const chunk of stream) {
        const choice = chunk.choices[0];
        if (!choice) continue;

        yield {
          id: chunk.id,
          model: chunk.model,
          delta: {
            role: choice.delta.role as MessageRole | undefined,
            content: choice.delta.content || undefined,
            toolCalls: choice.delta.tool_calls?.map((tc) => ({
              id: tc.id,
              type: tc.type,
              function: tc.function
                ? {
                    name: tc.function.name || '',
                    arguments: tc.function.arguments || '',
                  }
                : undefined,
            })),
          },
          finishReason: choice.finish_reason as StreamingChunk['finishReason'],
        };
      }

      logger.debug(`[OpenAIService] Streaming completion finished`);
    } catch (error) {
      const aiError = this.handleError(error);
      logger.error(`[OpenAIService] Streaming failed:`, aiError);
      throw aiError;
    }
  }

  /**
   * Create embeddings for text
   */
  async createEmbedding(
    text: string | string[],
    options: EmbeddingOptions = {}
  ): Promise<EmbeddingResponse[]> {
    const model = options.model || 'text-embedding-3-small';
    const input = Array.isArray(text) ? text : [text];

    logger.debug(`[OpenAIService] Creating embeddings for ${input.length} texts`);

    try {
      const response = await this.client.embeddings.create({
        model,
        input,
        dimensions: options.dimensions,
      });

      return response.data.map((item) => ({
        embedding: item.embedding,
        usage: {
          promptTokens: Math.floor(response.usage.prompt_tokens / input.length),
          totalTokens: Math.floor(response.usage.total_tokens / input.length),
        },
      }));
    } catch (error) {
      const aiError = this.handleError(error);
      logger.error(`[OpenAIService] Embedding failed:`, aiError);
      throw aiError;
    }
  }

  /**
   * Simple text completion (convenience method)
   */
  async complete(
    prompt: string,
    systemPrompt?: string,
    options: CompletionOptions = {}
  ): Promise<string> {
    const messages: ChatMessage[] = [];

    if (systemPrompt) {
      messages.push({
        role: MessageRole.SYSTEM,
        content: systemPrompt,
      });
    }

    messages.push({
      role: MessageRole.USER,
      content: prompt,
    });

    const response = await this.createCompletion(messages, options);
    return response.content || '';
  }

  /**
   * JSON completion (returns parsed JSON)
   */
  async completeJSON<T = any>(
    prompt: string,
    systemPrompt?: string,
    options: CompletionOptions = {}
  ): Promise<T> {
    const response = await this.complete(prompt, systemPrompt, {
      ...options,
      responseFormat: 'json_object',
    });

    try {
      return JSON.parse(response) as T;
    } catch (error) {
      logger.error('[OpenAIService] Failed to parse JSON response:', response);
      throw new Error('Failed to parse AI response as JSON');
    }
  }

  /**
   * Format messages for OpenAI API
   */
  private formatMessages(messages: ChatMessage[]): OpenAI.ChatCompletionMessageParam[] {
    return messages.map((msg) => {
      const base: any = {
        role: msg.role,
        content: msg.content,
      };

      if (msg.name) {
        base.name = msg.name;
      }

      if (msg.toolCalls) {
        base.tool_calls = msg.toolCalls.map((tc) => ({
          id: tc.id,
          type: tc.type,
          function: tc.function,
        }));
      }

      return base;
    });
  }

  /**
   * Handle OpenAI API errors
   */
  private handleError(error: unknown): AIError {
    if (error instanceof OpenAI.APIError) {
      const statusCode = error.status;

      if (statusCode === 429) {
        const retryAfter = parseInt(error.headers?.['retry-after'] || '60', 10);
        return {
          type: AIErrorType.RATE_LIMIT,
          message: 'Rate limit exceeded. Please try again later.',
          code: error.code || undefined,
          retryable: true,
          retryAfter,
        };
      }

      if (statusCode === 401) {
        return {
          type: AIErrorType.AUTHENTICATION,
          message: 'Invalid API key or unauthorized access.',
          code: error.code || undefined,
          retryable: false,
        };
      }

      if (statusCode === 400) {
        if (error.message?.includes('context_length')) {
          return {
            type: AIErrorType.CONTEXT_LENGTH,
            message: 'Input too long. Please reduce the message length.',
            code: error.code || undefined,
            retryable: false,
          };
        }
        return {
          type: AIErrorType.INVALID_REQUEST,
          message: error.message || 'Invalid request.',
          code: error.code || undefined,
          retryable: false,
        };
      }

      if (statusCode === 503) {
        return {
          type: AIErrorType.SERVICE_UNAVAILABLE,
          message: 'OpenAI service is temporarily unavailable.',
          code: error.code || undefined,
          retryable: true,
          retryAfter: 30,
        };
      }
    }

    if (error instanceof OpenAI.APIConnectionError) {
      return {
        type: AIErrorType.SERVICE_UNAVAILABLE,
        message: 'Failed to connect to OpenAI API.',
        retryable: true,
        retryAfter: 10,
      };
    }

    if (error instanceof OpenAI.RateLimitError) {
      return {
        type: AIErrorType.RATE_LIMIT,
        message: 'Rate limit exceeded.',
        retryable: true,
        retryAfter: 60,
      };
    }

    if (error instanceof OpenAI.AuthenticationError) {
      return {
        type: AIErrorType.AUTHENTICATION,
        message: 'Authentication failed.',
        retryable: false,
      };
    }

    // Unknown error
    return {
      type: AIErrorType.UNKNOWN,
      message: error instanceof Error ? error.message : 'An unknown error occurred.',
      retryable: false,
    };
  }

  /**
   * Get available models
   */
  getAvailableModels(): AIModel[] {
    return Object.values(AIModel);
  }

  /**
   * Set default model
   */
  setDefaultModel(model: AIModel): void {
    this.defaultModel = model;
    logger.info(`[OpenAIService] Default model changed to: ${model}`);
  }

  /**
   * Get current default model
   */
  getDefaultModel(): AIModel {
    return this.defaultModel;
  }
}

// Export singleton instance
export const openAIService = new OpenAIService();

