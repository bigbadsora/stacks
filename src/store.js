// store.js
// Stacks v0.1.0
// In-memory state management for the currently loaded package.
// This is the single source of truth for all loaded data.
// No persistence — state lives only for the duration of the session.
// Depends on: validate.js (for generateId)

const store = (() => {

  // ── Internal state ──
  let _state = {
    loaded: false,
    meta:   null,
    schema: null,
    theme:  null,
    data:   {
      total_records: 0,
      last_updated:  null,
      records:       [],
    },
    warnings: [],
  };

  // ─────────────────────────────────────────────
  // get
  // Returns a reference to the current state.
  // Do not mutate the returned object directly — use the store methods.
  // ─────────────────────────────────────────────
  function get() {
    return _state;
  }

  // ─────────────────────────────────────────────
  // set
  // Replaces the entire state with a newly loaded package.
  // Called by import.js after a successful load.
  // ─────────────────────────────────────────────
  function set(pkg) {
    _state = {
      loaded:   true,
      meta:     pkg.meta,
      schema:   pkg.schema,
      theme:    pkg.theme,
      data:     pkg.data,
      warnings: pkg.warnings || [],
    };
  }

  // ─────────────────────────────────────────────
  // clear
  // Resets state back to empty.
  // Called when the user wants to load a new package.
  // ─────────────────────────────────────────────
  function clear() {
    _state = {
      loaded: false,
      meta:   null,
      schema: null,
      theme:  null,
      data: {
        total_records: 0,
        last_updated:  null,
        records:       [],
      },
      warnings: [],
    };
  }

  // ─────────────────────────────────────────────
  // addRecord
  // Adds a new record to the store.
  // Accepts a fields object keyed by field id.
  // Returns the new record.
  // ─────────────────────────────────────────────
  function addRecord(fields) {
    const now = new Date().toISOString();
    const record = {
      id:        generateId(),
      schema_id: _state.schema.id,
      created_at: now,
      updated_at: now,
      fields:    { ...fields },
      _warnings: [],
    };
    _state.data.records.unshift(record);
    _state.data.total_records = _state.data.records.length;
    _state.data.last_updated = now;
    return record;
  }

  // ─────────────────────────────────────────────
  // updateRecord
  // Updates the fields of an existing record by id.
  // Returns the updated record or null if not found.
  // ─────────────────────────────────────────────
  function updateRecord(id, fields) {
    const idx = _state.data.records.findIndex(r => r.id === id);
    if (idx === -1) return null;

    const now = new Date().toISOString();
    _state.data.records[idx] = {
      ..._state.data.records[idx],
      updated_at: now,
      fields: { ...fields },
      _warnings: [],
    };
    _state.data.last_updated = now;
    return _state.data.records[idx];
  }

  // ─────────────────────────────────────────────
  // deleteRecord
  // Removes a record by id.
  // Returns true if found and deleted, false if not found.
  // ─────────────────────────────────────────────
  function deleteRecord(id) {
    const idx = _state.data.records.findIndex(r => r.id === id);
    if (idx === -1) return false;

    _state.data.records.splice(idx, 1);
    _state.data.total_records = _state.data.records.length;
    _state.data.last_updated = new Date().toISOString();
    return true;
  }

  // ─────────────────────────────────────────────
  // getRecord
  // Returns a single record by id or null if not found.
  // ─────────────────────────────────────────────
  function getRecord(id) {
    return _state.data.records.find(r => r.id === id) || null;
  }

  // ─────────────────────────────────────────────
  // isLoaded
  // Returns true if a package is currently loaded.
  // ─────────────────────────────────────────────
  function isLoaded() {
    return _state.loaded;
  }

  return {
    get,
    set,
    clear,
    addRecord,
    updateRecord,
    deleteRecord,
    getRecord,
    isLoaded,
  };

})();
