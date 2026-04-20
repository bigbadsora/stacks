// import.js
// Stacks v0.1.0
// Handles loading and parsing a Stacks zip package from a browser File object.
// Depends on: JSZip (vendor/jszip.min.js), js-yaml (vendor/js-yaml.min.js), validate.js, defaults.js

const EXPECTED_FILES = ["meta.yaml", "schema.yaml", "theme.yaml", "data.json"];

// ─────────────────────────────────────────────
// loadPackage
// Main entry point. Takes a browser File object (from a file input).
// Returns a package object or throws on hard failure.
//
// Returns:
// {
//   meta:     Object,
//   schema:   Object,
//   theme:    Object,
//   data:     Object,
//   warnings: []
// }
// ─────────────────────────────────────────────
async function loadPackage(file) {
  const warnings = [];

  // ── Step 1: Unzip ──
  let zip;
  try {
    zip = await JSZip.loadAsync(file);
  } catch (err) {
    throw new Error(`Could not open zip file. It may be corrupted or not a valid Stacks package. (${err.message})`);
  }

  // ── Step 2: Check all expected files are present ──
  for (const filename of EXPECTED_FILES) {
    if (!zip.file(filename)) {
      throw new Error(`Missing required file "${filename}" in package. This does not appear to be a valid Stacks package.`);
    }
  }

  // ── Step 3: Parse meta.yaml ──
  let meta;
  try {
    const raw = await zip.file("meta.yaml").async("string");
    meta = jsyaml.load(raw);
    if (!meta || typeof meta !== "object") throw new Error("meta.yaml is empty or not a valid object.");
  } catch (err) {
    throw new Error(`Could not parse meta.yaml. (${err.message})`);
  }

  // ── Step 4: Parse schema.yaml and validate ──
  let schema;
  try {
    const raw = await zip.file("schema.yaml").async("string");
    const parsedSchema = jsyaml.load(raw);
    if (!parsedSchema || typeof parsedSchema !== "object") throw new Error("schema.yaml is empty or not a valid object.");

    const result = validateSchema(parsedSchema);
    if (!result.valid) {
      throw new Error(result.warnings.join(" "));
    }
    schema = result.schema;
    warnings.push(...result.warnings);
  } catch (err) {
    throw new Error(`Could not parse or validate schema.yaml. (${err.message})`);
  }

  // ── Step 5: Parse theme.yaml ──
  // Theming is not implemented in v0.1 — parsed but not applied.
  let theme;
  try {
    const raw = await zip.file("theme.yaml").async("string");
    theme = jsyaml.load(raw) || {};
  } catch (err) {
    // Theme failure is non-fatal — warn and continue with empty theme
    warnings.push(`Could not parse theme.yaml. Theming will be skipped. (${err.message})`);
    theme = {};
  }

  // ── Step 6: Parse data.json and validate records ──
  let data;
  try {
    const raw = await zip.file("data.json").async("string");
    const parsedData = JSON.parse(raw);
    if (!parsedData || typeof parsedData !== "object") throw new Error("data.json is empty or not a valid object.");
    if (!Array.isArray(parsedData.records)) throw new Error("data.json must contain a \"records\" array.");

    const validatedRecords = [];
    for (const rawRecord of parsedData.records) {
      const result = validateRecord(rawRecord, schema);
      validatedRecords.push(result.record);
      warnings.push(...result.warnings);
    }

    data = {
      total_records: validatedRecords.length,
      last_updated: parsedData.last_updated || null,
      records: validatedRecords,
    };
  } catch (err) {
    throw new Error(`Could not parse or validate data.json. (${err.message})`);
  }
  // ── Step 7: Check for files folder inside Stacks package ──
  let fileFolder;
  try {
  const fileFolder = zip.folder(`${meta.fileDirectory}`);

  const filesInFolder = Object.values(fileFolder.files).filter(file => {
  return !file.dir &&                           // not a folder
         file.name.startsWith(fileFolder.root); // starts with "files/"
  });

  console.log("Files inside files/ folder:", filesInFolder);
  } catch (err){
     throw new Error(`Could not correct import folder. (${err.message})`);
  }


  return { meta, schema, theme, data, filesInFolder, warnings };
}


// ─────────────────────────────────────────────
// loadDefaultPackage
// Returns the bundled default package from defaults.js.
// No fetch, no server required — works from a local file:// URL.
// ─────────────────────────────────────────────
function loadDefaultPackage() {
  return structuredClone(STACKS_DEFAULT_PACKAGE);
}
