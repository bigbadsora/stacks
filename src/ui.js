// ui.js
// Stacks v0.1.0
// Handles all rendering and DOM interaction.
// Depends on: store.js, import.js, export.js, validate.js

// ─────────────────────────────────────────────
// Internal UI state
// ─────────────────────────────────────────────
let _searchQuery = "";
let _activeFilter = "all";
let _editingId = null;

// ─────────────────────────────────────────────
// init
// Entry point. Called once on page load.
// ─────────────────────────────────────────────
function init() {
  renderLanding();
  bindLandingEvents();
}

// ══════════════════════════════════════════════
// LANDING VIEW
// ══════════════════════════════════════════════

function renderLanding() {
  document.getElementById("app").innerHTML = `
    <div class="landing">
      <div class="landing-inner">
        <h1 class="landing-title">Stacks</h1>
        <p class="landing-tagline">A portable archive for your personal collections.<br>Your data lives in a zip file on your own device.</p>
        <div class="landing-actions">
          <button class="btn-primary" id="importBtn">Import Package</button>
          <button class="btn-secondary" id="loadDefaultBtn">Load Default</button>
        </div>
        <input type="file" id="importFile" accept=".zip" style="display:none">
      </div>
    </div>
  `;
}

function bindLandingEvents() {
  document.getElementById("importBtn").addEventListener("click", () => {
    document.getElementById("importFile").click();
  });

  document.getElementById("importFile").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const pkg = await loadPackage(file);
      store.set(pkg);
      renderMain();
      bindMainEvents();
    } catch (err) {
      showError(err.message);
    }
    e.target.value = "";
  });

  document.getElementById("loadDefaultBtn").addEventListener("click", () => {
    try {
      const pkg = loadDefaultPackage();
      store.set(pkg);
      renderMain();
      bindMainEvents();
    } catch (err) {
      showError(err.message);
    }
  });
}

// ══════════════════════════════════════════════
// MAIN VIEW
// ══════════════════════════════════════════════

function renderMain() {
  const state = store.get();
  const schema = state.schema;

  document.getElementById("app").innerHTML = `
    <header class="main-header">
      <div class="header-inner">
        <div class="header-left">
          <span class="app-name">Stacks</span>
          <span class="collection-name">${esc(state.meta.name)}</span>
          <span class="record-count" id="recordCount">${state.data.records.length}</span>
        </div>
        <div class="header-right">
          <button class="btn-small" id="exportBackupBtn">Export Full Backup</button>
          <button class="btn-small" id="exportEnvBtn">Export Shareable Environment</button>
          <button class="btn-ghost" id="unloadBtn">Unload</button>
        </div>
      </div>
    </header>

    <div class="main-body">

      ${renderWarningsBanner(state.warnings)}

      <div class="toolbar">
        <div class="search-wrap">
          <input class="search-input" id="searchInput" placeholder="Search…" autocomplete="off" value="${esc(_searchQuery)}">
        </div>
        <button class="btn-primary" id="addBtn">+ Add</button>
      </div>

      <div class="filter-tabs" id="filterTabs">
        <button class="filter-tab ${_activeFilter === "all" ? "active" : ""}" data-filter="all">All</button>
        ${schema.fields.map(f => `
          <button class="filter-tab ${_activeFilter === f.id ? "active" : ""}" data-filter="${esc(f.id)}">${esc(f.name)}</button>
        `).join("")}
      </div>

      <div class="add-panel" id="addPanel" style="display:none">
        ${renderForm(schema)}
      </div>

      <div class="card-list" id="cardList"></div>
      <div class="empty-state" id="emptyState" style="display:none">No records found.</div>

    </div>
  `;

  renderCards();
}

function bindMainEvents() {
  // Search
  document.getElementById("searchInput").addEventListener("input", (e) => {
    _searchQuery = e.target.value;
    renderCards();
  });

  // Filter tabs
  document.getElementById("filterTabs").addEventListener("click", (e) => {
    const tab = e.target.closest(".filter-tab");
    if (!tab) return;
    _activeFilter = tab.dataset.filter;
    document.querySelectorAll(".filter-tab").forEach(t => t.classList.remove("active"));
    tab.classList.add("active");
    renderCards();
  });

  // Add button
  document.getElementById("addBtn").addEventListener("click", () => {
    _editingId = null;
    document.getElementById("form-title").textContent = "Add Record";
    clearForm();
    togglePanel(true);
  });

  // Form save
  document.getElementById("formSaveBtn").addEventListener("click", () => {
    handleFormSave();
  });

  // Form cancel
  document.getElementById("formCancelBtn").addEventListener("click", () => {
    togglePanel(false);
    _editingId = null;
    clearForm();
  });

  // Card actions (edit/delete) via delegation
  document.getElementById("cardList").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-action]");
    if (!btn) return;
    const id = btn.dataset.id;
    const action = btn.dataset.action;

    if (action === "edit") handleEdit(id);
    if (action === "delete") handleDelete(id);
  });

  // Export buttons
  document.getElementById("exportBackupBtn").addEventListener("click", async () => {
    try { await exportData(); } catch (err) { showError(err.message); }
  });

  document.getElementById("exportEnvBtn").addEventListener("click", async () => {
    try { await exportEnvironment(); } catch (err) { showError(err.message); }
  });

  // Unload
  document.getElementById("unloadBtn").addEventListener("click", () => {
    if (!confirm("Unload this collection? Make sure you have exported a backup first.")) return;
    store.clear();
    _searchQuery = "";
    _activeFilter = "all";
    _editingId = null;
    renderLanding();
    bindLandingEvents();
  });
}

// ══════════════════════════════════════════════
// CARDS
// ══════════════════════════════════════════════

function renderCards() {
  const state = store.get();
  const schema = state.schema;
  const query = _searchQuery.trim();
  const filtered = state.data.records.filter(r => matchesSearch(r, query, _activeFilter, schema));

  document.getElementById("recordCount").textContent = state.data.records.length;

  const list = document.getElementById("cardList");
  const empty = document.getElementById("emptyState");

  if (filtered.length === 0) {
    list.innerHTML = "";
    empty.style.display = "block";
    return;
  }

  empty.style.display = "none";
  list.innerHTML = filtered.map(record => renderCard(record, schema, query)).join("");
}

function renderCard(record, schema, query) {
  const hasWarnings = record._warnings && record._warnings.length > 0;

  const fieldHtml = schema.fields.map(f => {
    const value = record.fields[f.id];
    if (value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0)) return "";

    if (f.type === "list") {
      return `<div class="card-field">
        <span class="field-label">${esc(f.name)}</span>
        <span class="field-tags">${value.map(v => `<span class="tag">${highlight(String(v), query)}</span>`).join("")}</span>
      </div>`;
    }

    if (f.type === "embed"){
    return `<div class="card-field">
      <span><${highlight(String(value.fileType), query)} controls src="${highlight(String(value.path), query)}"></span>
    </div>`;
    }

    return `<div class="card-field">
      <span class="field-label">${esc(f.name)}</span>
      <span class="field-value">${highlight(String(value), query)}</span>
    </div>`;
  }).filter(Boolean).join("");

  const warningHtml = hasWarnings
    ? `<div class="card-warning" title="${esc(record._warnings.join("\n"))}">⚠ ${record._warnings.length} warning${record._warnings.length > 1 ? "s" : ""}</div>`
    : "";

  return `
    <div class="card ${hasWarnings ? "card--warned" : ""}">
      <div class="card-body">
        ${fieldHtml}
        ${warningHtml}
      </div>
      <div class="card-actions">
        <button class="btn-icon" data-action="edit" data-id="${esc(record.id)}" title="Edit">✎</button>
        <button class="btn-icon btn-icon--danger" data-action="delete" data-id="${esc(record.id)}" title="Delete">✕</button>
      </div>
    </div>
  `;
}

// ══════════════════════════════════════════════
// FORM
// ══════════════════════════════════════════════

function renderForm(schema) {
  const fieldInputs = schema.fields.map(f => {
    const requiredMark = f.required ? ' <span class="required">*</span>' : "";
    const hint = f.type === "list" ? ' <span class="field-hint">(comma-separated)</span>' : "";

    if (f.type === "list") {
      return `
        <div class="field">
          <label for="field-${esc(f.id)}">${esc(f.name)}${requiredMark}${hint}</label>
          <input type="text" id="field-${esc(f.id)}" data-field-id="${esc(f.id)}" data-field-type="list" placeholder="${esc(f.name)}">
        </div>`;
    }

    if (f.type === "number") {
      return `
        <div class="field">
          <label for="field-${esc(f.id)}">${esc(f.name)}${requiredMark}</label>
          <input type="number" id="field-${esc(f.id)}" data-field-id="${esc(f.id)}" data-field-type="number" placeholder="${esc(f.name)}">
        </div>`;
    }

    return `
      <div class="field">
        <label for="field-${esc(f.id)}">${esc(f.name)}${requiredMark}</label>
        <input type="text" id="field-${esc(f.id)}" data-field-id="${esc(f.id)}" data-field-type="string" placeholder="${esc(f.name)}">
      </div>`;
  }).join("");

  return `
    <div class="form-panel">
      <h2 class="form-title" id="form-title">Add Record</h2>
      <div class="form-grid">
        ${fieldInputs}
      </div>
      <div class="form-actions">
        <button class="btn-primary" id="formSaveBtn">Save</button>
        <button class="btn-secondary" id="formCancelBtn">Cancel</button>
      </div>
    </div>
  `;
}

function handleFormSave() {
  const state = store.get();
  const schema = state.schema;
  const fields = {};
  let hasError = false;

  for (const f of schema.fields) {
    const input = document.getElementById(`field-${f.id}`);
    if (!input) continue;

    const value = input.value.trim();

    if (f.required && !value) {
      input.classList.add("input--error");
      hasError = true;
      continue;
    } else {
      input.classList.remove("input--error");
    }

    if (f.type === "list") {
      fields[f.id] = value ? value.split(",").map(v => v.trim()).filter(Boolean) : [];
    } else if (f.type === "number") {
      fields[f.id] = value !== "" ? parseFloat(value) : "";
    } else {
      fields[f.id] = value;
    }
  }

  if (hasError) return;

  if (_editingId) {
    store.updateRecord(_editingId, fields);
  } else {
    store.addRecord(fields);
  }

  _editingId = null;
  clearForm();
  togglePanel(false);
  renderCards();
}

function handleEdit(id) {
  const record = store.getRecord(id);
  if (!record) return;

  const schema = store.get().schema;
  _editingId = id;
  document.getElementById("form-title").textContent = "Edit Record";
  togglePanel(true);

  for (const f of schema.fields) {
    const input = document.getElementById(`field-${f.id}`);
    if (!input) continue;
    const value = record.fields[f.id];
    if (f.type === "list") {
      input.value = Array.isArray(value) ? value.join(", ") : (value || "");
    } else {
      input.value = value !== undefined && value !== null ? value : "";
    }
  }
}

function handleDelete(id) {
  if (!confirm("Delete this record? This cannot be undone.")) return;
  store.deleteRecord(id);
  renderCards();
}

function clearForm() {
  const state = store.get();
  if (!state.schema) return;
  for (const f of state.schema.fields) {
    const input = document.getElementById(`field-${f.id}`);
    if (input) {
      input.value = "";
      input.classList.remove("input--error");
    }
  }
}

function togglePanel(open) {
  document.getElementById("addPanel").style.display = open ? "block" : "none";
}

// ══════════════════════════════════════════════
// SEARCH
// ══════════════════════════════════════════════

function matchesSearch(record, query, filter, schema) {
  if (!query) return true;
  const q = query.toLowerCase();

  const getValues = () => {
    if (filter === "all") {
      return schema.fields.flatMap(f => {
        const v = record.fields[f.id];
        return Array.isArray(v) ? v.map(String) : [String(v || "")];
      });
    }
    const v = record.fields[filter];
    return Array.isArray(v) ? v.map(String) : [String(v || "")];
  };

  return getValues().some(v => v.toLowerCase().includes(q));
}

// ══════════════════════════════════════════════
// UTILITIES
// ══════════════════════════════════════════════

function renderWarningsBanner(warnings) {
  if (!warnings || warnings.length === 0) return "";
  return `
    <div class="warnings-banner">
      <strong>⚠ ${warnings.length} warning${warnings.length > 1 ? "s" : ""} on load</strong>
      <ul>${warnings.map(w => `<li>${esc(w)}</li>`).join("")}</ul>
    </div>
  `;
}

function showError(message) {
  alert(`Stacks error: ${message}`);
}

function esc(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function highlight(text, query) {
  if (!query) return esc(text);
  const re = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
  return esc(text).replace(re, '<mark class="highlight">$1</mark>');
}
