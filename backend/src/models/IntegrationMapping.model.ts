import { Schema, model, Document, Types } from 'mongoose';

export interface IFieldMapping {
  sourceField: string;
  targetField: string;
  transformation?: string;
  defaultValue?: any;
  required: boolean;
}

export interface IIntegrationMapping extends Document {
  userId: Types.ObjectId;
  name: string;
  description?: string;
  sourceConnectionId: Types.ObjectId;
  targetConnectionId: Types.ObjectId;
  sourceEntity: string;
  targetEntity: string;
  fieldMappings: IFieldMapping[];
  transformationRules?: {
    rule: string;
    expression: string;
  }[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const fieldMappingSchema = new Schema<IFieldMapping>(
  {
    sourceField: {
      type: String,
      required: true,
    },
    targetField: {
      type: String,
      required: true,
    },
    transformation: {
      type: String,
    },
    defaultValue: {
      type: Schema.Types.Mixed,
    },
    required: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

const integrationMappingSchema = new Schema<IIntegrationMapping>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Mapping name is required'],
      trim: true,
      maxlength: [200, 'Name cannot exceed 200 characters'],
    },
    description: {
      type: String,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    sourceConnectionId: {
      type: Schema.Types.ObjectId,
      ref: 'ERPConnection',
      required: [true, 'Source connection is required'],
    },
    targetConnectionId: {
      type: Schema.Types.ObjectId,
      ref: 'ERPConnection',
      required: [true, 'Target connection is required'],
    },
    sourceEntity: {
      type: String,
      required: [true, 'Source entity is required'],
      trim: true,
    },
    targetEntity: {
      type: String,
      required: [true, 'Target entity is required'],
      trim: true,
    },
    fieldMappings: {
      type: [fieldMappingSchema],
      required: true,
      validate: {
        validator: (v: IFieldMapping[]) => v && v.length > 0,
        message: 'At least one field mapping is required',
      },
    },
    transformationRules: [
      {
        rule: String,
        expression: String,
      },
    ],
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
integrationMappingSchema.index({ userId: 1 });
integrationMappingSchema.index({ sourceConnectionId: 1 });
integrationMappingSchema.index({ targetConnectionId: 1 });
integrationMappingSchema.index({ isActive: 1 });
integrationMappingSchema.index({ createdAt: -1 });

// Compound index for user's active mappings
integrationMappingSchema.index({ userId: 1, isActive: 1 });

export const IntegrationMapping = model<IIntegrationMapping>(
  'IntegrationMapping',
  integrationMappingSchema
);

