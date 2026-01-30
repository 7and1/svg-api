/**
 * Zod to OpenAPI Schema Converter
 *
 * Converts Zod schemas to OpenAPI 3.1 compatible schema objects.
 *
 * @packageDocumentation
 */

import type { ZodType, ZodTypeDef } from "zod";

/**
 * OpenAPI Schema Object
 */
export interface OpenAPISchema {
  type?: string;
  title?: string;
  description?: string;
  properties?: Record<string, OpenAPISchema>;
  required?: string[];
  items?: OpenAPISchema;
  enum?: (string | number)[];
  pattern?: string;
  format?: string;
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  default?: string | number | boolean;
  example?: string | number | boolean;
  allOf?: OpenAPISchema[];
  anyOf?: OpenAPISchema[];
  oneOf?: OpenAPISchema[];
  $ref?: string;
  additionalProperties?: boolean | OpenAPISchema;
}

/**
 * Zod schema check definition
 */
interface ZodCheck {
  kind: string;
  value: number;
  regex?: RegExp;
}

/**
 * Zod schema definition with internal properties
 */
interface ZodSchemaDef {
  typeName: string;
  checks?: ZodCheck[];
  values?: (string | number)[];
  value?: unknown;
  innerType?: ZodType<unknown, ZodTypeDef, unknown>;
  defaultValue?: () => unknown;
  type?: ZodType<unknown, ZodTypeDef, unknown>;
  shape?: () => Record<string, ZodType<unknown, ZodTypeDef, unknown>>;
  valueType?: ZodType<unknown, ZodTypeDef, unknown>;
  options?: ZodType<unknown, ZodTypeDef, unknown>[];
  schema?: ZodType<unknown, ZodTypeDef, unknown>;
}

/**
 * Extended Zod type with internal properties
 */
interface ZodExtended {
  _def: ZodSchemaDef;
  description?: string;
}

/**
 * Converts a Zod schema to an OpenAPI schema
 */
export function zodToOpenAPI(
  schema: ZodType<unknown, ZodTypeDef, unknown>,
): OpenAPISchema {
  const zod = schema as unknown as ZodExtended;
  const typeName = zod._def?.typeName;

  const result: OpenAPISchema = {};

  // Handle description
  if (zod.description) {
    result.description = zod.description;
  }

  switch (typeName) {
    case "ZodString": {
      result.type = "string";
      if (zod._def.checks) {
        for (const check of zod._def.checks) {
          switch (check.kind) {
            case "min":
              result.minLength = check.value;
              break;
            case "max":
              result.maxLength = check.value;
              break;
            case "pattern":
              result.pattern = check.regex.source;
              break;
          }
        }
      }
      break;
    }

    case "ZodNumber": {
      result.type = "number";
      if (zod._def.checks) {
        for (const check of zod._def.checks) {
          switch (check.kind) {
            case "min":
              result.minimum = check.value;
              break;
            case "max":
              result.maximum = check.value;
              break;
            case "int":
              result.type = "integer";
              break;
          }
        }
      }
      break;
    }

    case "ZodBoolean": {
      result.type = "boolean";
      break;
    }

    case "ZodLiteral": {
      result.type = typeof zod._def.value;
      result.enum = [zod._def.value];
      break;
    }

    case "ZodEnum": {
      result.type = "string";
      result.enum = zod._def.values;
      break;
    }

    case "ZodOptional": {
      const inner = zodToOpenAPI(zod._def.innerType);
      return { ...inner, description: result.description };
    }

    case "ZodNullable": {
      const inner = zodToOpenAPI(zod._def.innerType);
      return { ...inner, description: result.description };
    }

    case "ZodDefault": {
      const inner = zodToOpenAPI(zod._def.innerType);
      return { ...inner, default: zod._def.defaultValue() };
    }

    case "ZodArray": {
      result.type = "array";
      result.items = zodToOpenAPI(zod._def.type);
      break;
    }

    case "ZodObject": {
      result.type = "object";
      result.properties = {};
      result.required = [];

      for (const [key, value] of Object.entries(zod._def.shape())) {
        const fieldSchema = value as unknown as ZodExtended;
        const isOptional = fieldSchema._def?.typeName === "ZodOptional";
        const innerType = isOptional ? fieldSchema._def.innerType : fieldSchema;

        result.properties![key] = zodToOpenAPI(innerType);

        if (!isOptional && fieldSchema._def?.typeName !== "ZodNullable") {
          result.required!.push(key);
        }
      }

      if (result.required.length === 0) {
        delete result.required;
      }
      break;
    }

    case "ZodRecord": {
      result.type = "object";
      result.additionalProperties = zodToOpenAPI(zod._def.valueType);
      break;
    }

    case "ZodUnion":
    case "ZodDiscriminatedUnion": {
      result.oneOf = zod._def.options.map(zodToOpenAPI);
      break;
    }

    case "ZodIntersection": {
      result.allOf = zod._def.options.map(zodToOpenAPI);
      break;
    }

    case "ZodEffects": {
      return zodToOpenAPI(zod._def.schema);
    }

    default: {
      result.type = "object";
      break;
    }
  }

  return result;
}

/**
 * Creates a parameter reference for OpenAPI spec
 */
export function createParameterRef(name: string): string {
  return `#/components/parameters/${name}`;
}

/**
 * Creates a schema reference for OpenAPI spec
 */
export function createSchemaRef(name: string): string {
  return `#/components/schemas/${name}`;
}

/**
 * Creates a response reference for OpenAPI spec
 */
export function createResponseRef(name: string): string {
  return `#/components/responses/${name}`;
}
