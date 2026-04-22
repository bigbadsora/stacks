// export.js
// Stacks v0.1.0
// Handles exporting a Stacks zip package from the current in-memory state.
// Depends on: JSZip (vendor/jszip.min.js), js-yaml (vendor/js-yaml.min.js), store.js

// ─────────────────────────────────────────────
// exportData
// Exports a full package zip containing all four files.
// This is the user's complete backup — data + environment.
// ─────────────────────────────────────────────
async function exportData() {
  const state = store.get();
  const zip = new JSZip();

  // Update meta with current export timestamp
  const meta = {
    ...state.meta,
    exported_at: new Date().toISOString(),
  };

  // Build fresh data.json with updated top level metadata
  const records = state.data.records;
  const lastUpdated = records.length > 0
    ? records.reduce((latest, r) => r.updated_at > latest ? r.updated_at : latest, records[0].updated_at)
    : new Date().toISOString();

  const data = {
    total_records: records.length,
    last_updated: lastUpdated,
    records: records.map(r => sanitizeRecord(r)),
  };

  zip.file("meta.yaml",   jsyaml.dump(meta,          { lineWidth: -1 }));
  zip.file("schema.yaml", jsyaml.dump(state.schema,  { lineWidth: -1 }));
  zip.file("theme.yaml",  jsyaml.dump(state.theme,   { lineWidth: -1 }));
  zip.file("data.json",   JSON.stringify(data, null, 2));

  await triggerDownload(zip, buildFilename(meta.name, "stack"));
}

// ─────────────────────────────────────────────
// exportEnvironment
// Exports an environment-only zip containing schema, theme, and meta.
// No data is included. Safe to share publicly as a preset.
// ─────────────────────────────────────────────
async function exportEnvironment() {
  const state = store.get();
  const zip = new JSZip();

  const meta = {
    ...state.meta,
    exported_at: new Date().toISOString(),
  };

  zip.file("meta.yaml",   jsyaml.dump(meta,         { lineWidth: -1 }));
  zip.file("schema.yaml", jsyaml.dump(state.schema, { lineWidth: -1 }));
  zip.file("theme.yaml",  jsyaml.dump(state.theme,  { lineWidth: -1 }));

  // Include an empty data.json so the zip is always a valid Stacks package
  const emptyData = {
    total_records: 0,
    last_updated: new Date().toISOString(),
    records: [],
  };
  zip.file("data.json", JSON.stringify(emptyData, null, 2));

  await triggerDownload(zip, buildFilename(meta.name, "stack-env"));
}

// ─────────────────────────────────────────────
// sanitizeRecord
// Strips internal Stacks properties (prefixed with _) before export.
// ─────────────────────────────────────────────
function sanitizeRecord(record) {
  const clean = {};
  for (const key of Object.keys(record)) {
    if (!key.startsWith("_")) {
      clean[key] = record[key];
    }
  }
  return clean;
}

// ─────────────────────────────────────────────
// buildFilename
// Generates a slug filename from the collection name and a suffix.
// e.g. "My Short Stories" + "stacks" → "my-short-stories-stacks.zip"
// ─────────────────────────────────────────────
function buildFilename(name, suffix) {
  const slug = (name || "stacks")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${slug}-${suffix}.zip`;
}

// ─────────────────────────────────────────────
// triggerDownload
// Generates the zip blob and triggers a browser file download.
// ─────────────────────────────────────────────
async function triggerDownload(zip, filename) {
  const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
