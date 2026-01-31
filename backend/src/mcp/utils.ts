/**
 * MCP Utilities
 * Helper functions for MCP server
 */

import { z } from 'zod';

/**
 * Convert Zod schema to JSON Schema format
 * This is needed for MCP tool registration
 */
export function zodToJsonSchema(schema: z.ZodType<any>): Record<string, any> {
  // Get the shape if it's an object schema
  if (schema instanceof z.ZodObject) {
    const shape = schema.shape;
    const properties: Record<string, any> = {};
    const required: string[] = [];

    for (const [key, value] of Object.entries(shape)) {
      const zodSchema = value as z.ZodType<any>;
      properties[key] = zodTypeToJsonSchema(zodSchema);

      // Check if required (not optional)
      if (!(zodSchema instanceof z.ZodOptional) && !(zodSchema instanceof z.ZodDefault)) {
        required.push(key);
      }
    }

    return {
      type: 'object',
      properties,
      required: required.length > 0 ? required : undefined,
    };
  }

  return zodTypeToJsonSchema(schema);
}

/**
 * Convert individual Zod type to JSON Schema
 */
function zodTypeToJsonSchema(schema: z.ZodType<any>): Record<string, any> {
  // Handle optional
  if (schema instanceof z.ZodOptional) {
    const innerSchema = (schema as any)._zod?.innerType ?? (schema as any).unwrap?.();
    if (innerSchema) {
      return zodTypeToJsonSchema(innerSchema);
    }
    return { type: 'string' };
  }

  // Handle default
  if (schema instanceof z.ZodDefault) {
    const def = (schema as any)._def ?? (schema as any)._zod;
    const innerType = def?.innerType ?? def?.type;
    if (innerType) {
      const inner = zodTypeToJsonSchema(innerType);
      const defaultValue = def?.defaultValue;
      if (typeof defaultValue === 'function') {
        inner.default = defaultValue();
      } else if (defaultValue !== undefined) {
        inner.default = defaultValue;
      }
      return inner;
    }
    return { type: 'string' };
  }

  // Handle nullable
  if (schema instanceof z.ZodNullable) {
    const innerSchema = (schema as any)._zod?.innerType ?? (schema as any).unwrap?.();
    if (innerSchema) {
      const inner = zodTypeToJsonSchema(innerSchema);
      inner.nullable = true;
      return inner;
    }
    return { type: 'string', nullable: true };
  }

  // Handle string
  if (schema instanceof z.ZodString) {
    const result: Record<string, any> = { type: 'string' };
    if (schema.description) result.description = schema.description;
    return result;
  }

  // Handle number
  if (schema instanceof z.ZodNumber) {
    const result: Record<string, any> = { type: 'number' };
    if (schema.description) result.description = schema.description;
    return result;
  }

  // Handle boolean
  if (schema instanceof z.ZodBoolean) {
    const result: Record<string, any> = { type: 'boolean' };
    if (schema.description) result.description = schema.description;
    return result;
  }

  // Handle array
  if (schema instanceof z.ZodArray) {
    const elementSchema = (schema as any).element ?? (schema as any)._def?.type;
    return {
      type: 'array',
      items: elementSchema ? zodTypeToJsonSchema(elementSchema) : {},
      description: schema.description,
    };
  }

  // Handle enum
  if (schema instanceof z.ZodEnum) {
    const options = (schema as any).options ?? (schema as any)._def?.values ?? [];
    return {
      type: 'string',
      enum: options,
      description: schema.description,
    };
  }

  // Handle literal
  if (schema instanceof z.ZodLiteral) {
    const value = (schema as any).value ?? (schema as any)._def?.value;
    return {
      type: typeof value,
      const: value,
    };
  }

  // Handle union
  if (schema instanceof z.ZodUnion) {
    const options = (schema as any).options ?? (schema as any)._def?.options ?? [];
    return {
      oneOf: options.map((opt: any) => zodTypeToJsonSchema(opt)),
    };
  }

  // Handle record
  if (schema instanceof z.ZodRecord) {
    const valueType = (schema as any).valueType ?? (schema as any)._def?.valueType;
    return {
      type: 'object',
      additionalProperties: valueType ? zodTypeToJsonSchema(valueType) : {},
      description: schema.description,
    };
  }

  // Handle object
  if (schema instanceof z.ZodObject) {
    return zodToJsonSchema(schema);
  }

  // Handle any
  if (schema instanceof z.ZodAny) {
    return { description: schema.description };
  }

  // Default fallback
  return { type: 'string' };
}

/**
 * Format tool result for MCP response
 */
export function formatToolResult(data: any): string {
  if (typeof data === 'string') {
    return data;
  }
  return JSON.stringify(data, null, 2);
}

/**
 * Parse resource URI
 */
export function parseResourceUri(uri: string): {
  protocol: string;
  host: string;
  path: string;
  params: Record<string, string>;
} {
  try {
    const url = new URL(uri);
    const params: Record<string, string> = {};
    url.searchParams.forEach((value, key) => {
      params[key] = value;
    });

    return {
      protocol: url.protocol.replace(':', ''),
      host: url.host,
      path: url.pathname,
      params,
    };
  } catch {
    // Handle non-standard URIs
    const match = uri.match(/^(\w+):\/\/([^/]*)(.*)$/);
    if (match) {
      return {
        protocol: match[1],
        host: match[2],
        path: match[3],
        params: {},
      };
    }
    return {
      protocol: '',
      host: '',
      path: uri,
      params: {},
    };
  }
}
