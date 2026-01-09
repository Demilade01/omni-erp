import { Schema, model, Document, Types } from 'mongoose';

export interface IExecutionLog extends Document {
  userId: Types.ObjectId;
  workflowId: Types.ObjectId;
  executionId: string;
  status: 'started' | 'running' | 'completed' | 'failed' | 'cancelled';
  startTime: Date;
  endTime?: Date;
  duration?: number; // in milliseconds
  steps: {
    stepId: string;
    stepName: string;
    status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
    startTime?: Date;
    endTime?: Date;
    duration?: number;
    input?: any;
    output?: any;
    error?: string;
  }[];
  input?: any;
  output?: any;
  error?: {
    message: string;
    code?: string;
    stack?: string;
  };
  metadata?: {
    [key: string]: any;
  };
  createdAt: Date;
}

const executionLogSchema = new Schema<IExecutionLog>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    workflowId: {
      type: Schema.Types.ObjectId,
      ref: 'Workflow',
      required: [true, 'Workflow ID is required'],
      index: true,
    },
    executionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['started', 'running', 'completed', 'failed', 'cancelled'],
      default: 'started',
    },
    startTime: {
      type: Date,
      required: true,
      default: Date.now,
    },
    endTime: Date,
    duration: Number,
    steps: [
      {
        stepId: {
          type: String,
          required: true,
        },
        stepName: {
          type: String,
          required: true,
        },
        status: {
          type: String,
          enum: ['pending', 'running', 'completed', 'failed', 'skipped'],
          default: 'pending',
        },
        startTime: Date,
        endTime: Date,
        duration: Number,
        input: Schema.Types.Mixed,
        output: Schema.Types.Mixed,
        error: String,
      },
    ],
    input: Schema.Types.Mixed,
    output: Schema.Types.Mixed,
    error: {
      message: String,
      code: String,
      stack: String,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    toJSON: {
      transform: (_doc, ret: any) => {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Indexes
executionLogSchema.index({ userId: 1 });
executionLogSchema.index({ workflowId: 1 });
executionLogSchema.index({ executionId: 1 });
executionLogSchema.index({ status: 1 });
executionLogSchema.index({ createdAt: -1 });
executionLogSchema.index({ startTime: -1 });

// Compound indexes for common queries
executionLogSchema.index({ userId: 1, status: 1, createdAt: -1 });
executionLogSchema.index({ workflowId: 1, status: 1, createdAt: -1 });

// TTL index - automatically delete logs older than 90 days
executionLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 }); // 90 days

export const ExecutionLog = model<IExecutionLog>('ExecutionLog', executionLogSchema);

