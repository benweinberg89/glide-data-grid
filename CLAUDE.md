# CLAUDE.md — Glide Data Grid Fork

## What This Is
Fork of @glideapps/glide-data-grid v6.0.4-alpha25 with custom changes.
Upstream: https://github.com/glideapps/glide-data-grid
Fork: https://github.com/benweinberg89/glide-data-grid

## Repo Structure
- Monorepo — the grid package lives at `packages/core/`
- Source: `packages/core/src/`
- Built output: `packages/core/dist/` (gitignored — built locally, not committed)
- Build config: `config/build-util.sh`, `config/linaria.json`

## Building
Requires bash 4+ (macOS ships bash 3). Build from `packages/core/`:
```bash
cd packages/core
PATH="/opt/homebrew/bin:$(pwd)/../../node_modules/.bin:$PATH" /opt/homebrew/bin/bash build.sh
```
This compiles ESM + CJS to `dist/` and generates `dist/index.css`.

**After any source change, rebuild dist/ locally.** dist/ is gitignored and not committed.
Consuming projects import from `dist/`, not `src/`.

## Key Source Paths (under packages/core/src/)
- `internal/data-grid/render/data-grid-render.ts` — main render orchestrator
- `internal/data-grid/render/data-grid-render.cells.ts` — cell rendering + damage repaints
- `internal/data-grid/render/data-grid-render.lines.ts` — grid line rendering
- `internal/data-grid/render/data-grid-render.header.ts` — header rendering
- `internal/data-grid/render/data-grid.render.rings.ts` — highlight rings + collab cursor labels
- `internal/data-grid/render/data-grid-lib.ts` — shared render utilities
- `internal/data-grid/color-parser.ts` — color blending (blend, withAlpha)
- `internal/data-grid-overlay-editor/` — cell editor overlays
- `internal/data-grid-search/` — search bar
- `data-editor/data-editor.tsx` — main DataEditor React component
- `common/styles.ts` — theme interface + CSS variable generation

## Architecture Notes
- Canvas 2D rendering, not DOM — most visual changes happen in the render pipeline
- CSS-in-JS via linaria/wyw-in-js (styled components in .tsx files)
- Damage repaints: only dirty cells are re-rendered, then grid lines and highlight rings are redrawn on top
- Theme flows through a `FullTheme` object and CSS custom properties (--gdg-*)

## Custom Changes (on top of v6.0.4-alpha25)

### On `main`
1. Transparent/translucent grid backgrounds
2. Opaque editor overlays (bgCellEditor CSS var)
3. Header bottom border rendering
4. Cell clip/fill during damage repaints
5. Grid line restoration during damage repaints
6. Opaque grid line colors
7. Transparent border preservation in blend()
8. Highlight region labels (collab cursor name pills)
9. Drag-and-drop polish (suppress focus ring during column drag)
10. Column label passthrough in DataEditor

### On `feat/format-row-label` (branched from main)
11. formatLabel option for RowMarkerOptions — custom row marker text
12. drawSelectionRing prop — hide internal selection range outline
13. Dashed-outline highlight region style
14. Row marker selected styling — textHeaderSelected for text, solid accentColor fill
15. Column header drag-select — mirrors row marker drag-select behavior
16. Double-click column auto-size fix — DnD layer no longer fires resize-end when no drag occurred; normalSizeColumn now calls onColumnResizeEnd to persist the measured width (requires getCellsForSelection on the DataEditor)

### On `feat/editor-scroll-anchor` (branched from main)
17. Anchor editor overlay to cell on scroll (experimental.editorAnchorToCell prop)

## Developer Context
- Python developer, not a software engineer — learning TypeScript and React with AI assistance
- Comfortable reading code but not fluent in TS generics, advanced type patterns, or React internals
- Canvas 2D API is new territory — explain coordinate math, clip regions, and draw order when relevant
- When modifying render code, explain what the change does visually (e.g. "this draws the border 1px lower")
- Map TS/React concepts to Python equivalents where helpful

## Rules
- Edit TypeScript source in `src/`, never edit `dist/` directly
- Rebuild dist/ locally after source changes (do not commit dist/)
- Keep changes focused — one logical change per commit
