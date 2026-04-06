// validate.js
// Stacks v0.1.0
// Validates schema and data records against the Stacks spec.

const MAX_SCHEMA_FIELDS = 10; // configurable - remove or raise this limit in a future version

const VALID_TYPES = ["string", "number", "list"];

const REQUIRED_SCHEMA_KEYS = ["name", "version", "id", "fields"];

const REQUIRED_RECORD_KEYS = ["id", "schema_id", "fields"];

// ─────────────────────────────────────────────
// validateSchema
// Validates the parsed schema.yaml object.
// Returns { valid: Boolean, schema: Object, warnings: [] }
// On hard failure, valid is false and schema is null.
// ─────────────────────────────────────────────
function validateSchema(raw) {
  const warnings = [];

  // Check required top level keys
  for (const key of REQUIRED_SCHEMA_KEYS) {
    if (raw[key] === undefined || raw[key] === null) {
      return {
        valid: false,
        schema: null,
        warnings: [`Schema is missing required field: "${key}". Package cannot be loaded.`],
      };
    }
  }

  if (!Array.isArray(raw.fields)) {
    return {
      valid: false,
      schema: null,
      warnings: [`Schema "fields" must be an array. Package cannot be loaded.`],
    };
  }

  // Enforce field limit
  let fields = raw.fields;
  if (fields.length > MAX_SCHEMA_FIELDS) {
    warnings.push(
      `Schema defines ${fields.length} fields but the maximum is ${MAX_SCHEMA_FIELDS}. ` +
      `Fields beyond the limit have been dropped: ${fields.slice(MAX_SCHEMA_FIELDS).map(f => f.id || "unknown").join(", ")}.`
    );
    fields = fields.slice(0, MAX_SCHEMA_FIELDS);
  }

  // Validate each field definition
  const validatedFields = [];
  for (const field of fields) {
    const fieldWarnings = [];

    if (!field.id) {
      fieldWarnings.push(`A field is missing an "id" and will be skipped.`);
      warnings.push(...fieldWarnings);
      continue;
    }

    if (!field.name) {
      fieldWarnings.push(`Field "${field.id}" is missing a "name". It will use the id as the display label.`);
      field.name = field.id;
    }

    if (!VALID_TYPES.includes(field.type)) {
      fieldWarnings.push(
        `Field "${field.id}" has an invalid type "${field.type}". Defaulting to "string".`
      );
      field.type = "string";
    }

    if (typeof field.required !== "boolean") {
      field.required = false;
    }

    warnings.push(...fieldWarnings);
    validatedFields.push({
      id: field.id,
      name: field.name,
      type: field.type,
      required: field.required,
    });
  }

  const schema = {
    name: raw.name,
    version: raw.version,
    id: raw.id,
    fields: validatedFields,
  };

  return { valid: true, schema, warnings };
}

// ─────────────────────────────────────────────
// validateRecord
// Validates a single data record against the loaded schema.
// Returns { valid: Boolean, record: Object, warnings: [] }
// Records are never hard-failed — they are always returned with warnings.
// ─────────────────────────────────────────────
function validateRecord(raw, schema) {
  const warnings = [];
  const recordId = raw.id || "unknown";

  // Check required record keys
  for (const key of REQUIRED_RECORD_KEYS) {
    if (raw[key] === undefined || raw[key] === null) {
      warnings.push(`Record "${recordId}" is missing required key "${key}".`);
    }
  }

  // Check schema_id matches
  if (raw.schema_id && raw.schema_id !== schema.id) {
    warnings.push(
      `Record "${recordId}" has schema_id "${raw.schema_id}" but loaded schema is "${schema.id}".`
    );
  }

  const rawFields = raw.fields || {};
  const validatedFields = {};

  // Validate fields against schema
  for (const fieldDef of schema.fields) {
    const value = rawFields[fieldDef.id];

    // Missing required field
    if (value === undefined || value === null) {
      if (fieldDef.required) {
        warnings.push(
          `Record "${recordId}" is missing required field "${fieldDef.id}". Treating as empty.`
        );
      }
      validatedFields[fieldDef.id] = fieldDef.type === "list" ? [] : "";
      continue;
    }

    // Type coercion
    const coerced = coerceFieldValue(value, fieldDef.type);
    if (coerced.warned) {
      warnings.push(
        `Record "${recordId}" field "${fieldDef.id}" has unexpected type. Treating as ${fieldDef.type}.`
      );
    }
    validatedFields[fieldDef.id] = coerced.value;
  }

  // Flag unknown fields
  for (const key of Object.keys(rawFields)) {
    const knownIds = schema.fields.map(f => f.id);
    if (!knownIds.includes(key)) {
      warnings.push(
        `Record "${recordId}" contains unknown field "${key}" not defined in schema. It will still be displayed.`
      );
      validatedFields[key] = rawFields[key];
    }
  }

  const record = {
    id: raw.id || generateId(),
    schema_id: raw.schema_id || schema.id,
    created_at: raw.created_at || new Date().toISOString(),
    updated_at: raw.updated_at || new Date().toISOString(),
    fields: validatedFields,
    _warnings: warnings,
  };

  return { valid: true, record, warnings };
}

// ─────────────────────────────────────────────
// coerceFieldValue
// Attempts to coerce a raw value to the expected type.
// Returns { value, warned: Boolean }
// ─────────────────────────────────────────────
function coerceFieldValue(value, expectedType) {
  switch (expectedType) {
    case "string":
      if (typeof value === "string") return { value, warned: false };
      return { value: String(value), warned: true };

    case "number":
      if (typeof value === "number") return { value, warned: false };
      const parsed = parseFloat(value);
      if (!isNaN(parsed)) return { value: parsed, warned: true };
      return { value: 0, warned: true };

    case "list":
      if (Array.isArray(value)) return { value, warned: false };
      if (typeof value === "string") return { value: [value], warned: true };
      return { value: [String(value)], warned: true };

    default:
      return { value: String(value), warned: true };
  }
}

// ─────────────────────────────────────────────
// generateId
// Fallback ID generator for records missing an id.
// ─────────────────────────────────────────────
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}
