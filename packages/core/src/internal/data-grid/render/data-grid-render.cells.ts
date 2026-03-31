/* eslint-disable sonarjs/no-duplicate-string */
/* eslint-disable unicorn/no-for-loop */
import {
    type GridSelection,
    type InnerGridCell,
    type Rectangle,
    CompactSelection,
    GridColumnIcon,
    type Item,
    type CellList,
    GridCellKind,
    type DrawCellCallback,
    isInnerOnlyCell,
    type GridCell,
} from "../data-grid-types.js";
import { CellSet } from "../cell-set.js";
import type { HoverValues } from "../animation-manager.js";
import {
    type MappedGridColumn,
    cellIsSelected,
    cellIsInRange,
    getFreezeTrailingHeight,
    drawLastUpdateUnderlay,
} from "./data-grid-lib.js";
import type { SpriteManager } from "../data-grid-sprites.js";
import { mergeAndRealizeTheme, type FullTheme, type Theme } from "../../../common/styles.js";
import { blend } from "../color-parser.js";
import type { DrawArgs, DrawStateTuple, GetCellRendererCallback, PrepResult } from "../../../cells/cell-types.js";
import type { HoverInfo } from "./draw-grid-arg.js";
import type { EnqueueCallback } from "../use-animation-queue.js";
import type { RenderStateProvider } from "../../../common/render-state-provider.js";
import type { ImageWindowLoader } from "../image-window-loader-interface.js";
import { intersectRect } from "../../../common/math.js";
import type { GridMouseGroupHeaderEventArgs } from "../event-args.js";
import { getRowSpanBounds, getSkipPoint, getSpanBounds, walkColumns, walkRowsInCol } from "./data-grid-render.walk.js";

const loadingCell: InnerGridCell = {
    kind: GridCellKind.Loading,
    allowOverlay: false,
};

export interface GroupDetails {
    readonly name: string;
    readonly icon?: string;
    readonly overrideTheme?: Partial<Theme>;
    readonly actions?: readonly {
        readonly title: string;
        readonly onClick: (e: GridMouseGroupHeaderEventArgs) => void;
        readonly icon: GridColumnIcon | string;
    }[];
}

export type GroupDetailsCallback = (groupName: string) => GroupDetails;
export type GetRowThemeCallback = (row: number) => Partial<Theme> | undefined;

export interface HighlightLabelOptions {
    /** Font size in px. Drives pill height, padding, gap, radius. Default: 10 */
    readonly fontSize?: number;
    /** Scale font size proportionally to cell width. Default: false */
    readonly scaleWithCellWidth?: boolean;
    /** Min font size when scaling is active. Default: 6 */
    readonly minFontSize?: number;
    /** Max font size when scaling is active. Default: 16 */
    readonly maxFontSize?: number;
    /** Max characters before truncation. Default: 8 */
    readonly maxLabelLength?: number;
}

export interface Highlight {
    readonly color: string;
    readonly range: Rectangle;
    readonly style?: "dashed" | "solid" | "no-outline" | "solid-outline" | "dashed-outline";
    readonly label?: string;
    readonly labelOptions?: HighlightLabelOptions;
}

// preppable items:
// - font
// - fillStyle

// Column draw loop prep cycle
// - Prep item
// - Prep sets props
// - Prep returns list of cared about props
// - Draw item
// - Loop may set some items, if present in args list, set undefined
// - Prep next item, giving previous result
// - If next item type is different, de-prep
// - Result per column
export function drawCells(
    ctx: CanvasRenderingContext2D,
    effectiveColumns: readonly MappedGridColumn[],
    allColumns: readonly MappedGridColumn[],
    height: number,
    totalHeaderHeight: number,
    translateX: number,
    translateY: number,
    cellYOffset: number,
    rows: number,
    getRowHeight: (row: number) => number,
    getCellContent: (cell: Item) => InnerGridCell,
    getGroupDetails: GroupDetailsCallback,
    getRowThemeOverride: GetRowThemeCallback | undefined,
    disabledRows: CompactSelection,
    isFocused: boolean,
    drawFocus: boolean,
    freezeTrailingRows: number,
    hasAppendRow: boolean,
    drawRegions: readonly Rectangle[],
    damage: CellSet | undefined,
    selection: GridSelection,
    prelightCells: CellList | undefined,
    highlightRegions: readonly Highlight[] | undefined,
    imageLoader: ImageWindowLoader,
    spriteManager: SpriteManager,
    hoverValues: HoverValues,
    hoverInfo: HoverInfo | undefined,
    drawCellCallback: DrawCellCallback | undefined,
    hyperWrapping: boolean,
    outerTheme: FullTheme,
    enqueue: EnqueueCallback,
    renderStateProvider: RenderStateProvider,
    getCellRenderer: GetCellRendererCallback,
    overrideCursor: (cursor: React.CSSProperties["cursor"]) => void,
    minimumCellWidth: number,
    mergedSelectionRing?: boolean,
    damageRects?: Rectangle[]
): Rectangle[] | undefined {
    let toDraw = damage?.size ?? Number.MAX_SAFE_INTEGER;
    const frameTime = performance.now();
    let font = outerTheme.baseFontFull;
    ctx.font = font;
    const deprepArg = { ctx };
    const cellIndex: [number, number] = [0, 0];
    const freezeTrailingRowsHeight =
        freezeTrailingRows > 0 ? getFreezeTrailingHeight(rows, freezeTrailingRows, getRowHeight) : 0;
    let result: Rectangle[] | undefined;
    let handledSpans: Set<string> | undefined = undefined;
    let handledRowSpans: Set<string> | undefined = undefined;

    const skipPoint = getSkipPoint(drawRegions);

    walkColumns(
        effectiveColumns,
        cellYOffset,
        translateX,
        translateY,
        totalHeaderHeight,
        (c, drawX, colDrawStartY, clipX, startRow) => {
            const diff = Math.max(0, clipX - drawX);

            const colDrawX = drawX + diff;
            const colDrawY = totalHeaderHeight + 1;
            const colWidth = c.width - diff;
            const colHeight = height - totalHeaderHeight - 1;
            if (drawRegions.length > 0) {
                let found = false;
                for (let i = 0; i < drawRegions.length; i++) {
                    const dr = drawRegions[i];
                    if (intersectRect(colDrawX, colDrawY, colWidth, colHeight, dr.x, dr.y, dr.width, dr.height)) {
                        found = true;
                        break;
                    }
                }
                if (!found) return;
            }

            const reclip = () => {
                ctx.save();
                ctx.beginPath();
                ctx.rect(colDrawX, colDrawY, colWidth, colHeight);
                ctx.clip();
            };

            const colSelected = selection.columns.hasIndex(c.sourceIndex);

            const groupTheme = getGroupDetails(c.group ?? "").overrideTheme;
            const colTheme =
                c.themeOverride === undefined && groupTheme === undefined
                    ? outerTheme
                    : mergeAndRealizeTheme(outerTheme, groupTheme, c.themeOverride);
            const colFont = colTheme.baseFontFull;
            if (colFont !== font) {
                font = colFont;
                ctx.font = colFont;
            }
            reclip();
            let prepResult: PrepResult | undefined = undefined;

            walkRowsInCol(
                startRow,
                colDrawStartY,
                height,
                rows,
                getRowHeight,
                freezeTrailingRows,
                hasAppendRow,
                skipPoint,
                (drawY, row, rh, isSticky, isTrailingRow) => {
                    if (row < 0) return;

                    cellIndex[0] = c.sourceIndex;
                    cellIndex[1] = row;
                    // if (damage !== undefined && !damage.some(d => d[0] === c.sourceIndex && d[1] === row)) {
                    //     return;
                    // }
                    // if (
                    //     drawRegions.length > 0 &&
                    //     !drawRegions.some(dr => intersectRect(drawX, drawY, c.width, rh, dr.x, dr.y, dr.width, dr.height))
                    // ) {
                    //     return;
                    // }

                    // These are dumb versions of the above. I cannot for the life of believe that this matters but this is
                    // the tightest part of the draw loop and the allocations above actually has a very measurable impact
                    // on performance. For the love of all that is unholy please keep checking this again in the future.
                    // As soon as this doesn't have any impact of note go back to the saner looking code. The smoke test
                    // here is to scroll to the bottom of a test case first, then scroll back up while profiling and see
                    // how many major GC collections you get. These allocate a lot of objects.
                    if (damage !== undefined && !damage.has(cellIndex)) {
                        return;
                    }
                    if (drawRegions.length > 0) {
                        let found = false;
                        for (let i = 0; i < drawRegions.length; i++) {
                            const dr = drawRegions[i];
                            if (intersectRect(drawX, drawY, c.width, rh, dr.x, dr.y, dr.width, dr.height)) {
                                found = true;
                                break;
                            }
                        }
                        if (!found) return;
                    }

                    const rowSelected = selection.rows.hasIndex(row);
                    const rowDisabled = disabledRows.hasIndex(row);

                    const cell: InnerGridCell = row < rows ? getCellContent(cellIndex) : loadingCell;

                    let cellX = drawX;
                    let cellY = drawY;
                    let cellHeight = rh;
                    let cellWidth = c.width;
                    let drawingSpan = false;
                    let drawingRowSpan = false;
                    let skipContents = false;

                    // When a cell has both span and rowSpan, check span dedup BEFORE
                    // the rowSpan block modifies canvas state. Without this, the rowSpan
                    // block pops the column clip, then the span block's early return
                    // skips cleanup — corrupting the clip state for subsequent cells.
                    if (cell.span !== undefined && cell.rowSpan !== undefined) {
                        const spanKey = `${row},${cell.span[0]},${cell.span[1]},${c.sticky}`;
                        if (handledSpans !== undefined && handledSpans.has(spanKey)) {
                            toDraw--;
                            return;
                        }
                    }

                    if (cell.rowSpan !== undefined) {
                        const [startRow, endRow] = cell.rowSpan;
                        const rowSpanKey = `${c.sourceIndex},${startRow},${endRow}`;
                        if (handledRowSpans === undefined) handledRowSpans = new Set();
                        if (!handledRowSpans.has(rowSpanKey)) {
                            handledRowSpans.add(rowSpanKey);
                            const bounds = getRowSpanBounds(cell.rowSpan, row, drawY, rh, getRowHeight);
                            cellY = bounds.cellY;
                            cellHeight = bounds.cellHeight;

                            ctx.restore();
                            prepResult = undefined;
                            ctx.save();
                            ctx.beginPath();
                            ctx.rect(cellX, cellY, cellWidth, cellHeight);
                            // Only push to result (for grid line clipping) if there's no
                            // column span — when both span+rowSpan exist, the span block
                            // will push the correct combined rectangle.
                            if (cell.span === undefined) {
                                if (result === undefined) {
                                    result = [];
                                }
                                result.push({
                                    x: cellX,
                                    y: cellY,
                                    width: cellWidth,
                                    height: cellHeight,
                                });
                            }
                            ctx.clip();
                            drawingRowSpan = true;
                        } else {
                            toDraw--;
                            return;
                        }
                    }

                    if (cell.span !== undefined) {
                        const [startCol, endCol] = cell.span;
                        const spanKey = `${row},${startCol},${endCol},${c.sticky}`; //alloc
                        if (handledSpans === undefined) handledSpans = new Set();
                        if (!handledSpans.has(spanKey)) {
                            const areas = getSpanBounds(cell.span, drawX, drawY, c.width, rh, c, allColumns);
                            const area = c.sticky ? areas[0] : areas[1];
                            if (!c.sticky && areas[0] !== undefined) {
                                skipContents = true;
                            }
                            if (area !== undefined) {
                                cellX = area.x;
                                cellWidth = area.width;
                                handledSpans.add(spanKey);
                                // When both span+rowSpan exist, register dedup keys for all
                                // other rows/cols in the combined area. Without this, the
                                // evenodd clip receives duplicate rects that cancel out.
                                if (cell.rowSpan !== undefined) {
                                    const [rs, re] = cell.rowSpan;
                                    for (let r = rs; r <= re; r++) {
                                        handledSpans.add(`${r},${startCol},${endCol},${c.sticky}`);
                                    }
                                    for (let col = startCol; col <= endCol; col++) {
                                        if (handledRowSpans === undefined) handledRowSpans = new Set();
                                        handledRowSpans.add(`${col},${rs},${re}`);
                                    }
                                }
                                ctx.restore();
                                prepResult = undefined;
                                ctx.save();
                                ctx.beginPath();
                                const d = Math.max(0, clipX - area.x);
                                ctx.rect(area.x + d, cellY, area.width - d, cellHeight);
                                if (result === undefined) {
                                    result = [];
                                }
                                result.push({
                                    x: area.x + d,
                                    y: cellY,
                                    width: area.width - d,
                                    height: cellHeight,
                                });
                                ctx.clip();
                                drawingSpan = true;
                            }
                        } else {
                            toDraw--;
                            return;
                        }
                    }

                    const rowTheme = getRowThemeOverride?.(row);
                    const trailingTheme =
                        isTrailingRow && c.trailingRowOptions?.themeOverride !== undefined
                            ? c.trailingRowOptions?.themeOverride
                            : undefined;
                    const theme =
                        cell.themeOverride === undefined && rowTheme === undefined && trailingTheme === undefined
                            ? colTheme
                            : mergeAndRealizeTheme(colTheme, rowTheme, trailingTheme, cell.themeOverride); //alloc

                    ctx.beginPath();

                    const isSelected = cellIsSelected(cellIndex, cell, selection);
                    let accentCount = cellIsInRange(cellIndex, cell, selection, drawFocus);
                    const spanIsHighlighted =
                        cell.span !== undefined &&
                        selection.columns.some(
                            index => cell.span !== undefined && index >= cell.span[0] && index <= cell.span[1] //alloc
                        );
                    if (isSelected && !isFocused && drawFocus) {
                        accentCount = 0;
                    } else if (isSelected && drawFocus) {
                        accentCount = Math.max(accentCount, 1);
                    }
                    const rowSpanIsHighlighted =
                        cell.rowSpan !== undefined &&
                        selection.rows.some(
                            index => cell.rowSpan !== undefined && index >= cell.rowSpan[0] && index <= cell.rowSpan[1] //alloc
                        );
                    if (spanIsHighlighted || rowSpanIsHighlighted) {
                        accentCount++;
                    }
                    if (!isSelected) {
                        if (rowSelected) accentCount++;
                        if (colSelected && !isTrailingRow) accentCount++;
                    }
                    // When mergedSelectionRing is enabled, prevent range-on-range and
                    // col-on-range stacking (which causes darker overlaps), but allow
                    // row+range to stack so row-selected cells are visually distinct.
                    if (mergedSelectionRing === true && accentCount > 1) {
                        const inRange = cellIsInRange(cellIndex, cell, selection, drawFocus) > 0 || isSelected;
                        accentCount = rowSelected && inRange ? 2 : 1;
                    }

                    const bgCell = cell.kind === GridCellKind.Protected ? theme.bgCellMedium : theme.bgCell;
                    let fill: string | undefined;
                    if (isSticky || bgCell !== outerTheme.bgCell) {
                        fill = blend(bgCell, fill);
                    }

                    if (accentCount > 0 || rowDisabled) {
                        if (rowDisabled) {
                            fill = blend(theme.bgHeader, fill);
                        }
                        for (let i = 0; i < accentCount; i++) {
                            fill = blend(theme.accentLight, fill);
                        }
                    } else if (prelightCells !== undefined) {
                        for (const pre of prelightCells) {
                            if (pre[0] === c.sourceIndex && pre[1] === row) {
                                fill = blend(theme.bgSearchResult, fill);
                                break;
                            }
                        }
                    }

                    if (highlightRegions !== undefined) {
                        for (let i = 0; i < highlightRegions.length; i++) {
                            const region = highlightRegions[i];
                            const r = region.range;
                            if (
                                region.style !== "solid-outline" && region.style !== "dashed-outline" &&
                                r.x <= c.sourceIndex &&
                                c.sourceIndex < r.x + r.width &&
                                r.y <= row &&
                                row < r.y + r.height
                            ) {
                                fill = blend(region.color, fill);
                            }
                        }
                    }

                    let didDamageClip = false;
                    if (damage !== undefined) {
                        // Clip to full cell bounds during damage repaints
                        const top = cellY;
                        const bottom = isSticky
                            ? top + cellHeight
                            : Math.min(top + cellHeight, height - freezeTrailingRowsHeight);
                        const h = bottom - top;

                        didDamageClip = true;
                        ctx.save();
                        ctx.beginPath();
                        ctx.rect(cellX, top, cellWidth, h);
                        ctx.clip();

                        // Track damage rects for grid line restoration
                        damageRects?.push({ x: cellX, y: top, width: cellWidth, height: h });

                        // Clear before fill to support translucent backgrounds
                        ctx.clearRect(cellX, top, cellWidth, h);

                        // we also need to make sure to wipe the contents. Since the fill can do that lets repurpose
                        // that call to avoid an extra draw call.
                        fill = fill === undefined ? theme.bgCell : blend(fill, theme.bgCell);
                    }

                    const isLastColumn = c.sourceIndex === allColumns.length - 1;
                    const isLastRow = row === rows - 1;
                    if (fill !== undefined) {
                        ctx.fillStyle = fill;
                        if (prepResult !== undefined) {
                            prepResult.fillStyle = fill;
                        }
                        if (damage !== undefined) {
                            ctx.fillRect(cellX, cellY, cellWidth, cellHeight);
                        } else {
                            ctx.fillRect(cellX, cellY, cellWidth, cellHeight);
                        }
                    }

                    if (cell.style === "faded") {
                        ctx.globalAlpha = 0.6;
                    }

                    let hoverValue: HoverValues[number] | undefined;
                    for (let i = 0; i < hoverValues.length; i++) {
                        const hv = hoverValues[i];
                        if (hv.item[0] === c.sourceIndex && hv.item[1] === row) {
                            hoverValue = hv;
                            break;
                        }
                    }

                    if (cellWidth > minimumCellWidth && !skipContents) {
                        const cellFont = theme.baseFontFull;
                        if (cellFont !== font) {
                            ctx.font = cellFont;
                            font = cellFont;
                        }
                        prepResult = drawCell(
                            ctx,
                            cell,
                            c.sourceIndex,
                            row,
                            isLastColumn,
                            isLastRow,
                            cellX,
                            cellY,
                            cellWidth,
                            cellHeight,
                            accentCount > 0,
                            theme,
                            fill ?? theme.bgCell,
                            imageLoader,
                            spriteManager,
                            hoverValue?.hoverAmount ?? 0,
                            hoverInfo,
                            hyperWrapping,
                            frameTime,
                            drawCellCallback,
                            prepResult,
                            enqueue,
                            renderStateProvider,
                            getCellRenderer,
                            overrideCursor
                        );
                    }

                    if (didDamageClip) {
                        ctx.restore();
                    }

                    if (cell.style === "faded") {
                        ctx.globalAlpha = 1;
                    }

                    toDraw--;
                    if (drawingSpan || drawingRowSpan) {
                        ctx.restore();
                        prepResult?.deprep?.(deprepArg);
                        prepResult = undefined;
                        reclip();
                        font = colFont;
                        ctx.font = colFont;
                    }

                    return toDraw <= 0;
                }
            );

            ctx.restore();
            return toDraw <= 0;
        }
    );
    return result;
}

const allocatedItem: [number, number] = [0, 0];
const reusableRect = { x: 0, y: 0, width: 0, height: 0 };
const drawState: DrawStateTuple = [undefined, () => undefined];

let animationFrameRequested = false;
function animRequest(): void {
    animationFrameRequested = true;
}

export function drawCell(
    ctx: CanvasRenderingContext2D,
    cell: InnerGridCell,
    col: number,
    row: number,
    isLastCol: boolean,
    isLastRow: boolean,
    x: number,
    y: number,
    w: number,
    h: number,
    highlighted: boolean,
    theme: FullTheme,
    finalCellFillColor: string,
    imageLoader: ImageWindowLoader,
    spriteManager: SpriteManager,
    hoverAmount: number,
    hoverInfo: HoverInfo | undefined,
    hyperWrapping: boolean,
    frameTime: number,
    drawCellCallback: DrawCellCallback | undefined,
    lastPrep: PrepResult | undefined,
    enqueue: EnqueueCallback | undefined,
    renderStateProvider: RenderStateProvider,
    getCellRenderer: GetCellRendererCallback,
    overrideCursor: (cursor: React.CSSProperties["cursor"]) => void
): PrepResult | undefined {
    let hoverX: number | undefined;
    let hoverY: number | undefined;
    if (hoverInfo !== undefined && hoverInfo[0][0] === col && hoverInfo[0][1] === row) {
        hoverX = hoverInfo[1][0];
        hoverY = hoverInfo[1][1];
    }
    let result: PrepResult | undefined = undefined;

    allocatedItem[0] = col;
    allocatedItem[1] = row;

    reusableRect.x = x;
    reusableRect.y = y;
    reusableRect.width = w;
    reusableRect.height = h;

    drawState[0] = renderStateProvider.getValue(allocatedItem);
    drawState[1] = (val: any) => renderStateProvider.setValue(allocatedItem, val); //alloc

    animationFrameRequested = false;

    const args: DrawArgs<typeof cell> = {
        //alloc
        ctx,
        theme,
        col,
        row,
        cell,
        rect: reusableRect,
        highlighted,
        cellFillColor: finalCellFillColor,
        hoverAmount,
        frameTime,
        hoverX,
        drawState,
        hoverY,
        imageLoader,
        spriteManager,
        hyperWrapping,
        overrideCursor: hoverX !== undefined ? overrideCursor : undefined,
        requestAnimationFrame: animRequest,
    };
    const needsAnim = drawLastUpdateUnderlay(args, cell.lastUpdated, frameTime, lastPrep, isLastCol, isLastRow);

    const r = getCellRenderer(cell);
    if (r !== undefined) {
        if (lastPrep?.renderer !== r) {
            lastPrep?.deprep?.(args);
            lastPrep = undefined;
        }
        const partialPrepResult = r.drawPrep?.(args, lastPrep);
        if (drawCellCallback !== undefined && !isInnerOnlyCell(args.cell)) {
            drawCellCallback(args as DrawArgs<GridCell>, () => r.draw(args, cell));
        } else {
            r.draw(args, cell);
        }
        result =
            partialPrepResult === undefined
                ? undefined
                : {
                      deprep: partialPrepResult?.deprep,
                      fillStyle: partialPrepResult?.fillStyle,
                      font: partialPrepResult?.font,
                      renderer: r,
                  };
    }

    if (needsAnim || animationFrameRequested) enqueue?.(allocatedItem);
    return result;
}
