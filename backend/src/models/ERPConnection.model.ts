import { Schema, model, Document, Types } from 'mongoose';
import { ERPType, AuthType } from '../types';

export interface IERPConnection extends Document {
  userId: Types.ObjectId;
  name: string;
  description?: string;
  type: ERPType;
  baseUrl: string;
  authType: AuthType;
  credentials: {
    clientId?: string;
    clientSecret?: string;
    tokenUrl?: string;
    scope?: string;
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: Date;
    apiKey?: string;
    headerName?: string;
    prefix?: string;
    username?: string;
    password?: string;
    token?: string;
    tenantId?: string;
    companyId?: string;
    [key: string]: any;
  };
  config?: {
    timeout?: number;
    retryAttempts?: number;
    retryDelay?: number;
    rateLimit?: {
      maxRequests: number;
      windowMs: number;
    };
    [key: string]: any;
  };
  metadata?: {
    version?: string;
    region?: string;
    environment?: string;
    [key: string]: any;
  };
  status: 'active' | 'inactive' | 'error';
  lastTested?: Date;
  lastSync?: Date;
  lastConnectionAt?: Date;
  errorMessage?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const erpConnectionSchema = new Schema<IERPConnection>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Connection name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    type: {
      type: String,
      enum: Object.values(ERPType),
      required: [true, 'ERP type is required'],
    },
    baseUrl: {
      type: String,
      required: [true, 'Base URL is required'],
      trim: true,
    },
    authType: {
      type: String,
      enum: Object.values(AuthType),
      required: [true, 'Authentication type is required'],
    },
    credentials: {
      type: Schema.Types.Mixed,
      required: true,
      select: false, // Don't return credentials by default
    },
    config: {
      type: Schema.Types.Mixed,
      default: {},
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'error'],
      default: 'inactive',
    },
    lastTested: {
      type: Date,
    },
    lastSync: {
      type: Date,
    },
    lastConnectionAt: {
      type: Date,
    },
    errorMessage: {
      type: String,
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
        delete ret.credentials; // Never expose credentials in JSON
        return ret;
      },
    },
  }
);

// Indexes
erpConnectionSchema.index({ userId: 1, name: 1 });
erpConnectionSchema.index({ type: 1 });
erpConnectionSchema.index({ status: 1 });
erpConnectionSchema.index({ isActive: 1 });
erpConnectionSchema.index({ createdAt: -1 });

// Compound index for user's active connections
erpConnectionSchema.index({ userId: 1, isActive: 1, status: 1 });

export const ERPConnection = model<IERPConnection>('ERPConnection', erpConnectionSchema);

