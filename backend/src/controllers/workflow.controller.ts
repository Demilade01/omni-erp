/**
 * Workflow Controller
 * Handles workflow CRUD and execution operations
 */

import { Request, Response, NextFunction } from 'express';
import { Workflow, ExecutionLog } from '../models';
import { WorkflowStatus } from '../types';
import { createNotFoundError, createValidationError } from '../utils/appError';
import { logger } from '../config/logger';
import { v4 as uuidv4 } from 'uuid';
import { workflowService } from '../services/workflow.service';

/**
 * Get all workflows for user
 */
export const getWorkflows = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const {
      page = 1,
      limit = 10,
      search,
      status,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    const query: any = { userId, isActive: true };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    if (status) {
      query.status = status;
    }

    // Build sort
    const sort: any = {};
    sort[sortBy as string] = sortOrder === 'asc' ? 1 : -1;

    // Execute query with pagination
    const skip = (Number(page) - 1) * Number(limit);
    const [workflows, total] = await Promise.all([
      Workflow.find(query)
        .sort(sort)
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Workflow.countDocuments(query),
    ]);

    const totalPages = Math.ceil(total / Number(limit));

    res.status(200).json({
      status: 'success',
      data: {
        workflows,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages,
          hasNextPage: Number(page) < totalPages,
          hasPrevPage: Number(page) > 1,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get workflow by ID
 */
export const getWorkflow = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    const workflow = await Workflow.findOne({ _id: id, userId, isActive: true });

    if (!workflow) {
      throw createNotFoundError('Workflow not found');
    }

    res.status(200).json({
      status: 'success',
      data: { workflow },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create new workflow
 */
export const createWorkflow = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { name, description, steps, schedule } = req.body;

    // Validate steps
    if (!steps || !Array.isArray(steps) || steps.length === 0) {
      throw createValidationError('At least one step is required');
    }

    // Ensure each step has an ID
    const processedSteps = steps.map((step: any, index: number) => ({
      ...step,
      id: step.id || `step_${index + 1}_${uuidv4().slice(0, 8)}`,
    }));

    const workflow = await Workflow.create({
      userId,
      name,
      description,
      steps: processedSteps,
      schedule: schedule || { enabled: false },
      status: WorkflowStatus.DRAFT,
    });

    logger.info(`Workflow created: ${workflow._id} by user ${userId}`);

    res.status(201).json({
      status: 'success',
      message: 'Workflow created successfully',
      data: { workflow },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update workflow
 */
export const updateWorkflow = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;
    const { name, description, steps, schedule, status } = req.body;

    const workflow = await Workflow.findOne({ _id: id, userId, isActive: true });

    if (!workflow) {
      throw createNotFoundError('Workflow not found');
    }

    // Update fields
    if (name !== undefined) workflow.name = name;
    if (description !== undefined) workflow.description = description;
    if (steps !== undefined) {
      // Ensure each step has an ID
      workflow.steps = steps.map((step: any, index: number) => ({
        ...step,
        id: step.id || `step_${index + 1}_${uuidv4().slice(0, 8)}`,
      }));
    }
    if (schedule !== undefined) workflow.schedule = schedule;
    if (status !== undefined) workflow.status = status;

    await workflow.save();

    logger.info(`Workflow updated: ${id} by user ${userId}`);

    res.status(200).json({
      status: 'success',
      message: 'Workflow updated successfully',
      data: { workflow },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete workflow (soft delete)
 */
export const deleteWorkflow = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    const workflow = await Workflow.findOne({ _id: id, userId, isActive: true });

    if (!workflow) {
      throw createNotFoundError('Workflow not found');
    }

    workflow.isActive = false;
    workflow.status = WorkflowStatus.ARCHIVED;
    await workflow.save();

    logger.info(`Workflow deleted: ${id} by user ${userId}`);

    res.status(200).json({
      status: 'success',
      message: 'Workflow deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Activate workflow
 */
export const activateWorkflow = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    const workflow = await Workflow.findOne({ _id: id, userId, isActive: true });

    if (!workflow) {
      throw createNotFoundError('Workflow not found');
    }

    if (workflow.status === WorkflowStatus.ACTIVE) {
      throw createValidationError('Workflow is already active');
    }

    workflow.status = WorkflowStatus.ACTIVE;
    await workflow.save();

    logger.info(`Workflow activated: ${id}`);

    res.status(200).json({
      status: 'success',
      message: 'Workflow activated successfully',
      data: { workflow },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Pause workflow
 */
export const pauseWorkflow = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    const workflow = await Workflow.findOne({ _id: id, userId, isActive: true });

    if (!workflow) {
      throw createNotFoundError('Workflow not found');
    }

    if (workflow.status !== WorkflowStatus.ACTIVE) {
      throw createValidationError('Only active workflows can be paused');
    }

    workflow.status = WorkflowStatus.PAUSED;
    await workflow.save();

    logger.info(`Workflow paused: ${id}`);

    res.status(200).json({
      status: 'success',
      message: 'Workflow paused successfully',
      data: { workflow },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Execute workflow manually
 */
export const executeWorkflow = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;
    const { input, async: runAsync = true } = req.body;

    const workflow = await Workflow.findOne({ _id: id, userId, isActive: true });

    if (!workflow) {
      throw createNotFoundError('Workflow not found');
    }

    if (runAsync) {
      // Async execution - return immediately, run in background
      // Generate execution ID for tracking (service will use this)
      const executionId = `exec_${uuidv4()}`;

      // Start execution in background (non-blocking)
      // The service creates and manages the execution log
      workflowService.executeWorkflow(id, userId, { input }).catch(err => {
        logger.error(`Background workflow execution failed: ${executionId}`, err);
      });

      logger.info(`Workflow execution started (async): ${id}`);

      res.status(202).json({
        status: 'success',
        message: 'Workflow execution started',
        data: {
          workflowId: id,
          status: 'started',
        },
      });
    } else {
      // Sync execution - wait for completion
      logger.info(`Workflow execution started (sync): ${id}`);

      const executionLog = await workflowService.executeWorkflow(id, userId, { input });

      res.status(200).json({
        status: 'success',
        message: `Workflow execution ${executionLog.status}`,
        data: {
          executionId: executionLog.executionId,
          workflowId: id,
          status: executionLog.status,
          output: executionLog.output,
          duration: executionLog.duration,
        },
      });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Get workflow execution history
 */
export const getExecutionHistory = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;
    const { page = 1, limit = 20 } = req.query;

    // Verify workflow ownership
    const workflow = await Workflow.findOne({ _id: id, userId });

    if (!workflow) {
      throw createNotFoundError('Workflow not found');
    }

    // Get execution logs
    const skip = (Number(page) - 1) * Number(limit);
    const [executions, total] = await Promise.all([
      ExecutionLog.find({ workflowId: id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      ExecutionLog.countDocuments({ workflowId: id }),
    ]);

    const totalPages = Math.ceil(total / Number(limit));

    res.status(200).json({
      status: 'success',
      data: {
        executions,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages,
          hasNextPage: Number(page) < totalPages,
          hasPrevPage: Number(page) > 1,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get specific execution details
 */
export const getExecution = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id, executionId } = req.params;
    const userId = req.user!.userId;

    // Verify workflow ownership
    const workflow = await Workflow.findOne({ _id: id, userId });

    if (!workflow) {
      throw createNotFoundError('Workflow not found');
    }

    const execution = await ExecutionLog.findOne({
      workflowId: id,
      executionId,
    });

    if (!execution) {
      throw createNotFoundError('Execution not found');
    }

    res.status(200).json({
      status: 'success',
      data: { execution },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Cancel running execution
 */
export const cancelExecution = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id, executionId } = req.params;
    const userId = req.user!.userId;

    // Verify workflow ownership
    const workflow = await Workflow.findOne({ _id: id, userId });

    if (!workflow) {
      throw createNotFoundError('Workflow not found');
    }

    const execution = await ExecutionLog.findOne({
      workflowId: id,
      executionId,
    });

    if (!execution) {
      throw createNotFoundError('Execution not found');
    }

    if (!['started', 'running'].includes(execution.status)) {
      throw createValidationError('Only running executions can be cancelled');
    }

    execution.status = 'cancelled';
    execution.endTime = new Date();
    execution.duration = execution.endTime.getTime() - execution.startTime.getTime();
    await execution.save();

    // Update workflow status
    workflow.lastExecutionStatus = 'failed';
    await workflow.save();

    logger.info(`Execution cancelled: ${executionId}`);

    res.status(200).json({
      status: 'success',
      message: 'Execution cancelled successfully',
      data: { execution },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Duplicate workflow
 */
export const duplicateWorkflow = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;
    const { name } = req.body;

    const sourceWorkflow = await Workflow.findOne({ _id: id, userId, isActive: true });

    if (!sourceWorkflow) {
      throw createNotFoundError('Workflow not found');
    }

    // Create duplicate with new step IDs
    const newSteps = sourceWorkflow.steps.map((step, index) => ({
      ...step,
      id: `step_${index + 1}_${uuidv4().slice(0, 8)}`,
    }));

    const newWorkflow = await Workflow.create({
      userId,
      name: name || `${sourceWorkflow.name} (Copy)`,
      description: sourceWorkflow.description,
      steps: newSteps,
      schedule: { enabled: false },
      status: WorkflowStatus.DRAFT,
    });

    logger.info(`Workflow duplicated: ${id} -> ${newWorkflow._id}`);

    res.status(201).json({
      status: 'success',
      message: 'Workflow duplicated successfully',
      data: { workflow: newWorkflow },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update workflow schedule
 */
export const updateSchedule = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;
    const { enabled, cronExpression, timezone } = req.body;

    const workflow = await Workflow.findOne({ _id: id, userId, isActive: true });

    if (!workflow) {
      throw createNotFoundError('Workflow not found');
    }

    // Validate cron expression if enabled
    if (enabled && !cronExpression) {
      throw createValidationError('Cron expression is required when schedule is enabled');
    }

    workflow.schedule = {
      enabled: enabled ?? workflow.schedule?.enabled ?? false,
      cronExpression: cronExpression ?? workflow.schedule?.cronExpression ?? '',
      timezone: timezone ?? workflow.schedule?.timezone ?? 'UTC',
    };

    await workflow.save();

    logger.info(`Workflow schedule updated: ${id}`);

    res.status(200).json({
      status: 'success',
      message: 'Schedule updated successfully',
      data: { workflow },
    });
  } catch (error) {
    next(error);
  }
};
