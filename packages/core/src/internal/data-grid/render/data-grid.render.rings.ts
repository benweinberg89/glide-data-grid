/* eslint-disable sonarjs/no-duplicate-string */
/* eslint-disable unicorn/no-for-loop */
import { type GridSelection, type InnerGridCell, type Item, type FillHandle, DEFAULT_FILL_HANDLE } from "../data-grid-types.js";
import { getStickyWidth, type MappedGridColumn, computeBounds, getFreezeTrailingHeight } from "./data-grid-lib.js";
import { type FullTheme } from "../../../common/styles.js";
import { blend, withAlpha } from "../color-parser.js";
import { hugRectToTarget, intersectRect, rectContains, splitRectIntoRegions } from "../../../common/math.js";
import { getSpanBounds, walkColumns, walkRowsInCol } from "./data-grid-render.walk.js";
import { type Highlight } from "./data-grid-render.cells.js";

export function drawHighlightRings(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    cellXOffset: number,
    cellYOffset: number,
    translateX: number,
    translateY: number,
    mappedColumns: readonly MappedGridColumn[],
    freezeColumns: number,
    headerHeight: number,
    groupHeaderHeight: number,
    rowHeight: number | ((index: number) => number),
    freezeTrailingRows: number,
    rows: number,
    allHighlightRegions: readonly Highlight[] | undefined,
    theme: FullTheme
): (() => void) | undefined {
    const highlightRegions = allHighlightRegions?.filter(x => x.style !== "no-outline");

    if (highlightRegions === undefined || highlightRegions.length === 0) return undefined;

    const freezeLeft = getStickyWidth(mappedColumns);
    const freezeBottom = getFreezeTrailingHeight(rows, freezeTrailingRows, rowHeight);
    const splitIndicies = [freezeColumns, 0, mappedColumns.length, rows - freezeTrailingRows] as const;
    const splitLocations = [freezeLeft, 0, width, height - freezeBottom] as const;

    const drawRects = highlightRegions.map(h => {
        const r = h.range;
        const style = h.style ?? "dashed";

        return splitRectIntoRegions(r, splitIndicies, width, height, splitLocations).map(arg => {
            const rect = arg.rect;
            const topLeftBounds = computeBounds(
                rect.x,
                rect.y,
                width,
                height,
                groupHeaderHeight,
                headerHeight + groupHeaderHeight,
                cellXOffset,
                cellYOffset,
                translateX,
                translateY,
                rows,
                freezeColumns,
                freezeTrailingRows,
                mappedColumns,
                rowHeight
            );
            const bottomRightBounds =
                rect.width === 1 && rect.height === 1
                    ? topLeftBounds
                    : computeBounds(
                          rect.x + rect.width - 1,
                          rect.y + rect.height - 1,
                          width,
                          height,
                          groupHeaderHeight,
                          headerHeight + groupHeaderHeight,
                          cellXOffset,
                          cellYOffset,
                          translateX,
                          translateY,
                          rows,
                          freezeColumns,
                          freezeTrailingRows,
                          mappedColumns,
                          rowHeight
                      );

            if (rect.x + rect.width >= mappedColumns.length) {
                bottomRightBounds.width -= 1;
            }
            if (rect.y + rect.height >= rows) {
                bottomRightBounds.height -= 1;
            }
            return {
                color: h.color,
                label: h.label,
                labelOptions: h.labelOptions,
                style,
                clip: arg.clip,
                rect: hugRectToTarget(
                    {
                        x: topLeftBounds.x,
                        y: topLeftBounds.y,
                        width: bottomRightBounds.x + bottomRightBounds.width - topLeftBounds.x,
                        height: bottomRightBounds.y + bottomRightBounds.height - topLeftBounds.y,
                    },
                    width,
                    height,
                    8
                ),
            };
        });
    });

    const drawCb = () => {
        ctx.lineWidth = 1;

        let dashed = false;

        for (const dr of drawRects) {
            for (const s of dr) {
                if (
                    s?.rect !== undefined &&
                    intersectRect(0, 0, width, height, s.rect.x, s.rect.y, s.rect.width, s.rect.height)
                ) {
                    const wasDashed: boolean = dashed;
                    const needsClip = !rectContains(s.clip, s.rect);
                    ctx.beginPath();
                    if (needsClip) {
                        ctx.save();
                        ctx.rect(s.clip.x, s.clip.y, s.clip.width, s.clip.height);
                        ctx.clip();
                    }
                    if ((s.style === "dashed" || s.style === "dashed-outline") && !dashed) {
                        ctx.setLineDash([5, 3]);
                        dashed = true;
                    } else if ((s.style === "solid" || s.style === "solid-outline") && dashed) {
                        ctx.setLineDash([]);
                        dashed = false;
                    }
                    ctx.strokeStyle =
                        s.style === "solid-outline"
                            ? blend(blend(s.color, theme.borderColor), theme.bgCell)
                            : withAlpha(s.color, 1);
                    ctx.closePath();
                    ctx.strokeRect(s.rect.x + 0.5, s.rect.y + 0.5, s.rect.width - 1, s.rect.height - 1);
                    if (needsClip) {
                        ctx.restore();
                        dashed = wasDashed;
                    }
                }
            }
        }

        if (dashed) {
            ctx.setLineDash([]);
        }

        // Draw labels (e.g. collaborator cursor names) on highlight regions
        // Group labels by cell position so multiple labels tile horizontally
        type LabelEntry = { text: string; color: string; labelOptions: Highlight["labelOptions"] };
        const labelsByCell = new Map<string, { labels: LabelEntry[]; x: number; y: number; w: number }>();
        for (const dr of drawRects) {
            for (const s of dr) {
                if (s?.rect === undefined || s.label === undefined || s.label === "") continue;
                const key = `${s.rect.x},${s.rect.y},${s.rect.width}`;
                let entry = labelsByCell.get(key);
                if (entry === undefined) {
                    entry = { labels: [], x: s.rect.x, y: s.rect.y, w: s.rect.width };
                    labelsByCell.set(key, entry);
                }
                entry.labels.push({ text: s.label, color: s.color, labelOptions: s.labelOptions });
            }
        }

        if (labelsByCell.size > 0) {
            const REFERENCE_CELL_WIDTH = 100;
            ctx.textBaseline = "middle";

            for (const entry of labelsByCell.values()) {
                // Resolve effective font size for a label, applying cell-width scaling if enabled
                const resolveFontSize = (opts: Highlight["labelOptions"]): number => {
                    const base = opts?.fontSize ?? 10;
                    if (!opts?.scaleWithCellWidth) return base;
                    const scale = entry.w / REFERENCE_CELL_WIDTH;
                    const scaled = base * scale;
                    const min = opts.minFontSize ?? 6;
                    const max = opts.maxFontSize ?? 16;
                    return Math.max(min, Math.min(max, Math.round(scaled)));
                };

                // First pass: find max pill height for clip rect
                let maxPillH = 0;
                for (const lbl of entry.labels) {
                    const fs = resolveFontSize(lbl.labelOptions);
                    const ph = fs * 1.6;
                    if (ph > maxPillH) maxPillH = ph;
                }

                let drawX = entry.x + entry.w; // start at top-right of cell
                const drawY = entry.y;

                ctx.save();
                ctx.beginPath();
                ctx.rect(entry.x, drawY, entry.w, maxPillH + 2);
                ctx.clip();

                for (let i = entry.labels.length - 1; i >= 0; i--) {
                    const lbl = entry.labels[i];
                    const opts = lbl.labelOptions;
                    const fontSize = resolveFontSize(opts);
                    const pillHeight = fontSize * 1.6;
                    const pillPadX = fontSize * 0.4;
                    const pillGap = fontSize * 0.2;
                    const cornerRadius = fontSize * 0.3;
                    const maxLabelLen = opts?.maxLabelLength ?? 8;

                    ctx.font = `bold ${fontSize}px sans-serif`;
                    const truncated = lbl.text.length > maxLabelLen ? lbl.text.slice(0, maxLabelLen) : lbl.text;
                    const textW = ctx.measureText(truncated).width;
                    const pillW = textW + pillPadX * 2;

                    drawX -= pillW + pillGap;

                    // Background pill
                    ctx.fillStyle = withAlpha(lbl.color, 1);
                    ctx.beginPath();
                    ctx.roundRect(drawX, drawY, pillW, pillHeight, cornerRadius);
                    ctx.fill();

                    // White text
                    ctx.fillStyle = "#FFFFFF";
                    ctx.fillText(truncated, drawX + pillPadX, drawY + pillHeight / 2);
                }

                ctx.restore();
            }
        }
    };

    drawCb();
    return drawCb;
}

/**
 * Draws a single contour border around the union of all selected cells (range + rangeStack).
 * Instead of drawing per-rect outlines that cause alpha stacking on overlaps, this flattens
 * all ranges into a cell set and strokes only the "exposed" edges — edges where the adjacent
 * cell is NOT selected. The result is one clean outline around the entire selection shape.
 *
 * Drawing is split into clip regions (scrollable area, frozen columns, frozen trailing rows)
 * to prevent contour lines from bleeding across freeze boundaries.
 *
 * Returns a callback to redraw the contour (used during damage repaints).
 */
export function drawMergedSelectionRing(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    cellXOffset: number,
    cellYOffset: number,
    translateX: number,
    translateY: number,
    mappedColumns: readonly MappedGridColumn[],
    freezeColumns: number,
    headerHeight: number,
    groupHeaderHeight: number,
    rowHeight: number | ((index: number) => number),
    freezeTrailingRows: number,
    rows: number,
    selection: GridSelection,
    theme: FullTheme
): (() => void) | undefined {
    if (selection.current === undefined) return undefined;

    const { range, rangeStack } = selection.current;
    // Single-cell selections use the regular focus ring; contour is only for multi-cell
    if (range.width * range.height <= 1 && rangeStack.length === 0) return undefined;

    const allRanges = rangeStack.length > 0 ? [range, ...rangeStack] : [range];

    // Flatten all ranges into a Set of "col,row" keys for O(1) edge-exposure checks
    const selectedCells = new Set<string>();
    for (const r of allRanges) {
        for (let col = r.x; col < r.x + r.width; col++) {
            for (let row = r.y; row < r.y + r.height; row++) {
                selectedCells.add(`${col},${row}`);
            }
        }
    }

    if (selectedCells.size === 0) return undefined;

    const totalHeaderHeight = headerHeight + groupHeaderHeight;
    const freezeLeft = getStickyWidth(mappedColumns);
    const freezeBottom = getFreezeTrailingHeight(rows, freezeTrailingRows, rowHeight);

    // Separate clip regions prevent contour lines from drawing across freeze boundaries.
    // Each region is drawn independently with its own canvas clip.
    const clipRegions: { x: number; y: number; w: number; h: number }[] = [
        // Scrollable data area
        {
            x: freezeLeft,
            y: totalHeaderHeight,
            w: width - freezeLeft,
            h: height - totalHeaderHeight - freezeBottom,
        },
    ];
    if (freezeColumns > 0) {
        // Frozen left columns
        clipRegions.push({
            x: 0,
            y: totalHeaderHeight,
            w: freezeLeft,
            h: height - totalHeaderHeight - freezeBottom,
        });
    }
    if (freezeTrailingRows > 0) {
        // Frozen bottom rows (full width)
        clipRegions.push({ x: 0, y: height - freezeBottom, w: width, h: freezeBottom });
    }

    const drawContourEdges = () => {
        for (const clip of clipRegions) {
            if (clip.w <= 0 || clip.h <= 0) continue;

            ctx.save();
            ctx.beginPath();
            ctx.rect(clip.x, clip.y, clip.w, clip.h);
            ctx.clip();

            ctx.lineWidth = 1;
            ctx.strokeStyle = withAlpha(theme.accentColor, 1);
            ctx.beginPath();

            for (const key of selectedCells) {
                const commaIdx = key.indexOf(",");
                const col = Number(key.slice(0, commaIdx));
                const row = Number(key.slice(commaIdx + 1));

                if (col >= mappedColumns.length || row >= rows || row < 0 || col < 0) continue;

                const bounds = computeBounds(
                    col,
                    row,
                    width,
                    height,
                    groupHeaderHeight,
                    totalHeaderHeight,
                    cellXOffset,
                    cellYOffset,
                    translateX,
                    translateY,
                    rows,
                    freezeColumns,
                    freezeTrailingRows,
                    mappedColumns,
                    rowHeight
                );

                // Skip if completely outside the clip region
                if (
                    bounds.x + bounds.width < clip.x ||
                    bounds.x > clip.x + clip.w ||
                    bounds.y + bounds.height < clip.y ||
                    bounds.y > clip.y + clip.h
                )
                    continue;

                // 0.5px offset for crisp 1px lines on pixel boundaries
                const x = bounds.x + 0.5;
                const y = bounds.y + 0.5;
                const w = bounds.width - 1;
                const h = bounds.height - 1;

                // An edge is "exposed" if the adjacent cell in that direction is not selected.
                // Only exposed edges are drawn, forming the outer contour of the union.

                // Top edge exposed
                if (!selectedCells.has(`${col},${row - 1}`)) {
                    ctx.moveTo(x, y);
                    ctx.lineTo(x + w, y);
                }
                // Bottom edge exposed
                if (!selectedCells.has(`${col},${row + 1}`)) {
                    ctx.moveTo(x, y + h);
                    ctx.lineTo(x + w, y + h);
                }
                // Left edge exposed
                if (!selectedCells.has(`${col - 1},${row}`)) {
                    ctx.moveTo(x, y);
                    ctx.lineTo(x, y + h);
                }
                // Right edge exposed
                if (!selectedCells.has(`${col + 1},${row}`)) {
                    ctx.moveTo(x + w, y);
                    ctx.lineTo(x + w, y + h);
                }
            }

            ctx.stroke();
            ctx.restore();
        }
    };

    drawContourEdges();
    return drawContourEdges;
}

export function drawColumnResizeOutline(
    ctx: CanvasRenderingContext2D,
    yOffset: number,
    xOffset: number,
    height: number,
    style: string
) {
    ctx.beginPath();
    ctx.moveTo(yOffset, xOffset);
    ctx.lineTo(yOffset, height);

    ctx.lineWidth = 2;
    ctx.strokeStyle = style;

    ctx.stroke();

    ctx.globalAlpha = 1;
}

export function drawFillHandle(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    cellYOffset: number,
    translateX: number,
    translateY: number,
    effectiveCols: readonly MappedGridColumn[],
    allColumns: readonly MappedGridColumn[],
    theme: FullTheme,
    totalHeaderHeight: number,
    selectedCell: GridSelection,
    getRowHeight: (row: number) => number,
    getCellContent: (cell: Item) => InnerGridCell,
    freezeTrailingRows: number,
    hasAppendRow: boolean,
    fillHandle: FillHandle,
    rows: number
): (() => void) | undefined {
    if (selectedCell.current === undefined) return undefined;

    const drawFill = fillHandle !== false && fillHandle !== undefined;
    if (!drawFill) return undefined;

    const fill = typeof fillHandle === "object" ? { ...DEFAULT_FILL_HANDLE, ...fillHandle } : DEFAULT_FILL_HANDLE;

    const range = selectedCell.current.range;
    const currentItem = selectedCell.current.cell;
    const fillHandleTarget = [range.x + range.width - 1, range.y + range.height - 1];

    // if the currentItem row greater than rows and the fill handle row is greater than rows, we dont need to draw
    if (currentItem[1] >= rows && fillHandleTarget[1] >= rows) return undefined;

    const mustDraw = effectiveCols.some(c => c.sourceIndex === currentItem[0] || c.sourceIndex === fillHandleTarget[0]);
    if (!mustDraw) return undefined;
    const [targetCol, targetRow] = selectedCell.current.cell;
    const cell = getCellContent(selectedCell.current.cell);
    const targetColSpan = cell.span ?? [targetCol, targetCol];

    const isStickyRow = targetRow >= rows - freezeTrailingRows;
    const stickRowHeight =
        freezeTrailingRows > 0 && !isStickyRow
            ? getFreezeTrailingHeight(rows, freezeTrailingRows, getRowHeight) - 1
            : 0;

    const fillHandleRow = fillHandleTarget[1];

    let drawHandleCb: (() => void) | undefined = undefined;

    walkColumns(
        effectiveCols,
        cellYOffset,
        translateX,
        translateY,
        totalHeaderHeight,
        (col, drawX, colDrawY, clipX, startRow) => {
            clipX;
            if (col.sticky && targetCol > col.sourceIndex) return;

            const isBeforeTarget = col.sourceIndex < targetColSpan[0];
            const isAfterTarget = col.sourceIndex > targetColSpan[1];

            const isFillHandleCol = col.sourceIndex === fillHandleTarget[0];

            if (!isFillHandleCol && (isBeforeTarget || isAfterTarget)) {
                // we dont need to do any drawing on this column but may yet need to draw
                return;
            }

            walkRowsInCol(
                startRow,
                colDrawY,
                height,
                rows,
                getRowHeight,
                freezeTrailingRows,
                hasAppendRow,
                undefined,
                (drawY, row, rh) => {
                    if (row !== targetRow && row !== fillHandleRow) return;

                    let cellX = drawX;
                    let cellWidth = col.width;

                    if (cell.span !== undefined) {
                        const areas = getSpanBounds(cell.span, drawX, drawY, col.width, rh, col, allColumns);
                        const area = col.sticky ? areas[0] : areas[1];

                        if (area !== undefined) {
                            cellX = area.x;
                            cellWidth = area.width;
                        }
                    }

                    const doHandle = row === fillHandleRow && isFillHandleCol && drawFill;

                    if (doHandle) {
                        drawHandleCb = () => {
                            if (clipX > cellX && !col.sticky) {
                                ctx.beginPath();
                                ctx.rect(clipX, 0, width - clipX, height);
                                ctx.clip();
                            }
                            // Draw a larger, outlined fill handle similar to Excel / Google Sheets.
                            const size = fill.size;
                            const half = size / 2;
                            
                            // Place the handle so its center sits on the bottom-right corner of the cell,
                            // plus any configured offsets (fill.offsetX, fill.offsetY).
                            // Offset by half pixel to align with grid lines.
                            const hx = cellX + cellWidth + fill.offsetX - half + 0.5;
                            const hy = drawY + rh + fill.offsetY - half + 0.5;

                            ctx.beginPath();
                            if (fill.shape === "circle") {
                                ctx.arc(hx + half, hy + half, half, 0, Math.PI * 2);
                            } else {
                                ctx.rect(hx, hy, size, size);
                            }

                            // Fill
                            ctx.fillStyle = col.themeOverride?.accentColor ?? theme.accentColor;
                            ctx.fill();

                            // Outline (drawn so it doesn't eat into the filled area)
                            if (fill.outline > 0) {
                                ctx.lineWidth = fill.outline;
                                ctx.strokeStyle = theme.bgCell;
                                if (fill.shape === "circle") {
                                    ctx.beginPath();
                                    ctx.arc(
                                        hx + half,
                                        hy + half,
                                        half + fill.outline / 2,
                                        0,
                                        Math.PI * 2
                                    );
                                    ctx.stroke();
                                } else {
                                    ctx.strokeRect(
                                        hx - fill.outline / 2,
                                        hy - fill.outline / 2,
                                        size + fill.outline,
                                        size + fill.outline
                                    );
                                }
                            }
                        };
                    }
                    return drawHandleCb !== undefined;
                }
            );

            return drawHandleCb !== undefined;
        }
    );

    if (drawHandleCb === undefined) return undefined;

    const result = () => {
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, totalHeaderHeight, width, height - totalHeaderHeight - stickRowHeight);
        ctx.clip();

        drawHandleCb?.();

        ctx.restore();
    };

    result();

    return result;
}
