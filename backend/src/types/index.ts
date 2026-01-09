// Common types and interfaces

export interface ApiResponse<T = any> {
  status: 'success' | 'error';
  message: string;
  data?: T;
  errors?: any;
}

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  status: 'success';
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
  VIEWER = 'viewer',
}

export interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

// ERP Connection Types
export enum ERPType {
  SAP = 'sap',
  SUCCESSFACTORS = 'successfactors',
  WORKDAY = 'workday',
  GENERIC_REST = 'generic_rest',
  GENERIC_ODATA = 'generic_odata',
}

export enum AuthType {
  OAUTH2 = 'oauth2',
  API_KEY = 'api_key',
  BASIC = 'basic',
  JWT = 'jwt',
}

export interface ERPConnectionConfig {
  type: ERPType;
  name: string;
  baseUrl: string;
  authType: AuthType;
  credentials: Record<string, any>;
  metadata?: Record<string, any>;
}

// Workflow Types
export enum WorkflowStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export interface WorkflowStep {
  id: string;
  type: string;
  name: string;
  config: Record<string, any>;
  nextSteps?: string[];
}

// AI Types
export interface AIPromptTemplate {
  id: string;
  name: string;
  template: string;
  variables: string[];
  description?: string;
}

export interface AIResponse {
  content: string;
  model: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
  metadata?: Record<string, any>;
}

