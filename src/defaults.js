// defaults.js
// Stacks v0.1.0
// Default package bundled as a JS constant.
// This is the source of truth for the default package.
// The files in /default/ are reference documentation only and are not loaded at runtime.
// When updating defaults, update this file to match.

const STACKS_DEFAULT_PACKAGE = {
  meta: {
    name: "My Collection",
    version: "1.0.0",
    stacks_version: "0.1.0",
    exported_at: "",
    author: "",
  },

  schema: {
    name: "Short Stories",
    version: "1.0.0",
    id: "short-stories-v1",
    fields: [
      { id: "title",      name: "Title",      type: "string", required: true,  sortable: true  },
      { id: "author",     name: "Author",     type: "string", required: true,  sortable: true  },
      { id: "year",       name: "Year",       type: "number", required: false, sortable: true  },
      { id: "appears-in", name: "Appears In", type: "string", required: false, sortable: false },
      { id: "themes",     name: "Themes",     type: "list",   required: false, sortable: false },
      { id: "notes",      name: "Notes",      type: "string", required: false, sortable: false },
    ],
  },

  theme: {},

  data: {
    total_records: 2,
    last_updated: "2026-04-06T00:00:00Z",
    records: [
      {
        id: "abc123",
        schema_id: "short-stories-v1",
        created_at: "2026-04-06T00:00:00Z",
        updated_at: "2026-04-06T00:00:00Z",
        fields: {
          title: "The Lottery",
          author: "Shirley Jackson",
          year: 1948,
          "appears-in": "The New Yorker, June 1948 · The Lottery and Other Stories (epub)",
          themes: ["ritual", "violence", "community", "conformity"],
          notes: "Devastating final paragraph.",
        },
        _warnings: [],
      },
      {
        id: "def456",
        schema_id: "short-stories-v1",
        created_at: "2026-04-06T00:00:00Z",
        updated_at: "2026-04-06T00:00:00Z",
        fields: {
          title: "The Dead",
          author: "James Joyce",
          year: 1914,
          "appears-in": "Dubliners (epub) · The Portable James Joyce (paperback)",
          themes: ["memory", "mortality", "marriage", "Ireland"],
          notes: "Final lines are among the greatest in the language.",
        },
        _warnings: [],
      },
    ],
  },

  warnings: [],
};
