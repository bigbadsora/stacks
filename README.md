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

---

## Getting started

1. Download or clone this repo
2. Drop `jszip.min.js` and `js-yaml.min.js` into the `vendor/` folder (see [Dependencies](#dependencies))
3. Open `index.html` in your browser
4. Click **Load Default** to explore with a sample short stories collection, or **Import Package** to load your own

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

Defines up to 10 fields for your collection. Each field has an `id` (machine readable), a `name` (display label), a `type`, and a `required` flag.

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

  - id: "author"
    name: "Author"
    type: "string"
    required: true

  - id: "themes"
    name: "Themes"
    type: "list"
    required: false
```

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
        "themes": ["ritual", "violence", "community"]
      }
    }
  ]
}
```

---

## Exporting

There are two export options:

- **Export Full Backup** — exports a complete package zip with your data and configuration. Use this for personal backups.
- **Export Shareable Environment** — exports schema, theme, and meta only, with no data. Use this to share your collection setup as a preset for others.

---

## Dependencies

Stacks vendors two small libraries that you need to download and place in the `vendor/` folder:

| Library | Version | URL |
|---|---|---|
| JSZip | 3.10.1 | https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js |
| js-yaml | 4.1.0 | https://cdnjs.cloudflare.com/ajax/libs/js-yaml/4.1.0/js-yaml.min.js |

These are not bundled in the repo to keep the source clean. Save each file to `vendor/jszip.min.js` and `vendor/js-yaml.min.js` respectively.

---

## Project structure

```
stacks/
├── index.html          # the entire application
├── vendor/             # vendored dependencies (not included, see above)
│   ├── jszip.min.js
│   └── js-yaml.min.js
├── src/
│   ├── main.js         # entry point
│   ├── defaults.js     # bundled default package
│   ├── validate.js     # schema and record validation
│   ├── store.js        # in-memory state
│   ├── import.js       # zip import and parsing
│   ├── export.js       # zip export
│   └── ui.js           # rendering and DOM
└── default/            # reference files (not loaded at runtime)
    ├── meta.yaml
    ├── schema.yaml
    ├── theme.yaml
    └── data.json
```

---

## Roadmap

- [ ] Theming support via `theme.yaml`
- [ ] Schema editor in the UI
- [ ] CSV export
- [ ] Configurable field limit
- [ ] Title/subtitle field configuration

---

## License

MIT
