# Stacks

A local-first personal archive for anything you collect. Short stories, vinyl records, films, books — if you collect it, Stacks can index it.

**No accounts. No cloud. No server. Your data lives in a zip file on your own device.**

> ⚠️ This project is in early development and was built with heavy AI assistance (vibecoded with Claude). It works, but expect rough edges. Contributions and feedback welcome.

---

## How it works

Stacks is a single static HTML file. You open it in a browser, import a Stacks package (a `.zip` file containing your data and configuration), and use it. When you're done, you export your package back to your device. The website is just a viewer — it never touches your data.

Because it's a static file, Stacks works:
- Opened directly from your filesystem (`file://`)
- Hosted on any static host (GitHub Pages, S3, Netlify)
- Offline, with no internet connection required

**A note on saving:** Stacks has no server and runs entirely in your browser. Changes you make during a session are held in memory — they are not automatically written anywhere. Always export a backup before closing the tab.

---

## Getting started

1. Download or clone this repo
2. Open `index.html` in your browser
3. Click **Load Sample** to explore with a sample collection, or **Import .zip Package** to load your own

---

## Sample environments

Stacks includes five sample environments to help you get started or explore what's possible. Load any of them from the landing page using the **Load Sample** button.

| Sample | Description |
|---|---|
| Short Stories | Track short fiction by title, author, theme, and where you have it |
| Music | Catalogue vinyl, CDs, cassettes, and digital albums |
| Movies | Index DVDs, Blu-rays, VHS tapes, and digital films |
| Video Games | Track your game library by platform, status, and condition |
| Books | Catalogue books by format, genre, and reading status |

Downloadable `.zip` packages for each environment are available in the `environments/` folder of this repo. Import any of them to start with a pre-configured schema and a few sample records.

---

## The package format

A Stacks package is a `.zip` file containing four files:

| File | Format | Purpose |
|---|---|---|
| `data.json` | JSON | Your collection records |
| `schema.yaml` | YAML | Defines the fields for your collection type |
| `theme.yaml` | YAML | Visual configuration (placeholder in v0.1) |
| `meta.yaml` | YAML | Package metadata |

### schema.yaml

Defines up to 10 fields for your collection. Each field has an `id` (machine readable), a `name` (display label), a `type`, a `required` flag, and an optional `sortable` flag.

Valid types: `string`, `number`, `list`

```yaml
name: "Short Stories"
version: "1.0.0"
id: "short-stories-v1"

fields:
  - id: "title"
    name: "Title"
    type: "string"
    required: true
    sortable: true

  - id: "author"
    name: "Author"
    type: "string"
    required: true
    sortable: true

  - id: "year"
    name: "Year"
    type: "number"
    required: false
    sortable: true

  - id: "themes"
    name: "Themes"
    type: "list"
    required: false
```

**Field attributes:**
- `id` — machine readable, alphanumeric and hyphens only, e.g. `appears-in`
- `name` — human readable display label
- `type` — `string`, `number`, or `list` (a list of strings)
- `required` — boolean, defaults to false
- `sortable` — boolean, defaults to false. Has no effect on `list` fields.

The first field in the list is treated as the title of each record. The second field is treated as the subtitle. Both are displayed prominently on cards.

### data.json

An array of records that conform to the schema. Top level metadata is generated automatically on export.

```json
{
  "total_records": 1,
  "last_updated": "2026-04-06T00:00:00Z",
  "records": [
    {
      "id": "abc123",
      "schema_id": "short-stories-v1",
      "created_at": "2026-04-06T00:00:00Z",
      "updated_at": "2026-04-06T00:00:00Z",
      "fields": {
        "title": "The Lottery",
        "author": "Shirley Jackson",
        "year": 1948,
        "themes": ["ritual", "violence", "community"]
      }
    }
  ]
}
```

---

## Creating a zip package

A Stacks package is a zip file containing all four files at the root level — not inside a subfolder.

**On macOS:** Select all four files, right-click, and choose Compress. Do not compress the containing folder — this will wrap the files in a subdirectory and the package will fail to import.

**On Windows:** Select all four files, right-click, and choose Send to → Compressed (zipped) folder.

---

## Exporting

There are two export options:

- **Export Full Backup** — exports a complete package zip with your data and configuration. Filename format: `my-collection-stack.zip`. Use this to save your work.
- **Export Shareable Environment** — exports schema, theme, and meta only, with no data. Filename format: `my-collection-stack-env.zip`. Use this to share your collection setup as a preset for others.

---

## Searching and sorting

The search bar searches across all fields by default. Use the filter tabs to scope your search to a specific field.

Records can be sorted using the sort dropdown in the toolbar. Sort options are generated from whichever fields have `sortable: true` in your schema. Date added (newest/oldest) is always available regardless of schema.

---

## Dependencies

Stacks depends on two small vendored libraries that are included in the repo:

| Library | Version | License |
|---|---|---|
| JSZip | 3.10.1 | MIT |
| js-yaml | 4.1.0 | MIT |

Both are included in the `vendor/` folder. No installation or package manager required.

---

## Project structure

```
stacks/
├── index.html          # application shell and script tags
├── vendor/             # vendored dependencies
│   ├── jszip.min.js
│   └── js-yaml.min.js
├── src/
│   ├── main.js         # entry point
│   ├── defaults.js     # bundled default package
│   ├── validate.js     # schema and record validation
│   ├── store.js        # in-memory state
│   ├── import.js       # zip import and parsing
│   ├── export.js       # zip export
│   ├── ui.js           # rendering and DOM
│   └── styles.css      # all styles
└── default/            # reference files (not loaded at runtime)
    ├── meta.yaml
    ├── schema.yaml
    ├── theme.yaml
    └── data.json
```

---

## Roadmap

See [ROADMAP.md](ROADMAP.md) for the full list of planned features and known issues.

---

## License

MIT
