# Build prompt — "OData Lens": a jsonformatter.org for OData queries

> Paste everything below into Claude Code CLI as your first message.
> It asks Claude to plan first, then build. Review the plan before approving.

---

## 0. Instruction to you, Claude

Do **not** write code yet. First enter plan mode, read this whole brief, ask me
any blocking questions, then produce an implementation plan with a file-by-file
breakdown and a phase order. I will approve the plan before you build.

## 1. What I'm building and why

I work in a system where OData is the normal way to query data. The pain:

- OData query URLs are single-line walls of text. There is no way to *read* one.
- No tool breaks a query down so a human can understand what it actually asks for.
- Debugging a broken `$filter` means eyeballing parentheses and `%20`s.

I want the OData equivalent of **jsonformatter.org**: paste an ugly query, get a
beautified, indented, collapsible view; edit it in that readable form; then
collapse it back into a single working URL I can paste into a client. Plus a
plain-English explanation and a diff view.

**Target:** OData **V4**, served from a .NET backend (likely ASP.NET Core OData,
possibly with a restricted subset of the spec — so the tool must degrade
gracefully on constructs it doesn't recognise, never hard-fail).

## 2. Hard constraints

- **Static site on GitHub Pages.** No backend, no server, no build-time secrets.
- **Everything runs in the browser.** No network calls required for core features.
- **No live service connection.** Schema comes from `$metadata` XML that I paste
  in manually. This is deliberate — the real services are behind corporate auth
  and CORS and I don't want the tool to depend on reaching them.
- Must work offline once loaded. Deep-linkable state (query encoded in URL hash)
  so I can share a formatted query with a colleague.
- Keep the dependency footprint small. Prefer a hand-written parser over pulling
  a heavy grammar toolkit; every existing JS OData parser I found handles only
  `$filter`, not the whole query-option set.

## 3. The core of the product: a real parser

This is the part that determines whether the tool is good or a toy. Everything
else is UI on top of it.

Build a proper **tokenizer → parser → AST → printer** pipeline for OData V4 URLs.

**Parse (input side), tolerantly:**
- Service root + resource path: entity sets, keys (`Orders(42)`, `Orders(id=42)`),
  navigation properties, `$count`, `$value`, `$ref`, casts, bound functions.
- Query options: `$filter`, `$select`, `$expand`, `$orderby`, `$top`, `$skip`,
  `$count`, `$search`, `$compute`, `$apply`, `$format`, `$skiptoken`, and
  custom/`@`-prefixed params — unknown options are preserved verbatim, not dropped.
- `$filter` grammar: `and`/`or`/`not`, comparison and arithmetic operators,
  grouping, `in`, lambda operators `any`/`all` with range variables, canonical
  functions (`contains`, `startswith`, `substringof`, `tolower`, `concat`,
  `year`, `date`, `cast`, `isof`, `geo.distance`, …), literals (string with `''`
  escaping, numbers with `L`/`M`/`d`/`f` suffixes, `null`, booleans, GUIDs,
  date/time/duration, enums `Ns.Color'Red'`), property paths across navigation.
- **Nested `$expand`** with its own inner options — arbitrary depth. This is the
  single most important construct to get right; it's where readability dies.
- URL encoding: decode for display, re-encode correctly on output. Handle
  double-encoded input (`%2520`) and flag it as a likely bug.

**Print (output side), three modes:**
1. **Expanded** — multi-line, indented, one clause per line, aligned operators,
   nested `$expand` as an indented block. This is the reading/editing view.
2. **Compact** — canonical single-line URL, properly percent-encoded, ready to
   paste into a client or Postman.
3. **Round-trip guarantee.** `parse(print(parse(x))) === parse(x)` for every
   fixture. Property-test this — it is the correctness backbone of the tool.

**Error handling:** never throw at the user. Produce a partial AST plus a list of
diagnostics, each with a character offset, a length, a severity, and a message.
Unparseable regions become `Unknown` nodes that still round-trip verbatim.

## 4. Features, in priority order

**P0 — Format & collapse (the reason the tool exists)**
- Two-pane or single-pane editor: paste raw query → expanded view.
- Editing in the expanded view is the primary editing experience; a
  "Collapse to URL" action produces the compact one-liner with a copy button.
- Collapsible tree nodes: fold a whole `$expand` subtree or a filter subexpression.
- Syntax highlighting by token class. Bracket/paren matching. Inline squiggles
  from the diagnostics list.
- Live, as-you-type reparse. No "Format" button required (but keep one).

**P0 — Break down / explain**
- A structured tree view of the AST alongside the text: resource path, then each
  query option as a node, filter as an expression tree.
- Plain-English rendering per clause, e.g.
  `contains(tolower(Name),'acme') and Status ne 'Closed'` →
  *"Name (lowercased) contains 'acme' **AND** Status is not equal to 'Closed'"*.
- Hovering a tree node highlights the matching text span, and vice versa.
- Summary line: which entity set, how many filter conditions, expand depth,
  paging, sort order.

**P1 — Debug & validate**
- Diagnostics panel: unbalanced parens, unquoted string literals, `=` used
  instead of `eq`, single quotes not doubled, `$select` referencing a property
  not in `$expand`, `$orderby` on a collection property, encoding mistakes,
  missing `$expand` for a navigation property used in `$filter`.
- Optional **metadata-aware validation**: paste `$metadata` XML into a drawer →
  parse the EDMX (entity types, properties + types, nav properties, enums,
  functions) → then validate property names, type compatibility of comparisons
  (`Amount gt 'ten'` is an error), enum member existence, and navigation paths.
  Store pasted metadata in localStorage as named profiles so I paste it once.
- Metadata is strictly optional. Without it everything above still works
  syntactically; validation just narrows to what's checkable.

**P1 — Compare**
- Two-query diff view, structural not textual: diff the ASTs so reordered query
  options and whitespace don't show as changes. Highlight added/removed filter
  conditions, changed `$select` fields, changed expand shape.

**P2 — Build & reuse**
- With metadata loaded: a guided builder — pick entity set, tick `$select`
  fields, add filter conditions from typed dropdowns, choose expands from the
  nav-property tree — that emits into the same editor.
- Autocomplete in the editor from loaded metadata.
- Snippet library in localStorage: save named query patterns, with export/import
  as JSON so a team can share a file.

## 5. Suggested architecture

Propose your own if you disagree, but justify it in the plan.

- **TypeScript**, strict mode. Vite build. Output to `docs/` or a
  `gh-pages` branch via GitHub Actions, with the correct `base` path set for a
  project page.
- **Two packages in one repo:**
  - `core/` — the parser, printer, explainer, validator, differ, EDMX reader.
    Zero DOM dependencies, zero framework. Pure functions. This is the asset;
    it should be publishable as an npm package on its own later.
  - `app/` — the UI. React (or Preact for size). CodeMirror 6 for the editor
    (it gives folding, highlighting via a custom StreamLanguage or Lezer
    grammar, and diagnostics gutters out of the box).
- State in the URL hash (compressed) so views are shareable. localStorage only
  for metadata profiles and snippets.
- Dark/light theme, both actually tested.
- Mobile-tolerable but desktop-first.

## 6. Testing — non-negotiable

- A `fixtures/` directory of real-world OData queries, from trivial to horrible:
  4-level nested `$expand` with inner `$filter` and `$orderby`, `$apply`
  aggregation pipelines, lambda operators with nested ranges, enum and date
  literals, already-encoded and double-encoded URLs, and deliberately malformed
  queries.
- Round-trip property tests over the fixture set.
- Unit tests for the explainer's English output on each filter node type.
- A test asserting that unknown/unsupported syntax survives a format→collapse
  cycle byte-identical.
- Run the full suite before declaring any phase done.

## 7. Build order

Phase them, and stop for my review at the end of each:

1. Repo scaffold, CI, GitHub Pages deploy of a hello-world page. Prove the
   deployment pipeline works before writing real logic.
2. `core/` tokenizer + parser + AST types + fixtures + round-trip tests. No UI.
3. Printer: expanded and compact modes. Round-trip green.
4. Minimal UI: paste → format → collapse → copy. **Ship this.** It already
   solves my main pain point.
5. Tree view + explainer.
6. Diagnostics + EDMX parsing + metadata-aware validation.
7. Diff view.
8. Builder, autocomplete, snippets.

## 8. Deliverables I want from the plan

- File tree with a one-line purpose for each significant file.
- The AST node type definitions, written out — I want to review the data model
  before you write the parser against it.
- Which dependencies you're adding and why each is justified.
- Anything in this brief you think is wrong or over-scoped. Push back.

---

### Prior art you should look at first (don't reinvent, but don't depend on it either)

- `sinnaj-r/odata-pretty-print` and `stevej2608/odata-pretty-printer` — both are
  narrow pretty-printers; read them for formatting ideas.
- `auth0/node-odata-parser`, `petrzjunior/odata-filter-to-ast` — `$filter`-only
  parsers; useful as grammar references.
- `techniq/odata-query`, `bodia-uz/odata-filter-builder` — builder-side libraries.
- Microsoft's OData V4 URL conventions spec is the authority on the grammar.

None of these do format ↔ collapse ↔ explain in a browser, which is the gap.
