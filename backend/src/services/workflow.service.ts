/**
 * Workflow Service
 * Handles workflow execution, step processing, and scheduling
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../config/logger';
import { Workflow, ExecutionLog, IWorkflow } from '../models';
import { IExecutionLog } from '../models/ExecutionLog.model';
import { connectorService } from './connector.service';
import { WorkflowStep } from '../types';

/**
 * Step execution context
 */
interface StepContext {
  executionId: string;
  workflowId: string;
  userId: string;
  stepId: string;
  input: any;
  previousOutputs: Map<string, any>;
  variables: Map<string, any>;
}

/**
 * Step execution result
 */
interface StepResult {
  success: boolean;
  output?: any;
  error?: string;
  nextSteps?: string[];
  skipNextSteps?: boolean;
}

/**
 * Workflow execution options
 */
interface ExecutionOptions {
  input?: any;
  dryRun?: boolean;
  timeout?: number;
  maxRetries?: number;
}

/**
 * Step handlers registry
 */
type StepHandler = (step: WorkflowStep, context: StepContext) => Promise<StepResult>;

/**
 * Workflow Service Class
 */
class WorkflowService extends EventEmitter {
  private stepHandlers: Map<string, StepHandler>;
  private runningExecutions: Map<string, { cancel: () => void }>;
  private defaultTimeout: number = 300000; // 5 minutes
  private defaultMaxRetries: number = 3;

  constructor() {
    super();
    this.stepHandlers = new Map();
    this.runningExecutions = new Map();
    this.registerDefaultHandlers();
  }

  /**
   * Register default step handlers
   */
  private registerDefaultHandlers(): void {
    // Trigger step - entry point for workflow
    this.registerStepHandler('trigger', async (step, context) => {
      logger.debug(`[${context.executionId}] Trigger step: ${step.name}`);
      return {
        success: true,
        output: context.input,
        nextSteps: step.nextSteps,
      };
    });

    // Connector step - execute ERP operations
    this.registerStepHandler('connector', async (step, context) => {
      const { connectionId, operation, path, data, queryOptions } = step.config;

      logger.debug(`[${context.executionId}] Connector step: ${step.name}`, {
        connectionId,
        operation,
        path,
      });

      try {
        const connector = await connectorService.getConnector(connectionId, context.userId);

        if (!connector.isConnected()) {
          await connector.connect();
        }

        let result: any;
        // Cast to any to access ODataConnector's public methods
        const odataConnector = connector as any;
        switch (operation) {
          case 'get':
          case 'query':
            result = await odataConnector.query(path, queryOptions);
            break;
          case 'post':
          case 'create':
            result = await odataConnector.createEntity(path, this.resolveData(data, context));
            break;
          case 'put':
          case 'update':
            result = await odataConnector.updateEntity(path, data?.key, this.resolveData(data?.values, context));
            break;
          case 'patch':
            result = await odataConnector.patchEntity(path, data?.key, this.resolveData(data?.values, context));
            break;
          case 'delete':
            result = await odataConnector.deleteEntity(path, data?.key);
            break;
          default:
            throw new Error(`Unknown operation: ${operation}`);
        }

        return {
          success: true,
          output: result,
          nextSteps: step.nextSteps,
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
          success: false,
          error: errorMessage,
        };
      }
    });

    // Transform step - transform data between steps
    this.registerStepHandler('transform', async (step, context) => {
      const { transformType, mappings, script } = step.config;

      logger.debug(`[${context.executionId}] Transform step: ${step.name}`);

      try {
        let output: any;

        switch (transformType) {
          case 'mapping':
            output = this.applyMappings(context.input, mappings);
            break;
          case 'script':
            output = await this.executeScript(script, context);
            break;
          case 'filter':
            output = this.applyFilter(context.input, step.config.filter);
            break;
          case 'aggregate':
            output = this.applyAggregation(context.input, step.config.aggregation);
            break;
          default:
            output = context.input;
        }

        return {
          success: true,
          output,
          nextSteps: step.nextSteps,
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
          success: false,
          error: errorMessage,
        };
      }
    });

    // Condition step - branching logic
    this.registerStepHandler('condition', async (step, context) => {
      const { conditions, defaultNext } = step.config;

      logger.debug(`[${context.executionId}] Condition step: ${step.name}`);

      try {
        for (const condition of conditions) {
          if (this.evaluateCondition(condition, context)) {
            return {
              success: true,
              output: context.input,
              nextSteps: condition.nextSteps,
            };
          }
        }

        return {
          success: true,
          output: context.input,
          nextSteps: defaultNext ? [defaultNext] : [],
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
          success: false,
          error: errorMessage,
        };
      }
    });

    // Action step - perform actions (notifications, etc.)
    this.registerStepHandler('action', async (step, context) => {
      const { actionType } = step.config;

      logger.debug(`[${context.executionId}] Action step: ${step.name}`, { actionType });

      try {
        switch (actionType) {
          case 'log':
            logger.info(`[Workflow Action] ${step.config.message}`, {
              executionId: context.executionId,
              data: context.input,
            });
            break;
          case 'webhook':
            // TODO: Implement webhook call
            break;
          case 'email':
            // TODO: Implement email notification
            break;
          case 'setVariable':
            context.variables.set(step.config.variableName, context.input);
            break;
          default:
            logger.warn(`Unknown action type: ${actionType}`);
        }

        return {
          success: true,
          output: context.input,
          nextSteps: step.nextSteps,
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
          success: false,
          error: errorMessage,
        };
      }
    });

    // Loop step - iterate over arrays
    this.registerStepHandler('loop', async (step, context) => {
      const { itemsPath, loopSteps } = step.config;

      logger.debug(`[${context.executionId}] Loop step: ${step.name}`);

      try {
        const items = this.getValueByPath(context.input, itemsPath) || [];
        const results: any[] = [];

        for (let i = 0; i < items.length; i++) {
          const itemContext: StepContext = {
            ...context,
            input: items[i],
            variables: new Map(context.variables),
          };
          itemContext.variables.set('$index', i);
          itemContext.variables.set('$item', items[i]);

          // Execute loop steps for each item
          for (const loopStep of loopSteps) {
            const handler = this.stepHandlers.get(loopStep.type);
            if (handler) {
              const result = await handler(loopStep, itemContext);
              if (!result.success) {
                throw new Error(`Loop iteration ${i} failed: ${result.error}`);
              }
              itemContext.input = result.output;
            }
          }
          results.push(itemContext.input);
        }

        return {
          success: true,
          output: results,
          nextSteps: step.nextSteps,
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
          success: false,
          error: errorMessage,
        };
      }
    });

    // Delay step - pause execution
    this.registerStepHandler('delay', async (step, context) => {
      const { duration } = step.config;

      logger.debug(`[${context.executionId}] Delay step: ${step.name}, duration: ${duration}ms`);

      await new Promise(resolve => setTimeout(resolve, duration));

      return {
        success: true,
        output: context.input,
        nextSteps: step.nextSteps,
      };
    });
  }

  /**
   * Register a step handler
   */
  registerStepHandler(type: string, handler: StepHandler): void {
    this.stepHandlers.set(type, handler);
    logger.debug(`Step handler registered: ${type}`);
  }

  /**
   * Execute a workflow
   */
  async executeWorkflow(
    workflowId: string,
    userId: string,
    options: ExecutionOptions = {}
  ): Promise<IExecutionLog> {
    const workflow = await Workflow.findOne({
      _id: workflowId,
      userId,
      isActive: true,
    });

    if (!workflow) {
      throw new Error('Workflow not found');
    }

    const executionId = `exec_${uuidv4()}`;
    const timeout = options.timeout || this.defaultTimeout;

    logger.info(`Starting workflow execution: ${executionId}`, {
      workflowId,
      workflowName: workflow.name,
    });

    // Create execution log
    const executionLog = await ExecutionLog.create({
      userId,
      workflowId: workflow._id,
      executionId,
      status: 'started',
      startTime: new Date(),
      input: options.input,
      steps: workflow.steps.map(step => ({
        stepId: step.id,
        stepName: step.name,
        status: 'pending',
      })),
    });

    // Update workflow
    workflow.lastExecutedAt = new Date();
    workflow.lastExecutionStatus = 'running';
    workflow.executionCount += 1;
    await workflow.save();

    // Create cancellation handler
    let cancelled = false;
    const cancelHandler = {
      cancel: () => {
        cancelled = true;
      },
    };
    this.runningExecutions.set(executionId, cancelHandler);

    try {
      // Execute with timeout
      const result = await Promise.race([
        this.runWorkflowSteps(workflow, executionLog, options, () => cancelled),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Execution timeout')), timeout)
        ),
      ]);

      // Update execution log
      executionLog.status = 'completed';
      executionLog.endTime = new Date();
      executionLog.duration = executionLog.endTime.getTime() - executionLog.startTime.getTime();
      executionLog.output = result;
      await executionLog.save();

      // Update workflow
      workflow.lastExecutionStatus = 'success';
      await workflow.save();

      this.emit('execution:completed', { executionId, workflowId, result });
      logger.info(`Workflow execution completed: ${executionId}`);

      return executionLog;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;

      // Update execution log
      executionLog.status = cancelled ? 'cancelled' : 'failed';
      executionLog.endTime = new Date();
      executionLog.duration = executionLog.endTime.getTime() - executionLog.startTime.getTime();
      executionLog.error = {
        message: errorMessage,
        stack: errorStack,
      };
      await executionLog.save();

      // Update workflow
      workflow.lastExecutionStatus = 'failed';
      await workflow.save();

      this.emit('execution:failed', { executionId, workflowId, error: errorMessage });
      logger.error(`Workflow execution failed: ${executionId}`, { error: errorMessage });

      return executionLog;
    } finally {
      this.runningExecutions.delete(executionId);
    }
  }

  /**
   * Run workflow steps
   */
  private async runWorkflowSteps(
    workflow: IWorkflow,
    executionLog: IExecutionLog,
    options: ExecutionOptions,
    isCancelled: () => boolean
  ): Promise<any> {
    const stepsMap = new Map(workflow.steps.map(s => [s.id, s]));
    const previousOutputs = new Map<string, any>();
    const variables = new Map<string, any>();

    // Find the trigger step (entry point)
    const triggerStep = workflow.steps.find(s => s.type === 'trigger');
    if (!triggerStep) {
      throw new Error('Workflow must have a trigger step');
    }

    // Execute steps starting from trigger
    const queue: { stepId: string; input: any }[] = [
      { stepId: triggerStep.id, input: options.input },
    ];
    const executed = new Set<string>();

    while (queue.length > 0) {
      if (isCancelled()) {
        throw new Error('Execution cancelled');
      }

      const { stepId, input } = queue.shift()!;

      if (executed.has(stepId)) {
        continue;
      }

      const step = stepsMap.get(stepId);
      if (!step) {
        logger.warn(`Step not found: ${stepId}`);
        continue;
      }

      // Update step status in execution log
      const stepLog = executionLog.steps.find(s => s.stepId === stepId);
      if (stepLog) {
        stepLog.status = 'running';
        stepLog.startTime = new Date();
        stepLog.input = input;
        await executionLog.save();
      }

      // Get handler
      const handler = this.stepHandlers.get(step.type);
      if (!handler) {
        throw new Error(`No handler for step type: ${step.type}`);
      }

      // Create context
      const context: StepContext = {
        executionId: executionLog.executionId,
        workflowId: workflow._id.toString(),
        userId: executionLog.userId.toString(),
        stepId,
        input,
        previousOutputs,
        variables,
      };

      // Execute step with retry logic
      const maxRetries = options.maxRetries || this.defaultMaxRetries;
      let result: StepResult | null = null;
      let lastError: string | undefined;

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          result = await handler(step, context);
          if (result.success) {
            break;
          }
          lastError = result.error;
        } catch (error) {
          lastError = error instanceof Error ? error.message : String(error);
        }

        if (attempt < maxRetries) {
          logger.debug(`Retrying step ${stepId}, attempt ${attempt + 2}/${maxRetries + 1}`);
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
        }
      }

      if (!result || !result.success) {
        // Update step status
        if (stepLog) {
          stepLog.status = 'failed';
          stepLog.endTime = new Date();
          stepLog.duration = stepLog.endTime.getTime() - (stepLog.startTime?.getTime() || Date.now());
          stepLog.error = lastError;
          await executionLog.save();
        }
        throw new Error(`Step ${step.name} failed: ${lastError}`);
      }

      // Update step status
      if (stepLog) {
        stepLog.status = 'completed';
        stepLog.endTime = new Date();
        stepLog.duration = stepLog.endTime.getTime() - (stepLog.startTime?.getTime() || Date.now());
        stepLog.output = result.output;
        await executionLog.save();
      }

      // Store output
      previousOutputs.set(stepId, result.output);
      executed.add(stepId);

      // Queue next steps
      if (!result.skipNextSteps && result.nextSteps) {
        for (const nextStepId of result.nextSteps) {
          if (!executed.has(nextStepId)) {
            queue.push({ stepId: nextStepId, input: result.output });
          }
        }
      }
    }

    // Return the last output
    const lastStepId = Array.from(executed).pop();
    return lastStepId ? previousOutputs.get(lastStepId) : null;
  }

  /**
   * Cancel a running execution
   */
  cancelExecution(executionId: string): boolean {
    const handler = this.runningExecutions.get(executionId);
    if (handler) {
      handler.cancel();
      return true;
    }
    return false;
  }

  /**
   * Get running executions
   */
  getRunningExecutions(): string[] {
    return Array.from(this.runningExecutions.keys());
  }

  /**
   * Apply field mappings
   */
  private applyMappings(data: any, mappings: any[]): any {
    if (!mappings || mappings.length === 0) {
      return data;
    }

    const result: any = {};
    for (const mapping of mappings) {
      const value = this.getValueByPath(data, mapping.source);
      this.setValueByPath(result, mapping.target, value);
    }
    return result;
  }

  /**
   * Execute transformation script (sandboxed)
   */
  private async executeScript(script: string, context: StepContext): Promise<any> {
    // Simple expression evaluation - in production, use a proper sandbox
    const fn = new Function(
      'input',
      'previousOutputs',
      'variables',
      `return (${script})`
    );
    return fn(
      context.input,
      Object.fromEntries(context.previousOutputs),
      Object.fromEntries(context.variables)
    );
  }

  /**
   * Apply filter to array data
   */
  private applyFilter(data: any[], filter: any): any[] {
    if (!Array.isArray(data)) {
      return data;
    }

    return data.filter(item => {
      for (const [key, value] of Object.entries(filter)) {
        if (this.getValueByPath(item, key) !== value) {
          return false;
        }
      }
      return true;
    });
  }

  /**
   * Apply aggregation to array data
   */
  private applyAggregation(data: any[], aggregation: any): any {
    if (!Array.isArray(data)) {
      return data;
    }

    const { type, field } = aggregation;
    const values = data.map(item => this.getValueByPath(item, field));

    switch (type) {
      case 'sum':
        return values.reduce((a, b) => a + b, 0);
      case 'count':
        return values.length;
      case 'avg':
        return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
      case 'min':
        return Math.min(...values);
      case 'max':
        return Math.max(...values);
      case 'first':
        return values[0];
      case 'last':
        return values[values.length - 1];
      default:
        return data;
    }
  }

  /**
   * Evaluate a condition
   */
  private evaluateCondition(condition: any, context: StepContext): boolean {
    const { field, operator, value } = condition;
    const actualValue = this.getValueByPath(context.input, field);

    switch (operator) {
      case 'eq':
        return actualValue === value;
      case 'neq':
        return actualValue !== value;
      case 'gt':
        return actualValue > value;
      case 'gte':
        return actualValue >= value;
      case 'lt':
        return actualValue < value;
      case 'lte':
        return actualValue <= value;
      case 'contains':
        return String(actualValue).includes(value);
      case 'startsWith':
        return String(actualValue).startsWith(value);
      case 'endsWith':
        return String(actualValue).endsWith(value);
      case 'isNull':
        return actualValue === null || actualValue === undefined;
      case 'isNotNull':
        return actualValue !== null && actualValue !== undefined;
      case 'in':
        return Array.isArray(value) && value.includes(actualValue);
      case 'notIn':
        return Array.isArray(value) && !value.includes(actualValue);
      default:
        return false;
    }
  }

  /**
   * Resolve data with variable substitution
   */
  private resolveData(data: any, context: StepContext): any {
    if (typeof data === 'string') {
      // Replace variables like {{input.field}} or {{variables.name}}
      return data.replace(/\{\{([^}]+)\}\}/g, (_, path) => {
        if (path.startsWith('input.')) {
          return this.getValueByPath(context.input, path.slice(6));
        }
        if (path.startsWith('variables.')) {
          return context.variables.get(path.slice(10));
        }
        if (path.startsWith('outputs.')) {
          const [, stepId, ...rest] = path.split('.');
          const output = context.previousOutputs.get(stepId);
          return rest.length ? this.getValueByPath(output, rest.join('.')) : output;
        }
        return '';
      });
    }

    if (Array.isArray(data)) {
      return data.map(item => this.resolveData(item, context));
    }

    if (typeof data === 'object' && data !== null) {
      const result: any = {};
      for (const [key, value] of Object.entries(data)) {
        result[key] = this.resolveData(value, context);
      }
      return result;
    }

    return data;
  }

  /**
   * Get value by dot-notation path
   */
  private getValueByPath(obj: any, path: string): any {
    if (!path || !obj) return obj;
    return path.split('.').reduce((acc, part) => acc?.[part], obj);
  }

  /**
   * Set value by dot-notation path
   */
  private setValueByPath(obj: any, path: string, value: any): void {
    const parts = path.split('.');
    const last = parts.pop()!;
    let current = obj;

    for (const part of parts) {
      if (!(part in current)) {
        current[part] = {};
      }
      current = current[part];
    }

    current[last] = value;
  }
}

// Export singleton instance
export const workflowService = new WorkflowService();
