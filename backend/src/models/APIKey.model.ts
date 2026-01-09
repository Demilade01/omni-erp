import { Schema, model, Document, Types } from 'mongoose';

export interface IAPIKey extends Document {
  userId: Types.ObjectId;
  name: string;
  key: string;
  hashedKey: string;
  permissions: string[];
  expiresAt?: Date;
  lastUsedAt?: Date;
  usageCount: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const apiKeySchema = new Schema<IAPIKey>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    name: {
      type: String,
      required: [true, 'API key name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    key: {
      type: String,
      required: true,
      select: false, // Never return the actual key
    },
    hashedKey: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    permissions: {
      type: [String],
      default: ['read'],
      validate: {
        validator: (v: string[]) => v && v.length > 0,
        message: 'At least one permission is required',
      },
    },
    expiresAt: {
      type: Date,
      index: true,
    },
    lastUsedAt: {
      type: Date,
    },
    usageCount: {
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
        const key = ret.key;
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        delete ret.key;
        delete ret.hashedKey;
        // Mask the key for display
        if (key) {
          ret.keyPreview = `${key.substring(0, 8)}...${key.substring(key.length - 4)}`;
        }
        return ret;
      },
    },
  }
);

// Indexes
apiKeySchema.index({ userId: 1 });
apiKeySchema.index({ hashedKey: 1 });
apiKeySchema.index({ isActive: 1 });
apiKeySchema.index({ expiresAt: 1 });
apiKeySchema.index({ createdAt: -1 });

// Compound index for user's active keys
apiKeySchema.index({ userId: 1, isActive: 1 });

// TTL index - automatically delete expired keys 30 days after expiration
apiKeySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 2592000, partialFilterExpression: { expiresAt: { $exists: true } } });

export const APIKey = model<IAPIKey>('APIKey', apiKeySchema);

