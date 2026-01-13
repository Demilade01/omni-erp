/**
 * AI Controller
 * API endpoints for AI-powered features
 */

import { Request, Response, NextFunction } from 'express';
import { aiService } from '../ai';
import { AIModel, PromptCategory } from '../ai/types';
import { logger } from '../config/logger';

/**
 * @swagger
 * tags:
 *   name: AI
 *   description: AI-powered features and chat
 */

/**
 * @swagger
 * /api/v1/ai/health:
 *   get:
 *     summary: Check AI service health
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: AI service health status
 */
export const healthCheck = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const health = await aiService.healthCheck();

    res.json({
      success: true,
      data: health,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/v1/ai/complete:
 *   post:
 *     summary: Simple text completion
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - prompt
 *             properties:
 *               prompt:
 *                 type: string
 *               systemPrompt:
 *                 type: string
 *               model:
 *                 type: string
 *                 enum: [gpt-4, gpt-4-turbo-preview, gpt-4o, gpt-4o-mini, gpt-3.5-turbo]
 *               temperature:
 *                 type: number
 *               maxTokens:
 *                 type: number
 *     responses:
 *       200:
 *         description: Completion response
 */
export const complete = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { prompt, systemPrompt, model, temperature, maxTokens } = req.body;

    if (!prompt) {
      res.status(400).json({
        success: false,
        error: 'Prompt is required',
      });
      return;
    }

    logger.info(`[AI] Completion request from user ${req.user?.userId}`);

    const response = await aiService.complete(prompt, systemPrompt, {
      model: model as AIModel,
      temperature,
      maxTokens,
    });

    res.json({
      success: true,
      data: {
        response,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/v1/ai/field-mapping:
 *   post:
 *     summary: Suggest field mappings between schemas
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - sourceSchema
 *               - targetSchema
 *             properties:
 *               sourceSchema:
 *                 type: object
 *               targetSchema:
 *                 type: object
 *               context:
 *                 type: string
 *     responses:
 *       200:
 *         description: Field mapping suggestions
 */
export const suggestFieldMappings = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { sourceSchema, targetSchema, context } = req.body;

    if (!sourceSchema || !targetSchema) {
      res.status(400).json({
        success: false,
        error: 'Both sourceSchema and targetSchema are required',
      });
      return;
    }

    logger.info(`[AI] Field mapping request from user ${req.user?.userId}`);

    const suggestions = await aiService.suggestFieldMappings(
      sourceSchema,
      targetSchema,
      context
    );

    res.json({
      success: true,
      data: suggestions,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/v1/ai/nl-to-odata:
 *   post:
 *     summary: Convert natural language to OData query
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - query
 *               - entitySet
 *               - fields
 *             properties:
 *               query:
 *                 type: string
 *                 description: Natural language query
 *               entitySet:
 *                 type: string
 *                 description: OData entity set name
 *               fields:
 *                 type: array
 *                 items:
 *                   type: string
 *               version:
 *                 type: string
 *                 enum: [v2, v4]
 *                 default: v4
 *     responses:
 *       200:
 *         description: OData query result
 */
export const naturalLanguageToOData = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { query, entitySet, fields, version = 'v4' } = req.body;

    if (!query || !entitySet || !fields) {
      res.status(400).json({
        success: false,
        error: 'query, entitySet, and fields are required',
      });
      return;
    }

    logger.info(`[AI] NL to OData request from user ${req.user?.userId}`);

    const result = await aiService.naturalLanguageToOData(
      query,
      entitySet,
      fields,
      version
    );

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/v1/ai/diagnose-error:
 *   post:
 *     summary: Diagnose an error and suggest solutions
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - errorType
 *               - errorMessage
 *               - system
 *               - operation
 *             properties:
 *               errorType:
 *                 type: string
 *               errorMessage:
 *                 type: string
 *               errorCode:
 *                 type: string
 *               system:
 *                 type: string
 *               operation:
 *                 type: string
 *               logs:
 *                 type: string
 *     responses:
 *       200:
 *         description: Error diagnosis result
 */
export const diagnoseError = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { errorType, errorMessage, errorCode, system, operation, logs } = req.body;

    if (!errorType || !errorMessage || !system || !operation) {
      res.status(400).json({
        success: false,
        error: 'errorType, errorMessage, system, and operation are required',
      });
      return;
    }

    logger.info(`[AI] Error diagnosis request from user ${req.user?.userId}`);

    const diagnosis = await aiService.diagnoseError(
      errorType,
      errorMessage,
      errorCode,
      {
        system,
        operation,
        logs,
      }
    );

    res.json({
      success: true,
      data: diagnosis,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/v1/ai/classify-data:
 *   post:
 *     summary: Classify data fields for sensitivity
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fields
 *             properties:
 *               fields:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     type:
 *                       type: string
 *                     description:
 *                       type: string
 *               sampleData:
 *                 type: array
 *               context:
 *                 type: string
 *     responses:
 *       200:
 *         description: Data classification result
 */
export const classifyData = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { fields, sampleData, context } = req.body;

    if (!fields || !Array.isArray(fields)) {
      res.status(400).json({
        success: false,
        error: 'fields array is required',
      });
      return;
    }

    logger.info(`[AI] Data classification request from user ${req.user?.userId}`);

    const classification = await aiService.classifyData(
      fields,
      sampleData,
      context
    );

    res.json({
      success: true,
      data: classification,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/v1/ai/summarize-report:
 *   post:
 *     summary: Summarize a data report
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reportType
 *               - timePeriod
 *               - data
 *             properties:
 *               reportType:
 *                 type: string
 *               timePeriod:
 *                 type: string
 *               data:
 *                 type: object
 *               focusAreas:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Report summary
 */
export const summarizeReport = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { reportType, timePeriod, data, focusAreas } = req.body;

    if (!reportType || !timePeriod || !data) {
      res.status(400).json({
        success: false,
        error: 'reportType, timePeriod, and data are required',
      });
      return;
    }

    logger.info(`[AI] Report summarization request from user ${req.user?.userId}`);

    const summary = await aiService.summarizeReport(
      reportType,
      timePeriod,
      data,
      focusAreas
    );

    res.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/v1/ai/transform-rules:
 *   post:
 *     summary: Generate data transformation rules
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - sourceFormat
 *               - targetFormat
 *             properties:
 *               sourceFormat:
 *                 type: object
 *               targetFormat:
 *                 type: object
 *               sampleData:
 *                 type: object
 *               businessRules:
 *                 type: string
 *     responses:
 *       200:
 *         description: Transformation rules
 */
export const generateTransformationRules = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { sourceFormat, targetFormat, sampleData, businessRules } = req.body;

    if (!sourceFormat || !targetFormat) {
      res.status(400).json({
        success: false,
        error: 'sourceFormat and targetFormat are required',
      });
      return;
    }

    logger.info(`[AI] Transformation rules request from user ${req.user?.userId}`);

    const rules = await aiService.generateTransformationRules(
      sourceFormat,
      targetFormat,
      sampleData,
      businessRules
    );

    res.json({
      success: true,
      data: rules,
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// CHAT ENDPOINTS
// ==========================================

/**
 * @swagger
 * /api/v1/ai/chat/sessions:
 *   post:
 *     summary: Create a new chat session
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               systemPrompt:
 *                 type: string
 *                 description: Optional custom system prompt
 *     responses:
 *       201:
 *         description: Chat session created
 */
export const createChatSession = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { systemPrompt } = req.body;
    const userId = req.user!.userId;

    const sessionId = aiService.createChatSession(userId, systemPrompt);

    logger.info(`[AI] Created chat session ${sessionId} for user ${userId}`);

    res.status(201).json({
      success: true,
      data: {
        sessionId,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/v1/ai/chat/{sessionId}/message:
 *   post:
 *     summary: Send a message in a chat session
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - message
 *             properties:
 *               message:
 *                 type: string
 *     responses:
 *       200:
 *         description: AI response
 */
export const sendChatMessage = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { sessionId } = req.params;
    const { message } = req.body;

    if (!message) {
      res.status(400).json({
        success: false,
        error: 'Message is required',
      });
      return;
    }

    logger.info(`[AI] Chat message in session ${sessionId}`);

    const response = await aiService.chat(sessionId, message);

    res.json({
      success: true,
      data: {
        response: response.content,
        usage: response.usage,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/v1/ai/chat/{sessionId}/stream:
 *   post:
 *     summary: Send a message with streaming response
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - message
 *             properties:
 *               message:
 *                 type: string
 *     responses:
 *       200:
 *         description: Streaming response (Server-Sent Events)
 */
export const streamChatMessage = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { sessionId } = req.params;
    const { message } = req.body;

    if (!message) {
      res.status(400).json({
        success: false,
        error: 'Message is required',
      });
      return;
    }

    logger.info(`[AI] Streaming chat message in session ${sessionId}`);

    // Set up SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Stream response
    for await (const chunk of aiService.chatStream(sessionId, message)) {
      if (chunk.delta.content) {
        res.write(`data: ${JSON.stringify({ content: chunk.delta.content })}\n\n`);
      }
      if (chunk.finishReason) {
        res.write(`data: ${JSON.stringify({ done: true, reason: chunk.finishReason })}\n\n`);
      }
    }

    res.end();
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/v1/ai/chat/{sessionId}:
 *   delete:
 *     summary: End a chat session
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Session ended
 */
export const endChatSession = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { sessionId } = req.params;

    aiService.endChatSession(sessionId);

    logger.info(`[AI] Ended chat session ${sessionId}`);

    res.json({
      success: true,
      message: 'Chat session ended',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/v1/ai/chat/{sessionId}/clear:
 *   post:
 *     summary: Clear chat history (keep system prompt)
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: History cleared
 */
export const clearChatHistory = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { sessionId } = req.params;

    aiService.clearChatHistory(sessionId);

    logger.info(`[AI] Cleared chat history for session ${sessionId}`);

    res.json({
      success: true,
      message: 'Chat history cleared',
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// UTILITY ENDPOINTS
// ==========================================

/**
 * @swagger
 * /api/v1/ai/models:
 *   get:
 *     summary: Get available AI models
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Available models
 */
export const getModels = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const models = aiService.getAvailableModels();

    res.json({
      success: true,
      data: models,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/v1/ai/templates:
 *   get:
 *     summary: Get available prompt templates
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Available templates
 */
export const getTemplates = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { category } = req.query;

    let templates;
    if (category) {
      templates = aiService.getTemplatesByCategory(category as PromptCategory);
    } else {
      templates = aiService.getTemplates();
    }

    res.json({
      success: true,
      data: templates.map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        category: t.category,
        variables: t.variables,
      })),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/v1/ai/count-tokens:
 *   post:
 *     summary: Count tokens in text
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - text
 *             properties:
 *               text:
 *                 type: string
 *     responses:
 *       200:
 *         description: Token count
 */
export const countTokens = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { text } = req.body;

    if (!text) {
      res.status(400).json({
        success: false,
        error: 'Text is required',
      });
      return;
    }

    const tokens = aiService.countTokens(text);

    res.json({
      success: true,
      data: {
        tokens,
        characters: text.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

