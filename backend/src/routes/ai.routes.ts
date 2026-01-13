/**
 * AI Routes
 * API routes for AI-powered features
 */

import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import * as aiController from '../controllers/ai.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

// ==========================================
// HEALTH & UTILITY
// ==========================================

// Health check
router.get('/health', aiController.healthCheck);

// Get available models
router.get('/models', aiController.getModels);

// Get prompt templates
router.get('/templates', aiController.getTemplates);

// Count tokens
router.post('/count-tokens', aiController.countTokens);

// ==========================================
// AI COMPLETION
// ==========================================

// Simple completion
router.post('/complete', aiController.complete);

// ==========================================
// ERP AI FEATURES
// ==========================================

// Field mapping suggestions
router.post('/field-mapping', aiController.suggestFieldMappings);

// Natural language to OData
router.post('/nl-to-odata', aiController.naturalLanguageToOData);

// Error diagnosis
router.post('/diagnose-error', aiController.diagnoseError);

// Data classification
router.post('/classify-data', aiController.classifyData);

// Report summarization
router.post('/summarize-report', aiController.summarizeReport);

// Transformation rules
router.post('/transform-rules', aiController.generateTransformationRules);

// ==========================================
// CHAT
// ==========================================

// Create chat session
router.post('/chat/sessions', aiController.createChatSession);

// Send message
router.post('/chat/:sessionId/message', aiController.sendChatMessage);

// Stream message (SSE)
router.post('/chat/:sessionId/stream', aiController.streamChatMessage);

// Clear history
router.post('/chat/:sessionId/clear', aiController.clearChatHistory);

// End session
router.delete('/chat/:sessionId', aiController.endChatSession);

export default router;

