/**
 * Context Manager
 * Manages conversation context and history for AI interactions
 */

import { logger } from '../config/logger';
import {
  ConversationContext,
  ChatMessage,
  MessageRole,
} from './types';
import { TokenCounter } from './TokenCounter';

/**
 * Context Manager Options
 */
export interface ContextManagerOptions {
  maxTokens?: number;
  maxMessages?: number;
  preserveSystemMessages?: boolean;
  summaryThreshold?: number;
}

/**
 * Context Manager Class
 * Handles conversation state and token limits
 */
export class ContextManager {
  private contexts: Map<string, ConversationContext>;
  private tokenCounter: TokenCounter;
  private defaultMaxTokens: number;
  private defaultMaxMessages: number;

  constructor(options: ContextManagerOptions = {}) {
    this.contexts = new Map();
    this.tokenCounter = new TokenCounter();
    this.defaultMaxTokens = options.maxTokens || 8000;
    this.defaultMaxMessages = options.maxMessages || 50;

    logger.info('[ContextManager] Initialized');
  }

  /**
   * Create a new conversation context
   */
  createContext(
    userId: string,
    options: {
      systemPrompt?: string;
      metadata?: Record<string, any>;
      maxTokens?: number;
    } = {}
  ): ConversationContext {
    const contextId = this.generateContextId();

    const messages: ChatMessage[] = [];
    if (options.systemPrompt) {
      messages.push({
        role: MessageRole.SYSTEM,
        content: options.systemPrompt,
      });
    }

    const context: ConversationContext = {
      id: contextId,
      userId,
      messages,
      metadata: options.metadata || {},
      tokenCount: this.tokenCounter.countMessages(messages),
      maxTokens: options.maxTokens || this.defaultMaxTokens,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.contexts.set(contextId, context);
    logger.debug(`[ContextManager] Created context: ${contextId}`);

    return context;
  }

  /**
   * Get a conversation context
   */
  getContext(contextId: string): ConversationContext | undefined {
    return this.contexts.get(contextId);
  }

  /**
   * Add a message to context
   */
  addMessage(
    contextId: string,
    message: ChatMessage
  ): ConversationContext {
    const context = this.contexts.get(contextId);
    if (!context) {
      throw new Error(`Context not found: ${contextId}`);
    }

    // Add the message
    context.messages.push(message);
    context.tokenCount = this.tokenCounter.countMessages(context.messages);
    context.updatedAt = new Date();

    // Trim if needed
    this.trimContext(context);

    logger.debug(
      `[ContextManager] Added message to ${contextId}, tokens: ${context.tokenCount}`
    );

    return context;
  }

  /**
   * Add user message
   */
  addUserMessage(contextId: string, content: string): ConversationContext {
    return this.addMessage(contextId, {
      role: MessageRole.USER,
      content,
    });
  }

  /**
   * Add assistant message
   */
  addAssistantMessage(contextId: string, content: string): ConversationContext {
    return this.addMessage(contextId, {
      role: MessageRole.ASSISTANT,
      content,
    });
  }

  /**
   * Get messages for API call
   */
  getMessages(contextId: string): ChatMessage[] {
    const context = this.contexts.get(contextId);
    if (!context) {
      throw new Error(`Context not found: ${contextId}`);
    }
    return [...context.messages];
  }

  /**
   * Trim context to fit within token limits
   */
  private trimContext(context: ConversationContext): void {
    // If within limits, no trimming needed
    if (
      context.tokenCount <= context.maxTokens &&
      context.messages.length <= this.defaultMaxMessages
    ) {
      return;
    }

    logger.debug(
      `[ContextManager] Trimming context ${context.id}, ` +
      `tokens: ${context.tokenCount}/${context.maxTokens}`
    );

    // Preserve system messages
    const systemMessages = context.messages.filter(
      (m) => m.role === MessageRole.SYSTEM
    );
    const otherMessages = context.messages.filter(
      (m) => m.role !== MessageRole.SYSTEM
    );

    // Remove oldest messages until within limits
    while (
      otherMessages.length > 2 &&
      (context.tokenCount > context.maxTokens * 0.9 ||
        systemMessages.length + otherMessages.length > this.defaultMaxMessages)
    ) {
      otherMessages.shift();
      context.messages = [...systemMessages, ...otherMessages];
      context.tokenCount = this.tokenCounter.countMessages(context.messages);
    }

    logger.debug(
      `[ContextManager] Trimmed to ${context.messages.length} messages, ` +
      `${context.tokenCount} tokens`
    );
  }

  /**
   * Clear conversation history (keep system messages)
   */
  clearHistory(contextId: string): ConversationContext {
    const context = this.contexts.get(contextId);
    if (!context) {
      throw new Error(`Context not found: ${contextId}`);
    }

    context.messages = context.messages.filter(
      (m) => m.role === MessageRole.SYSTEM
    );
    context.tokenCount = this.tokenCounter.countMessages(context.messages);
    context.updatedAt = new Date();

    logger.debug(`[ContextManager] Cleared history for ${contextId}`);

    return context;
  }

  /**
   * Update system prompt
   */
  updateSystemPrompt(contextId: string, systemPrompt: string): ConversationContext {
    const context = this.contexts.get(contextId);
    if (!context) {
      throw new Error(`Context not found: ${contextId}`);
    }

    // Remove existing system messages
    context.messages = context.messages.filter(
      (m) => m.role !== MessageRole.SYSTEM
    );

    // Add new system message at the beginning
    context.messages.unshift({
      role: MessageRole.SYSTEM,
      content: systemPrompt,
    });

    context.tokenCount = this.tokenCounter.countMessages(context.messages);
    context.updatedAt = new Date();

    return context;
  }

  /**
   * Delete a context
   */
  deleteContext(contextId: string): boolean {
    const deleted = this.contexts.delete(contextId);
    if (deleted) {
      logger.debug(`[ContextManager] Deleted context: ${contextId}`);
    }
    return deleted;
  }

  /**
   * Get all contexts for a user
   */
  getUserContexts(userId: string): ConversationContext[] {
    return Array.from(this.contexts.values()).filter(
      (c) => c.userId === userId
    );
  }

  /**
   * Get context stats
   */
  getContextStats(contextId: string): {
    messageCount: number;
    tokenCount: number;
    tokenUsage: number;
    oldestMessage: Date | null;
    newestMessage: Date | null;
  } {
    const context = this.contexts.get(contextId);
    if (!context) {
      throw new Error(`Context not found: ${contextId}`);
    }

    return {
      messageCount: context.messages.length,
      tokenCount: context.tokenCount,
      tokenUsage: context.tokenCount / context.maxTokens,
      oldestMessage: context.createdAt,
      newestMessage: context.updatedAt,
    };
  }

  /**
   * Export context to JSON
   */
  exportContext(contextId: string): string {
    const context = this.contexts.get(contextId);
    if (!context) {
      throw new Error(`Context not found: ${contextId}`);
    }
    return JSON.stringify(context, null, 2);
  }

  /**
   * Import context from JSON
   */
  importContext(json: string): ConversationContext {
    const data = JSON.parse(json) as ConversationContext;
    data.id = this.generateContextId(); // Generate new ID
    data.createdAt = new Date(data.createdAt);
    data.updatedAt = new Date();
    this.contexts.set(data.id, data);
    return data;
  }

  /**
   * Generate unique context ID
   */
  private generateContextId(): string {
    return `ctx_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Cleanup old contexts
   */
  cleanupOldContexts(maxAge: number = 24 * 60 * 60 * 1000): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [id, context] of this.contexts.entries()) {
      if (now - context.updatedAt.getTime() > maxAge) {
        this.contexts.delete(id);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.info(`[ContextManager] Cleaned up ${cleaned} old contexts`);
    }

    return cleaned;
  }

  /**
   * Get total contexts count
   */
  getContextCount(): number {
    return this.contexts.size;
  }
}

// Export singleton instance
export const contextManager = new ContextManager();

