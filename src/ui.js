// ui.js
// Stacks v0.1.0
// Handles all rendering and DOM interaction.
// Depends on: store.js, import.js, export.js, validate.js

// ─────────────────────────────────────────────
// Internal UI state
// ─────────────────────────────────────────────
let _searchQuery  = "";
let _activeFilter = "all";
let _editingId    = null;
let _currentPage  = 1;
let _pageSize     = 10;
let _sortKey      = "created_at";
let _sortDir      = "desc";

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
          <button class="btn-primary" id="importBtn">Import .zip Package</button>
          <div class="sample-picker-wrap">
            <button class="btn-secondary" id="sampleBtn">Load Sample ▾</button>
            <div class="sample-dropdown" id="sampleDropdown" style="display:none">
              ${STACKS_SAMPLES.map(s => `
                <button class="sample-option" data-sample-id="${s.id}">
                  <span class="sample-option-name">${esc(s.name)}</span>
                  <span class="sample-option-desc">${esc(s.description)}</span>
                </button>
              `).join("")}
            </div>
          </div>
        </div>
        <p class="landing-hint">Import a <code>.zip</code> Stacks package, or load a sample collection to explore.</p>
      </div>
    </div>
    <input type="file" id="importFile" accept=".zip" style="display:none">
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

  // Sample picker toggle
  document.getElementById("sampleBtn").addEventListener("click", (e) => {
    e.stopPropagation();
    const dropdown = document.getElementById("sampleDropdown");
    dropdown.style.display = dropdown.style.display === "none" ? "block" : "none";
  });

  // Close dropdown if clicking outside
  document.addEventListener("click", () => {
    const dropdown = document.getElementById("sampleDropdown");
    if (dropdown) dropdown.style.display = "none";
  }, { once: true });

  // Sample selection
  document.getElementById("sampleDropdown").addEventListener("click", (e) => {
    const btn = e.target.closest(".sample-option");
    if (!btn) return;
    const id = btn.dataset.sampleId;
    const sample = STACKS_SAMPLES.find(s => s.id === id);
    if (!sample) return;
    try {
      store.set(structuredClone(sample));
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
          <span class="header-app-name">Stacks</span>
          <span class="header-sep">·</span>
          <span class="header-collection">${esc(state.meta.name)}</span>
          <span class="header-sep">·</span>
          <span class="header-count" id="recordCount">${state.data.records.length} records</span>
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
      ${renderSessionToast()}

      <div class="toolbar">
        <div class="search-wrap">
          <input class="search-input" id="searchInput" placeholder="Search…" autocomplete="off" value="${esc(_searchQuery)}">
        </div>
        ${renderSortDropdown(schema)}
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
      <div class="pagination" id="pagination"></div>

    </div>
  `;

  renderCards();
}

function bindMainEvents() {
  // Search
  document.getElementById("searchInput").addEventListener("input", (e) => {
    _searchQuery = e.target.value;
    _currentPage = 1;
    renderCards();
  });

  // Filter tabs
  document.getElementById("filterTabs").addEventListener("click", (e) => {
    const tab = e.target.closest(".filter-tab");
    if (!tab) return;
    _activeFilter = tab.dataset.filter;
    _currentPage = 1;
    document.querySelectorAll(".filter-tab").forEach(t => t.classList.remove("active"));
    tab.classList.add("active");
    renderCards();
  });

  // Sort
  document.getElementById("sortSelect").addEventListener("change", (e) => {
    const [key, dir] = e.target.value.split("|");
    _sortKey = key;
    _sortDir = dir;
    _currentPage = 1;
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
    if (!confirm("Unload this collection? Make sure you have exported a backup first — any changes made this session will be lost.")) return;
    store.clear();
    _searchQuery  = "";
    _activeFilter = "all";
    _editingId    = null;
    _currentPage  = 1;
    _sortKey      = "created_at";
    _sortDir      = "desc";
    renderLanding();
    bindLandingEvents();
  });

  bindSessionToast();
}

// ══════════════════════════════════════════════
// SORT
// ══════════════════════════════════════════════

function renderSortDropdown(schema) {
  const dateOptions = `
    <option value="created_at|desc" ${_sortKey === "created_at" && _sortDir === "desc" ? "selected" : ""}>Date added (newest)</option>
    <option value="created_at|asc"  ${_sortKey === "created_at" && _sortDir === "asc"  ? "selected" : ""}>Date added (oldest)</option>
  `;

  const fieldOptions = schema.fields.map(f => {
    if (f.type === "list") {
      return `<option disabled>${esc(f.name)} (not sortable)</option>`;
    }
    if (!f.sortable) return "";
    if (f.type === "number") {
      return `
        <option value="${esc(f.id)}|asc"  ${_sortKey === f.id && _sortDir === "asc"  ? "selected" : ""}>${esc(f.name)} (asc)</option>
        <option value="${esc(f.id)}|desc" ${_sortKey === f.id && _sortDir === "desc" ? "selected" : ""}>${esc(f.name)} (desc)</option>
      `;
    }
    return `
      <option value="${esc(f.id)}|asc"  ${_sortKey === f.id && _sortDir === "asc"  ? "selected" : ""}>${esc(f.name)} (A–Z)</option>
      <option value="${esc(f.id)}|desc" ${_sortKey === f.id && _sortDir === "desc" ? "selected" : ""}>${esc(f.name)} (Z–A)</option>
    `;
  }).join("");

  return `
    <select class="sort-select" id="sortSelect">
      ${dateOptions}
      ${fieldOptions}
    </select>
  `;
}

// ══════════════════════════════════════════════
// CARDS
// ══════════════════════════════════════════════

function renderCards() {
  const state = store.get();
  const schema = state.schema;
  const query = _searchQuery.trim();
  const filtered = state.data.records.filter(r => matchesSearch(r, query, _activeFilter, schema));

  const countEl = document.getElementById("recordCount");
  if (countEl) countEl.textContent = state.data.records.length + " records";

  const list  = document.getElementById("cardList");
  const empty = document.getElementById("emptyState");

  if (filtered.length === 0) {
    list.innerHTML = "";
    empty.style.display = "block";
    document.getElementById("pagination").innerHTML = "";
    return;
  }

  empty.style.display = "none";

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    let aVal, bVal;
    if (_sortKey === "created_at" || _sortKey === "updated_at") {
      aVal = a[_sortKey] || "";
      bVal = b[_sortKey] || "";
    } else {
      aVal = a.fields[_sortKey] ?? "";
      bVal = b.fields[_sortKey] ?? "";
    }
    if (typeof aVal === "number" && typeof bVal === "number") {
      return _sortDir === "asc" ? aVal - bVal : bVal - aVal;
    }
    aVal = String(aVal).toLowerCase();
    bVal = String(bVal).toLowerCase();
    if (aVal < bVal) return _sortDir === "asc" ? -1 : 1;
    if (aVal > bVal) return _sortDir === "asc" ? 1 : -1;
    return 0;
  });

  // Paginate
  const totalPages = _pageSize === 0 ? 1 : Math.ceil(sorted.length / _pageSize);
  if (_currentPage > totalPages) _currentPage = totalPages;

  const paginated = _pageSize === 0
    ? sorted
    : sorted.slice((_currentPage - 1) * _pageSize, _currentPage * _pageSize);

  list.innerHTML = paginated.map(record => renderCard(record, schema, query)).join("");

  renderPagination(sorted.length, totalPages);
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
// PAGINATION
// ══════════════════════════════════════════════

function renderPagination(totalFiltered, totalPages) {
  const container = document.getElementById("pagination");

  const pageInfo = _pageSize === 0
    ? `Showing all ${totalFiltered} records`
    : `Page ${_currentPage} of ${totalPages} · ${totalFiltered} records`;

  const prevDisabled = _currentPage <= 1 || _pageSize === 0;
  const nextDisabled = _currentPage >= totalPages || _pageSize === 0;

  container.innerHTML = `
    <div class="pagination-inner">
      <div class="pagination-controls">
        <button class="btn-small" id="prevPageBtn" ${prevDisabled ? "disabled" : ""}>← Prev</button>
        <span class="pagination-info">${pageInfo}</span>
        <button class="btn-small" id="nextPageBtn" ${nextDisabled ? "disabled" : ""}>Next →</button>
      </div>
      <div class="pagination-size">
        <label for="pageSizeSelect">Per page</label>
        <select id="pageSizeSelect">
          <option value="10"  ${_pageSize === 10  ? "selected" : ""}>10</option>
          <option value="25"  ${_pageSize === 25  ? "selected" : ""}>25</option>
          <option value="50"  ${_pageSize === 50  ? "selected" : ""}>50</option>
          <option value="0"   ${_pageSize === 0   ? "selected" : ""}>All</option>
        </select>
      </div>
    </div>
  `;

  if (!prevDisabled) {
    document.getElementById("prevPageBtn").addEventListener("click", () => {
      _currentPage--;
      renderCards();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  if (!nextDisabled) {
    document.getElementById("nextPageBtn").addEventListener("click", () => {
      _currentPage++;
      renderCards();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  document.getElementById("pageSizeSelect").addEventListener("change", (e) => {
    _pageSize = parseInt(e.target.value);
    _currentPage = 1;
    renderCards();
  });
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

function renderSessionToast() {
  return `
    <div class="session-toast" id="sessionToast">
      <span><strong>Stacks</strong> — your changes live in this tab. Export a backup before you go.</span>
      <button class="session-toast-close" id="sessionToastClose" title="Dismiss">✕</button>
    </div>
  `;
}

function bindSessionToast() {
  const toast = document.getElementById("sessionToast");
  const close = document.getElementById("sessionToastClose");
  if (!toast || !close) return;

  // Auto-dismiss after 6 seconds
  const timer = setTimeout(() => dismissToast(toast), 6000);

  close.addEventListener("click", () => {
    clearTimeout(timer);
    dismissToast(toast);
  });
}

function dismissToast(toast) {
  toast.style.opacity = "0";
  toast.style.transition = "opacity 0.4s";
  setTimeout(() => toast.remove(), 400);
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
