/**
 * Prompt Templates
 * Reusable prompt templates for different AI tasks
 */

import {
  PromptTemplate,
  PromptCategory,
  AIModel,
  ChatMessage,
  MessageRole,
} from './types';

/**
 * Built-in prompt templates for ERP integration tasks
 */
export const PROMPT_TEMPLATES: Record<string, PromptTemplate> = {
  // Field Mapping Suggestions
  FIELD_MAPPING: {
    id: 'field_mapping',
    name: 'Field Mapping Suggestion',
    description: 'Suggests field mappings between source and target schemas',
    systemPrompt: `You are an expert data integration specialist. Your task is to analyze source and target data schemas and suggest optimal field mappings.

Consider:
- Field names and their semantic meanings
- Data types and compatibility
- Common naming conventions in ERP systems
- Business logic and relationships

Respond in JSON format with suggested mappings and confidence scores.`,
    userPromptTemplate: `Analyze these schemas and suggest field mappings:

**Source Schema:**
{{sourceSchema}}

**Target Schema:**
{{targetSchema}}

**Context:**
{{context}}

Provide mapping suggestions in this JSON format:
{
  "mappings": [
    {
      "sourceField": "field_name",
      "targetField": "field_name",
      "confidence": 0.95,
      "transformation": "none|uppercase|lowercase|date_format|custom",
      "notes": "explanation"
    }
  ],
  "unmappedSource": ["field1", "field2"],
  "unmappedTarget": ["field1", "field2"],
  "recommendations": ["suggestion1", "suggestion2"]
}`,
    variables: ['sourceSchema', 'targetSchema', 'context'],
    defaultModel: AIModel.GPT_4O,
    defaultOptions: {
      temperature: 0.3,
      responseFormat: 'json_object',
    },
    category: PromptCategory.FIELD_MAPPING,
  },

  // Natural Language to OData Query
  NL_TO_ODATA: {
    id: 'nl_to_odata',
    name: 'Natural Language to OData Query',
    description: 'Converts natural language queries to OData query strings',
    systemPrompt: `You are an OData query expert. Convert natural language requests into valid OData query parameters.

Support both OData v2 and v4 syntax. Include:
- $filter for conditions
- $select for field selection
- $expand for related entities
- $orderby for sorting
- $top and $skip for pagination
- $count for including count

Always validate the query against the provided entity metadata.`,
    userPromptTemplate: `Convert this natural language query to OData:

**User Query:** {{query}}

**Entity Set:** {{entitySet}}

**Available Fields:**
{{fields}}

**OData Version:** {{version}}

Respond in JSON format:
{
  "odataQuery": "$filter=...&$select=...&$orderby=...",
  "explanation": "explanation of the query",
  "filters": [{"field": "...", "operator": "...", "value": "..."}],
  "select": ["field1", "field2"],
  "orderBy": [{"field": "...", "direction": "asc|desc"}],
  "top": null,
  "skip": null,
  "expand": [],
  "warnings": ["any issues or assumptions made"]
}`,
    variables: ['query', 'entitySet', 'fields', 'version'],
    defaultModel: AIModel.GPT_4O,
    defaultOptions: {
      temperature: 0.2,
      responseFormat: 'json_object',
    },
    category: PromptCategory.QUERY_GENERATION,
  },

  // Error Diagnosis
  ERROR_DIAGNOSIS: {
    id: 'error_diagnosis',
    name: 'Error Diagnosis',
    description: 'Analyzes errors and provides diagnosis and solutions',
    systemPrompt: `You are an expert troubleshooter for ERP integrations. Analyze error messages and logs to:
1. Identify the root cause
2. Explain what went wrong
3. Provide actionable solutions
4. Suggest preventive measures

Be specific and technical in your analysis. Consider common issues like:
- Authentication failures
- Network connectivity
- Data validation errors
- Rate limiting
- API version mismatches
- Schema incompatibilities`,
    userPromptTemplate: `Diagnose this error:

**Error Type:** {{errorType}}
**Error Message:** {{errorMessage}}
**Error Code:** {{errorCode}}

**Context:**
- System: {{system}}
- Operation: {{operation}}
- Timestamp: {{timestamp}}

**Additional Logs:**
{{logs}}

Provide diagnosis in JSON format:
{
  "rootCause": "explanation of the root cause",
  "severity": "critical|high|medium|low",
  "category": "authentication|network|validation|rate_limit|api|data|unknown",
  "solutions": [
    {
      "priority": 1,
      "action": "what to do",
      "details": "how to do it"
    }
  ],
  "preventiveMeasures": ["measure1", "measure2"],
  "relatedIssues": ["issue1", "issue2"]
}`,
    variables: ['errorType', 'errorMessage', 'errorCode', 'system', 'operation', 'timestamp', 'logs'],
    defaultModel: AIModel.GPT_4O,
    defaultOptions: {
      temperature: 0.3,
      responseFormat: 'json_object',
    },
    category: PromptCategory.ERROR_DIAGNOSIS,
  },

  // Data Classification
  DATA_CLASSIFICATION: {
    id: 'data_classification',
    name: 'Data Classification',
    description: 'Classifies data fields for sensitivity and type',
    systemPrompt: `You are a data governance expert. Analyze data fields to classify them by:

1. **Sensitivity Level:**
   - PUBLIC: Non-sensitive, can be shared freely
   - INTERNAL: Company internal use only
   - CONFIDENTIAL: Limited access, business sensitive
   - PII: Personally Identifiable Information
   - PHI: Protected Health Information
   - PCI: Payment Card Information

2. **Data Type:**
   - Identifier, Name, Email, Phone, Address, Date, Currency, Quantity, etc.

3. **Business Category:**
   - Customer, Product, Order, Financial, HR, etc.

Consider field names, sample data, and context for accurate classification.`,
    userPromptTemplate: `Classify these data fields:

**Fields:**
{{fields}}

**Sample Data (if available):**
{{sampleData}}

**Context:**
{{context}}

Respond in JSON format:
{
  "classifications": [
    {
      "field": "field_name",
      "sensitivityLevel": "PUBLIC|INTERNAL|CONFIDENTIAL|PII|PHI|PCI",
      "dataType": "type",
      "businessCategory": "category",
      "confidenceScore": 0.95,
      "notes": "explanation",
      "recommendations": ["handling recommendations"]
    }
  ],
  "summary": {
    "totalFields": 10,
    "sensitiveFields": 3,
    "piiFields": 2,
    "recommendations": ["overall recommendations"]
  }
}`,
    variables: ['fields', 'sampleData', 'context'],
    defaultModel: AIModel.GPT_4O,
    defaultOptions: {
      temperature: 0.2,
      responseFormat: 'json_object',
    },
    category: PromptCategory.DATA_CLASSIFICATION,
  },

  // Report Summarization
  REPORT_SUMMARY: {
    id: 'report_summary',
    name: 'Report Summarization',
    description: 'Summarizes data reports and extracts key insights',
    systemPrompt: `You are a business intelligence analyst. Analyze data reports and provide:

1. **Executive Summary:** High-level overview in 2-3 sentences
2. **Key Metrics:** Important numbers and their significance
3. **Trends:** Patterns or changes observed
4. **Anomalies:** Unusual data points or outliers
5. **Recommendations:** Actionable insights

Be concise but comprehensive. Use business-friendly language while maintaining accuracy.`,
    userPromptTemplate: `Summarize this report data:

**Report Type:** {{reportType}}
**Time Period:** {{timePeriod}}

**Data:**
{{data}}

**Focus Areas (if any):**
{{focusAreas}}

Provide summary in JSON format:
{
  "executiveSummary": "2-3 sentence overview",
  "keyMetrics": [
    {
      "metric": "name",
      "value": "value",
      "change": "+10%",
      "significance": "explanation"
    }
  ],
  "trends": [
    {
      "trend": "description",
      "direction": "up|down|stable",
      "impact": "high|medium|low"
    }
  ],
  "anomalies": [
    {
      "description": "what was found",
      "severity": "critical|warning|info",
      "recommendation": "what to do"
    }
  ],
  "recommendations": [
    {
      "priority": 1,
      "recommendation": "action",
      "expectedImpact": "benefit"
    }
  ]
}`,
    variables: ['reportType', 'timePeriod', 'data', 'focusAreas'],
    defaultModel: AIModel.GPT_4O,
    defaultOptions: {
      temperature: 0.4,
      responseFormat: 'json_object',
    },
    category: PromptCategory.REPORT_SUMMARY,
  },

  // Data Transformation
  DATA_TRANSFORMATION: {
    id: 'data_transformation',
    name: 'Data Transformation Rules',
    description: 'Generates data transformation rules between formats',
    systemPrompt: `You are a data transformation expert. Create transformation rules to convert data from source format to target format.

Consider:
- Data type conversions
- Format changes (dates, numbers, strings)
- Value mappings (enums, codes)
- Calculated fields
- Default values
- Null handling
- Validation rules

Generate transformation logic that can be executed programmatically.`,
    userPromptTemplate: `Create transformation rules:

**Source Format:**
{{sourceFormat}}

**Target Format:**
{{targetFormat}}

**Sample Source Data:**
{{sampleData}}

**Business Rules:**
{{businessRules}}

Respond in JSON format:
{
  "transformations": [
    {
      "sourceField": "field_name",
      "targetField": "field_name",
      "transformationType": "direct|format|lookup|calculate|concatenate|split|default",
      "rule": "transformation logic",
      "parameters": {},
      "nullHandling": "skip|default|error",
      "defaultValue": null,
      "validation": "validation rule if any"
    }
  ],
  "lookupTables": {
    "tableName": {"key": "value"}
  },
  "calculatedFields": [
    {
      "targetField": "field_name",
      "formula": "calculation formula",
      "dependencies": ["field1", "field2"]
    }
  ],
  "validationRules": [
    {
      "field": "field_name",
      "rule": "validation logic",
      "errorMessage": "message if fails"
    }
  ]
}`,
    variables: ['sourceFormat', 'targetFormat', 'sampleData', 'businessRules'],
    defaultModel: AIModel.GPT_4O,
    defaultOptions: {
      temperature: 0.3,
      responseFormat: 'json_object',
    },
    category: PromptCategory.DATA_TRANSFORMATION,
  },

  // General ERP Assistant
  ERP_ASSISTANT: {
    id: 'erp_assistant',
    name: 'ERP Assistant',
    description: 'General-purpose ERP integration assistant',
    systemPrompt: `You are an expert ERP integration assistant. You help users with:

- Understanding ERP systems (SAP, Salesforce, NetSuite, Dynamics, etc.)
- Designing integrations and data flows
- Troubleshooting connection issues
- Explaining data models and relationships
- Best practices for data synchronization
- API usage and optimization

Be helpful, accurate, and provide practical guidance. When appropriate, suggest using other specialized tools available in the system.`,
    userPromptTemplate: `{{userMessage}}`,
    variables: ['userMessage'],
    defaultModel: AIModel.GPT_4O_MINI,
    defaultOptions: {
      temperature: 0.7,
    },
    category: PromptCategory.GENERAL,
  },
};

/**
 * Prompt Template Manager
 */
export class PromptTemplateManager {
  private templates: Map<string, PromptTemplate>;
  private customTemplates: Map<string, PromptTemplate>;

  constructor() {
    this.templates = new Map(Object.entries(PROMPT_TEMPLATES));
    this.customTemplates = new Map();
  }

  /**
   * Get a template by ID
   */
  getTemplate(id: string): PromptTemplate | undefined {
    return this.customTemplates.get(id) || this.templates.get(id);
  }

  /**
   * Get all templates
   */
  getAllTemplates(): PromptTemplate[] {
    return [
      ...Array.from(this.templates.values()),
      ...Array.from(this.customTemplates.values()),
    ];
  }

  /**
   * Get templates by category
   */
  getTemplatesByCategory(category: PromptCategory): PromptTemplate[] {
    return this.getAllTemplates().filter((t) => t.category === category);
  }

  /**
   * Add a custom template
   */
  addTemplate(template: PromptTemplate): void {
    this.customTemplates.set(template.id, template);
  }

  /**
   * Remove a custom template
   */
  removeTemplate(id: string): boolean {
    return this.customTemplates.delete(id);
  }

  /**
   * Build messages from a template
   */
  buildMessages(
    templateId: string,
    variables: Record<string, string>
  ): ChatMessage[] {
    const template = this.getTemplate(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    // Replace variables in user prompt
    let userPrompt = template.userPromptTemplate;
    for (const [key, value] of Object.entries(variables)) {
      userPrompt = userPrompt.replace(new RegExp(`{{${key}}}`, 'g'), value);
    }

    // Check for missing variables
    const missingVars = userPrompt.match(/{{(\w+)}}/g);
    if (missingVars) {
      throw new Error(
        `Missing template variables: ${missingVars.join(', ')}`
      );
    }

    const messages: ChatMessage[] = [
      {
        role: MessageRole.SYSTEM,
        content: template.systemPrompt,
      },
      {
        role: MessageRole.USER,
        content: userPrompt,
      },
    ];

    return messages;
  }

  /**
   * Get template variables
   */
  getTemplateVariables(templateId: string): string[] {
    const template = this.getTemplate(templateId);
    return template?.variables || [];
  }
}

// Export singleton instance
export const promptTemplateManager = new PromptTemplateManager();

