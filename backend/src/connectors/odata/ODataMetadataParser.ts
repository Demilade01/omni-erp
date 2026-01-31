/**
 * OData Metadata Parser
 * Parses OData $metadata XML response into structured format
 * Supports both OData v2 (EDMX) and v4 (CSDL) formats
 */

import { XMLParser } from 'fast-xml-parser';
import { logger } from '../../config/logger';
import {
  ODataVersion,
  ODataServiceMetadata,
  ODataEntityType,
  ODataEntitySet,
  ODataProperty,
  ODataNavigationProperty,
  ODataFunction,
  ODataAction,
  ODataParameter,
} from './types';

/**
 * OData Metadata Parser Class
 */
export class ODataMetadataParser {
  private parser: XMLParser;
  private version: ODataVersion;

  constructor(version: ODataVersion = ODataVersion.V4) {
    this.version = version;
    this.parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      textNodeName: '#text',
      parseAttributeValue: true,
      trimValues: true,
      isArray: (tagName) => {
        // Tags that should always be arrays
        const arrayTags = [
          'EntityType',
          'ComplexType',
          'EntitySet',
          'Property',
          'NavigationProperty',
          'Key',
          'PropertyRef',
          'Function',
          'Action',
          'Parameter',
          'FunctionImport',
          'ActionImport',
          'NavigationPropertyBinding',
          'Association',
          'AssociationSet',
        ];
        return arrayTags.includes(tagName);
      },
    });
  }

  /**
   * Parse OData metadata XML
   */
  parse(xmlData: string): ODataServiceMetadata {
    try {
      const parsed = this.parser.parse(xmlData);

      // Detect version from XML structure
      const edmx = parsed['edmx:Edmx'] || parsed['Edmx'];
      if (!edmx) {
        logger.warn('Invalid OData metadata: No EDMX root element found');
        return this.emptyMetadata();
      }

      // Get data services version
      const version = edmx['@_Version'] || '4.0';
      const isV2 = version.startsWith('1.') || version.startsWith('2.');

      const dataServices = edmx['edmx:DataServices'] || edmx['DataServices'];
      if (!dataServices) {
        logger.warn('Invalid OData metadata: No DataServices element found');
        return this.emptyMetadata();
      }

      // Get schema(s)
      const schemas = this.ensureArray(dataServices['Schema']);

      const entityTypes: ODataEntityType[] = [];
      const entitySets: ODataEntitySet[] = [];
      const functions: ODataFunction[] = [];
      const actions: ODataAction[] = [];

      for (const schema of schemas) {
        const namespace = schema['@_Namespace'] || '';

        // Parse entity types
        const schemaEntityTypes = this.ensureArray(schema['EntityType']);
        for (const et of schemaEntityTypes) {
          entityTypes.push(this.parseEntityType(et, namespace, isV2));
        }

        // Parse entity container (entity sets)
        const containers = this.ensureArray(schema['EntityContainer']);
        for (const container of containers) {
          const sets = this.ensureArray(container['EntitySet']);
          for (const es of sets) {
            entitySets.push(this.parseEntitySet(es, namespace, isV2));
          }

          // Parse function imports (v2) or functions (v4)
          const functionImports = this.ensureArray(container['FunctionImport']);
          for (const fi of functionImports) {
            functions.push(this.parseFunctionImport(fi, namespace, isV2));
          }

          // Parse action imports (v4)
          const actionImports = this.ensureArray(container['ActionImport']);
          for (const ai of actionImports) {
            actions.push(this.parseActionImport(ai, namespace));
          }
        }

        // Parse standalone functions (v4)
        const schemaFunctions = this.ensureArray(schema['Function']);
        for (const fn of schemaFunctions) {
          functions.push(this.parseFunction(fn, namespace));
        }

        // Parse standalone actions (v4)
        const schemaActions = this.ensureArray(schema['Action']);
        for (const action of schemaActions) {
          actions.push(this.parseAction(action, namespace));
        }
      }

      const metadata: ODataServiceMetadata = {
        version: this.version,
        dataServiceVersion: version,
        entityTypes,
        entitySets,
        functions: functions.length > 0 ? functions : undefined,
        actions: actions.length > 0 ? actions : undefined,
      };

      logger.debug(`Parsed OData metadata: ${entityTypes.length} entity types, ${entitySets.length} entity sets`);
      return metadata;
    } catch (error) {
      logger.error('Failed to parse OData metadata:', error);
      return this.emptyMetadata();
    }
  }

  /**
   * Parse EntityType element
   */
  private parseEntityType(et: any, namespace: string, isV2: boolean): ODataEntityType {
    const name = et['@_Name'] || '';

    // Parse key properties
    const keyElement = et['Key'];
    const keyRefs = keyElement ? this.ensureArray(keyElement['PropertyRef'] || keyElement) : [];
    const key = keyRefs
      .map((ref: any) => ref['@_Name'] || (typeof ref === 'string' ? ref : ''))
      .filter(Boolean);

    // Parse properties
    const properties: ODataProperty[] = [];
    const rawProperties = this.ensureArray(et['Property']);
    for (const prop of rawProperties) {
      properties.push(this.parseProperty(prop, isV2));
    }

    // Parse navigation properties
    const navigationProperties: ODataNavigationProperty[] = [];
    const rawNavProps = this.ensureArray(et['NavigationProperty']);
    for (const navProp of rawNavProps) {
      navigationProperties.push(this.parseNavigationProperty(navProp, isV2));
    }

    return {
      name,
      namespace,
      key,
      properties,
      navigationProperties: navigationProperties.length > 0 ? navigationProperties : undefined,
    };
  }

  /**
   * Parse Property element
   */
  private parseProperty(prop: any, isV2: boolean): ODataProperty {
    const name = prop['@_Name'] || '';
    let type = prop['@_Type'] || 'Edm.String';

    // Normalize v2 types
    if (isV2 && !type.startsWith('Edm.') && !type.includes('.')) {
      type = `Edm.${type}`;
    }

    const property: ODataProperty = {
      name,
      type: this.normalizeType(type),
    };

    // Optional attributes
    if (prop['@_Nullable'] !== undefined) {
      property.nullable = prop['@_Nullable'] === 'true' || prop['@_Nullable'] === true;
    }
    if (prop['@_MaxLength'] !== undefined) {
      property.maxLength = parseInt(prop['@_MaxLength'], 10);
    }
    if (prop['@_Precision'] !== undefined) {
      property.precision = parseInt(prop['@_Precision'], 10);
    }
    if (prop['@_Scale'] !== undefined) {
      property.scale = parseInt(prop['@_Scale'], 10);
    }
    if (prop['@_Unicode'] !== undefined) {
      property.unicode = prop['@_Unicode'] === 'true' || prop['@_Unicode'] === true;
    }
    if (prop['@_DefaultValue'] !== undefined) {
      property.defaultValue = prop['@_DefaultValue'];
    }

    return property;
  }

  /**
   * Parse NavigationProperty element
   */
  private parseNavigationProperty(navProp: any, isV2: boolean): ODataNavigationProperty {
    const name = navProp['@_Name'] || '';
    let type = navProp['@_Type'] || '';

    // V2 uses Relationship attribute, V4 uses Type
    if (isV2) {
      // In v2, navigation property type comes from Association
      type = navProp['@_ToRole'] || navProp['@_Relationship'] || '';
    }

    const navigationProperty: ODataNavigationProperty = {
      name,
      type: this.normalizeType(type),
    };

    if (navProp['@_Partner']) {
      navigationProperty.partner = navProp['@_Partner'];
    }
    if (navProp['@_ContainsTarget'] !== undefined) {
      navigationProperty.containsTarget =
        navProp['@_ContainsTarget'] === 'true' || navProp['@_ContainsTarget'] === true;
    }

    // Referential constraint
    const refConstraint = navProp['ReferentialConstraint'];
    if (refConstraint) {
      navigationProperty.referentialConstraint = {
        property: refConstraint['@_Property'] || '',
        referencedProperty: refConstraint['@_ReferencedProperty'] || '',
      };
    }

    return navigationProperty;
  }

  /**
   * Parse EntitySet element
   */
  private parseEntitySet(es: any, namespace: string, isV2: boolean): ODataEntitySet {
    const name = es['@_Name'] || '';
    let entityType = es['@_EntityType'] || '';

    // Normalize entity type reference
    if (!entityType.includes('.')) {
      entityType = `${namespace}.${entityType}`;
    }

    const entitySet: ODataEntitySet = {
      name,
      entityType,
    };

    // Navigation property bindings (v4)
    if (!isV2) {
      const bindings = this.ensureArray(es['NavigationPropertyBinding']);
      if (bindings.length > 0) {
        entitySet.navigationPropertyBindings = {};
        for (const binding of bindings) {
          const path = binding['@_Path'] || '';
          const target = binding['@_Target'] || '';
          if (path && target) {
            entitySet.navigationPropertyBindings[path] = target;
          }
        }
      }
    }

    return entitySet;
  }

  /**
   * Parse FunctionImport element (v2/v4)
   */
  private parseFunctionImport(fi: any, namespace: string, isV2: boolean): ODataFunction {
    const name = fi['@_Name'] || '';

    const fn: ODataFunction = {
      name,
      namespace,
      isBound: false,
    };

    // Return type
    if (fi['@_ReturnType']) {
      fn.returnType = this.normalizeType(fi['@_ReturnType']);
    }

    // Parameters (v2 style)
    if (isV2) {
      const params = this.ensureArray(fi['Parameter']);
      if (params.length > 0) {
        fn.parameters = params.map((p: any) => this.parseParameter(p));
      }
    }

    // V4 uses Function attribute to reference standalone function
    if (fi['@_Function']) {
      fn.namespace = fi['@_Function'].split('.').slice(0, -1).join('.');
    }

    return fn;
  }

  /**
   * Parse ActionImport element (v4)
   */
  private parseActionImport(ai: any, namespace: string): ODataAction {
    const name = ai['@_Name'] || '';

    return {
      name,
      namespace,
      isBound: false,
    };
  }

  /**
   * Parse Function element (v4 standalone)
   */
  private parseFunction(fn: any, namespace: string): ODataFunction {
    const name = fn['@_Name'] || '';
    const isBound = fn['@_IsBound'] === 'true' || fn['@_IsBound'] === true;

    const func: ODataFunction = {
      name,
      namespace,
      isBound,
    };

    // Return type
    const returnType = fn['ReturnType'];
    if (returnType) {
      func.returnType = this.normalizeType(returnType['@_Type'] || '');
    }

    // Parameters
    const params = this.ensureArray(fn['Parameter']);
    if (params.length > 0) {
      func.parameters = params.map((p: any) => this.parseParameter(p));
    }

    return func;
  }

  /**
   * Parse Action element (v4 standalone)
   */
  private parseAction(action: any, namespace: string): ODataAction {
    const name = action['@_Name'] || '';
    const isBound = action['@_IsBound'] === 'true' || action['@_IsBound'] === true;

    const act: ODataAction = {
      name,
      namespace,
      isBound,
    };

    // Return type
    const returnType = action['ReturnType'];
    if (returnType) {
      act.returnType = this.normalizeType(returnType['@_Type'] || '');
    }

    // Parameters
    const params = this.ensureArray(action['Parameter']);
    if (params.length > 0) {
      act.parameters = params.map((p: any) => this.parseParameter(p));
    }

    return act;
  }

  /**
   * Parse Parameter element
   */
  private parseParameter(param: any): ODataParameter {
    return {
      name: param['@_Name'] || '',
      type: this.normalizeType(param['@_Type'] || 'Edm.String'),
      nullable: param['@_Nullable'] === 'true' || param['@_Nullable'] === true,
    };
  }

  /**
   * Normalize EDM type
   */
  private normalizeType(type: string): string {
    if (!type) return 'Edm.String';

    // Remove Collection() wrapper and extract inner type
    const collectionMatch = type.match(/^Collection\((.+)\)$/);
    if (collectionMatch) {
      return `Collection(${this.normalizeType(collectionMatch[1])})`;
    }

    // Common type mappings
    const typeMappings: Record<string, string> = {
      'String': 'Edm.String',
      'Int32': 'Edm.Int32',
      'Int64': 'Edm.Int64',
      'Int16': 'Edm.Int16',
      'Byte': 'Edm.Byte',
      'SByte': 'Edm.SByte',
      'Decimal': 'Edm.Decimal',
      'Double': 'Edm.Double',
      'Single': 'Edm.Single',
      'Boolean': 'Edm.Boolean',
      'DateTime': 'Edm.DateTime',
      'DateTimeOffset': 'Edm.DateTimeOffset',
      'Time': 'Edm.Time',
      'TimeOfDay': 'Edm.TimeOfDay',
      'Date': 'Edm.Date',
      'Guid': 'Edm.Guid',
      'Binary': 'Edm.Binary',
      'Stream': 'Edm.Stream',
    };

    return typeMappings[type] || type;
  }

  /**
   * Ensure value is an array
   */
  private ensureArray<T>(value: T | T[] | undefined): T[] {
    if (value === undefined || value === null) return [];
    return Array.isArray(value) ? value : [value];
  }

  /**
   * Return empty metadata structure
   */
  private emptyMetadata(): ODataServiceMetadata {
    return {
      version: this.version,
      entityTypes: [],
      entitySets: [],
    };
  }
}

/**
 * Parse OData metadata XML (convenience function)
 */
export function parseODataMetadata(
  xmlData: string,
  version: ODataVersion = ODataVersion.V4
): ODataServiceMetadata {
  const parser = new ODataMetadataParser(version);
  return parser.parse(xmlData);
}
