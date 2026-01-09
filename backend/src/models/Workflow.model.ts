import { Schema, model, Document, Types } from 'mongoose';
import { WorkflowStatus, WorkflowStep } from '../types';

export interface IWorkflow extends Document {
  userId: Types.ObjectId;
  name: string;
  description?: string;
  status: WorkflowStatus;
  steps: WorkflowStep[];
  schedule?: {
    enabled: boolean;
    cronExpression: string;
    timezone: string;
  };
  lastExecutedAt?: Date;
  lastExecutionStatus?: 'success' | 'failed' | 'running';
  executionCount: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const workflowStepSchema = new Schema<WorkflowStep>(
  {
    id: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    config: {
      type: Schema.Types.Mixed,
      required: true,
    },
    nextSteps: [String],
  },
  { _id: false }
);

const workflowSchema = new Schema<IWorkflow>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Workflow name is required'],
      trim: true,
      maxlength: [200, 'Name cannot exceed 200 characters'],
    },
    description: {
      type: String,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    status: {
      type: String,
      enum: Object.values(WorkflowStatus),
      default: WorkflowStatus.DRAFT,
    },
    steps: {
      type: [workflowStepSchema],
      required: true,
      validate: {
        validator: (v: WorkflowStep[]) => v && v.length > 0,
        message: 'At least one step is required',
      },
    },
    schedule: {
      enabled: {
        type: Boolean,
        default: false,
      },
      cronExpression: String,
      timezone: {
        type: String,
        default: 'UTC',
      },
    },
    lastExecutedAt: Date,
    lastExecutionStatus: {
      type: String,
      enum: ['success', 'failed', 'running'],
    },
    executionCount: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
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
workflowSchema.index({ userId: 1 });
workflowSchema.index({ status: 1 });
workflowSchema.index({ isActive: 1 });
workflowSchema.index({ 'schedule.enabled': 1 });
workflowSchema.index({ createdAt: -1 });
workflowSchema.index({ lastExecutedAt: -1 });

// Compound index for user's active workflows
workflowSchema.index({ userId: 1, isActive: 1, status: 1 });

export const Workflow = model<IWorkflow>('Workflow', workflowSchema);

