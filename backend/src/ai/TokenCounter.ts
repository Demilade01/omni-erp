/**
 * Token Counter
 * Utilities for counting and managing tokens
 */

import { ChatMessage, AIModel, TokenCountResult } from './types';

/**
 * Token limits by model
 */
export const MODEL_TOKEN_LIMITS: Record<AIModel, number> = {
  [AIModel.GPT_4]: 8192,
  [AIModel.GPT_4_TURBO]: 128000,
  [AIModel.GPT_4O]: 128000,
  [AIModel.GPT_4O_MINI]: 128000,
  [AIModel.GPT_35_TURBO]: 16385,
};

/**
 * Tokens per message overhead
 * Each message has a fixed token overhead for formatting
 */
const TOKENS_PER_MESSAGE = 4; // <im_start>, role, <im_sep>, <im_end>
const TOKENS_PER_NAME = -1; // If name is present, role is omitted

/**
 * Token Counter Class
 * Estimates token counts for messages
 */
export class TokenCounter {
  private model: AIModel;

  constructor(model: AIModel = AIModel.GPT_4O_MINI) {
    this.model = model;
  }

  /**
   * Count tokens in a string
   * Note: This is an approximation. For exact counts, use tiktoken.
   */
  countTokens(text: string): number {
    if (!text) return 0;

    // Approximate token count
    // Average English word is ~4 characters, average token is ~4 characters
    // This gives roughly 1 token per word on average

    // More accurate approximation:
    // - Split on whitespace and punctuation
    // - Count special characters
    // - Add overhead for formatting

    const words = text.split(/\s+/).filter(Boolean);

    // Base estimate: ~0.75 tokens per word + overhead for special chars
    let tokens = Math.ceil(words.length * 0.75);

    // Add tokens for long words (> 10 chars get extra tokens)
    for (const word of words) {
      if (word.length > 10) {
        tokens += Math.floor((word.length - 10) / 4);
      }
    }

    // Add tokens for special characters and punctuation
    const specialChars = (text.match(/[^a-zA-Z0-9\s]/g) || []).length;
    tokens += Math.ceil(specialChars * 0.3);

    // JSON/code content typically has more tokens
    if (text.includes('{') || text.includes('[') || text.includes('```')) {
      tokens = Math.ceil(tokens * 1.2);
    }

    // Minimum of 1 token for any non-empty string
    return Math.max(1, tokens);
  }

  /**
   * Count tokens in a message
   */
  countMessageTokens(message: ChatMessage): number {
    let tokens = TOKENS_PER_MESSAGE;

    // Content tokens
    tokens += this.countTokens(message.content);

    // Role tokens (usually 1)
    tokens += 1;

    // Name overhead
    if (message.name) {
      tokens += TOKENS_PER_NAME;
      tokens += this.countTokens(message.name);
    }

    // Function/tool call tokens
    if (message.functionCall) {
      tokens += this.countTokens(message.functionCall.name);
      tokens += this.countTokens(message.functionCall.arguments);
    }

    if (message.toolCalls) {
      for (const tc of message.toolCalls) {
        tokens += this.countTokens(tc.function.name);
        tokens += this.countTokens(tc.function.arguments);
        tokens += 3; // ID and formatting
      }
    }

    return tokens;
  }

  /**
   * Count tokens in messages array
   */
  countMessages(messages: ChatMessage[]): number {
    let tokens = 0;

    for (const message of messages) {
      tokens += this.countMessageTokens(message);
    }

    // Add tokens for reply priming
    tokens += 3;

    return tokens;
  }

  /**
   * Count tokens with result details
   */
  countWithDetails(
    text: string,
    model: AIModel = this.model
  ): TokenCountResult {
    const limit = MODEL_TOKEN_LIMITS[model];
    const tokens = this.countTokens(text);
    const truncated = tokens > limit;

    return {
      tokens,
      model,
      truncated,
      originalLength: truncated ? text.length : undefined,
    };
  }

  /**
   * Truncate text to fit within token limit
   */
  truncateToFit(
    text: string,
    maxTokens: number,
    preserveEnd: boolean = false
  ): string {
    const currentTokens = this.countTokens(text);

    if (currentTokens <= maxTokens) {
      return text;
    }

    // Estimate characters per token
    const charsPerToken = text.length / currentTokens;
    const targetChars = Math.floor(maxTokens * charsPerToken * 0.9); // 90% to be safe

    if (preserveEnd) {
      return '...' + text.slice(-targetChars);
    }
    return text.slice(0, targetChars) + '...';
  }

  /**
   * Check if messages fit within model limit
   */
  fitsInContext(messages: ChatMessage[], model: AIModel = this.model): boolean {
    const tokens = this.countMessages(messages);
    const limit = MODEL_TOKEN_LIMITS[model];
    return tokens < limit;
  }

  /**
   * Get remaining tokens for a model
   */
  getRemainingTokens(
    messages: ChatMessage[],
    model: AIModel = this.model
  ): number {
    const used = this.countMessages(messages);
    const limit = MODEL_TOKEN_LIMITS[model];
    return Math.max(0, limit - used);
  }

  /**
   * Get token usage percentage
   */
  getUsagePercentage(
    messages: ChatMessage[],
    model: AIModel = this.model
  ): number {
    const used = this.countMessages(messages);
    const limit = MODEL_TOKEN_LIMITS[model];
    return (used / limit) * 100;
  }

  /**
   * Estimate cost for tokens
   * Prices in USD per 1K tokens (approximate, check OpenAI pricing)
   */
  estimateCost(
    promptTokens: number,
    completionTokens: number,
    model: AIModel = this.model
  ): {
    promptCost: number;
    completionCost: number;
    totalCost: number;
  } {
    const pricing: Record<AIModel, { prompt: number; completion: number }> = {
      [AIModel.GPT_4]: { prompt: 0.03, completion: 0.06 },
      [AIModel.GPT_4_TURBO]: { prompt: 0.01, completion: 0.03 },
      [AIModel.GPT_4O]: { prompt: 0.005, completion: 0.015 },
      [AIModel.GPT_4O_MINI]: { prompt: 0.00015, completion: 0.0006 },
      [AIModel.GPT_35_TURBO]: { prompt: 0.0005, completion: 0.0015 },
    };

    const rates = pricing[model] || pricing[AIModel.GPT_4O_MINI];
    const promptCost = (promptTokens / 1000) * rates.prompt;
    const completionCost = (completionTokens / 1000) * rates.completion;

    return {
      promptCost,
      completionCost,
      totalCost: promptCost + completionCost,
    };
  }

  /**
   * Get model token limit
   */
  getModelLimit(model: AIModel = this.model): number {
    return MODEL_TOKEN_LIMITS[model];
  }

  /**
   * Set default model
   */
  setModel(model: AIModel): void {
    this.model = model;
  }
}

// Export singleton instance
export const tokenCounter = new TokenCounter();

