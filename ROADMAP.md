# Stacks Roadmap

This file tracks planned features, known issues, and backlogged ideas. It is roughly ordered by priority but nothing here is a firm commitment.

---

## Known issues

- **macOS zip gotcha** — compressing a folder rather than individual files wraps the package in a subdirectory, causing import to fail. Needs a better UX solution so users don't have to know this.
- **Session persistence** — changes made during a session are held in memory only. If the tab is closed without exporting, changes are lost. A toast reminder is shown on load but a more robust solution is planned (see backlog).

---

## Up next

- [ ] Autofill suggestions on Add Record form fields — controlled per-field via `autofill: true` in schema. Applies to string and list fields only, excluding the title field and number fields.
- [ ] Improve zip creation UX — detect and handle incorrectly structured zips with a clear error message and instructions.

---

## Planned

- [ ] Theming support via `theme.yaml` — expose a predefined set of CSS variables that can be set per-package
- [ ] Title and subtitle field configuration — currently hardcoded to first and second schema fields
- [ ] CSV export
- [ ] Schema editor in the UI — currently schemas must be hand-edited in yaml
- [ ] Configurable field limit — currently hardcoded to 10 in `validate.js`
- [ ] Faceted filtering for list fields — "show me everything tagged X" with grouped display

---

## Backlog / under consideration

- [ ] **File System Access API** — grant Stacks read/write access to a user-selected folder on disk so the files themselves are the live source of truth, eliminating the manual export step. Chrome and Edge only. Needs a full design pass before implementation.
- [ ] **Dual import** — import an environment zip and a standalone `<name>.json` data file separately, so schema and data can be managed independently
- [ ] **Export data as standalone JSON** — export just the data file without wrapping it in a zip
- [ ] **`environments/` folder convention** — a suggested folder structure for organising multiple schemas and their associated data files
- [ ] **2 column card layout** — configurable card display density
- [ ] **Pagination position** — consider showing pagination controls above the list as well as below

---

## Out of scope (for now)

- Server-side storage or sync
- User accounts
- Real-time collaboration
- Mobile app
