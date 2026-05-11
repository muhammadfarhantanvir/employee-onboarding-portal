import * as SwaggerSchemas from './swagger.schemas';

/** OpenAPI 3 schema object (inline definitions used across controllers). */
type InlineSchema = Record<string, unknown>;

function isInlineSchema(value: unknown): value is InlineSchema {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  const o = value as InlineSchema;
  return Boolean(o.type || o.allOf || o.oneOf || o.anyOf || o.properties);
}

/**
 * CamelCase export stem → PascalCase `components.schemas` name
 * (same style as other APIs: `Batch`, `APOS`, `AssignmentStepBatch`).
 * `itChecklist…` → `ITChecklist…` so IT-domain models read as an acronym, not "It".
 */
function camelBaseToComponentName(base: string): string {
  if (/^it[A-Z]/.test(base)) {
    return `IT${base.slice(2)}`;
  }
  return base.charAt(0).toUpperCase() + base.slice(1);
}

/** Maps `hireTaskSchema` → `HireTask`, `itChecklistSchema` → `ITChecklist`, etc. */
function exportKeyToComponentName(exportKey: string): string | null {
  if (!exportKey.endsWith('Schema')) {
    return null;
  }
  const base = exportKey.slice(0, -'Schema'.length);
  return camelBaseToComponentName(base);
}

/**
 * Every exported `*Schema` from swagger.schemas.ts, keyed for OpenAPI `components.schemas`.
 * Swagger UI then shows a bottom **Schemas** section: one collapsible row per name, like your reference project.
 */
export function buildSwaggerComponentsSchemas(): Record<string, InlineSchema> {
  const out: Record<string, InlineSchema> = {};
  const mod = SwaggerSchemas as Record<string, unknown>;
  for (const exportKey of Object.keys(mod)) {
    const value = mod[exportKey];
    if (!isInlineSchema(value)) {
      continue;
    }
    const name = exportKeyToComponentName(exportKey);
    if (!name) {
      continue;
    }
    out[name] = value;
  }
  return out;
}
