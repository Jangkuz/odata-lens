# OData Lens

**Paste, format, explain, and debug OData V4 queries.**

An offline-capable web tool for making OData query URLs readable. Format a query into an indented, collapsible view; edit it there; collapse it back into a single-line URL; get plain-English explanation; or structurally diff two queries.

Built for ASP.NET Core OData backends, but degrades gracefully on unknown constructs.

## Quick Start

```bash
npm install
npm run dev
# Open http://localhost:5173
```

## Build for GitHub Pages

The app is deployed at `https://<you>.github.io/odata-lens/` (GitHub Pages project page).

```bash
npm run build
# packages/app/dist/ ready to deploy
```

## Project Structure

- **`packages/core/`** — Parser, printer, explainer, validator, differ. Zero dependencies, zero DOM. Pure TypeScript.
- **`packages/app/`** — React UI + CodeMirror 6 editor. Depends on `core` via npm workspace.

## Development

### Typecheck
```bash
npm run typecheck
```

### Test
```bash
npm test
npm run test:watch
```

### Format
```bash
npx prettier --write .
```

## Implementation Phases

1. ✅ **Scaffold + CI + Pages** — Workspace, TypeScript, GitHub Actions, hello-world page live.
2. **Core parser** — Tokenizer, parser, AST, fixtures, diagnostics (in progress).
3. **Printers + round-trip tests** — Expanded and compact output, property tests.
4. **Minimal UI** — Ship it: paste → format → collapse → copy.
5. **Tree view + explainer** — AST tree, plain-English breakdown.
6. **Deep `$apply`** — Full aggregation pipeline parsing and explanation.
7. **Diagnostics + EDMX** — Metadata-aware validation, named profiles.
8. **Structural diff** — Two-query comparison.
9. **Builder + autocomplete + snippets** — Metadata-driven query builder.

## Architecture

**Tokenizer → Parser → AST → Printer** pipeline.

- **Whitespace-tolerant parsing** — Expanded view allows newlines; parser accepts them.
- **Source maps through percent-decoding** — Every AST span stays in raw coordinates.
- **Error recovery** — Unknown/unsupported syntax becomes `UnknownExpr`/`Unknown*` nodes and survives round-trip byte-identical.
- **No external grammar** — Custom Pratt parser, no Lezer. CodeMirror highlighting and folding driven by our AST.

## Dependencies

### `core/` runtime
Zero. Not one.

### `app/` runtime
- `react`, `react-dom` — UI
- `@codemirror/*` — Editor, highlighting, diagnostics, folding
- `odata-lens-core` — Via npm workspace

## Testing

Every fixture round-trips: `stripSpans(parse(print(parse(x)))) ≡ stripSpans(parse(x))` in both print modes.

Unknown regions survive format → collapse byte-identical.

## Deployment

Push to `main` or `master`. GitHub Actions:
1. Typecheck + test
2. Build `packages/app/dist`
3. Deploy to GitHub Pages at `/odata-lens/`

---

**Built by Đỗ Long Ánh** for debugging OData queries over slow networks and restricted backends.
