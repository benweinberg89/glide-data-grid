import { getMiddleCenterBias } from "../internal/data-grid/render/data-grid-lib.js";
import { InnerGridCellKind, type MarkerCell } from "../internal/data-grid/data-grid-types.js";
import { drawCheckbox } from "../internal/data-grid/render/draw-checkbox.js";
import type { BaseDrawArgs, InternalCellRenderer, PrepResult } from "./cell-types.js";

export const markerCellRenderer: InternalCellRenderer<MarkerCell> = {
    getAccessibilityString: c => c.formatLabel !== undefined ? c.formatLabel(c.row) : c.row.toString(),
    kind: InnerGridCellKind.Marker,
    needsHover: true,
    needsHoverPosition: false,
    drawPrep: prepMarkerRowCell,
    measure: () => 44,
    draw: a =>
        drawMarkerRowCell(a, a.cell.row, a.cell.checked, a.cell.markerKind, a.cell.drawHandle, a.cell.checkboxStyle, a.cell.formatLabel, a.highlighted),
    onClick: e => {
        const { bounds, cell, posX: x, posY: y } = e;
        const { width, height } = bounds;

        const centerX = cell.drawHandle ? 7 + (width - 7) / 2 : width / 2;
        const centerY = height / 2;

        if (Math.abs(x - centerX) <= 10 && Math.abs(y - centerY) <= 10) {
            return {
                ...cell,
                checked: !cell.checked,
            };
        }
        return undefined;
    },
    onPaste: () => undefined,
};

function prepMarkerRowCell(args: BaseDrawArgs, lastPrep: PrepResult | undefined): Partial<PrepResult> {
    const { ctx, theme } = args;
    const newFont = theme.markerFontFull;
    const result: Partial<PrepResult> = lastPrep ?? {};
    if (result?.font !== newFont) {
        ctx.font = newFont;
        result.font = newFont;
    }
    result.deprep = deprepMarkerRowCell;
    ctx.textAlign = "center";
    return result;
}

function deprepMarkerRowCell(args: Pick<BaseDrawArgs, "ctx">) {
    const { ctx } = args;
    ctx.textAlign = "start";
}

function drawMarkerRowCell(
    args: BaseDrawArgs,
    index: number,
    checked: boolean,
    markerKind: "checkbox" | "both" | "number" | "checkbox-visible",
    drawHandle: boolean,
    style: "circle" | "square",
    formatLabel?: (rowIndex: number) => string,
    highlighted?: boolean
) {
    const { ctx, rect, hoverAmount, theme } = args;
    const { x, y, width, height } = rect;
    const checkedboxAlpha = checked ? 1 : markerKind === "checkbox-visible" ? 0.6 + 0.4 * hoverAmount : hoverAmount;
    if (markerKind !== "number" && checkedboxAlpha > 0) {
        ctx.globalAlpha = checkedboxAlpha;
        const offsetAmount = 7 * (checked ? hoverAmount : 1);
        drawCheckbox(
            ctx,
            theme,
            checked,
            drawHandle ? x + offsetAmount : x,
            y,
            drawHandle ? width - offsetAmount : width,
            height,
            true,
            undefined,
            undefined,
            theme.checkboxMaxSize,
            "center",
            style
        );
        if (drawHandle) {
            ctx.globalAlpha = hoverAmount;
            ctx.beginPath();
            for (const xOffset of [3, 6]) {
                for (const yOffset of [-5, -1, 3]) {
                    ctx.rect(x + xOffset, y + height / 2 + yOffset, 2, 2);
                }
            }

            ctx.fillStyle = theme.textLight;
            ctx.fill();
            ctx.beginPath();
        }
        ctx.globalAlpha = 1;
    }
    // When the row is selected, fill the marker cell with solid accent color
    // to match column header behavior (which uses accentColor bg when selected).
    // Without this, the cell only gets accentLight (semi-transparent) from the
    // rendering pipeline, making white textHeaderSelected text look washed out.
    // Only apply for number/both markers — checkbox markers draw their own fill.
    if (highlighted && markerKind !== "checkbox" && markerKind !== "checkbox-visible") {
        ctx.fillStyle = theme.accentColor;
        ctx.fillRect(x, y, width, height);
    }
    if (markerKind === "number" || (markerKind === "both" && !checked)) {
        const text = formatLabel !== undefined ? formatLabel(index) : index.toString();
        const fontStyle = theme.markerFontFull;

        const start = x + width / 2;
        if (markerKind === "both" && hoverAmount !== 0) {
            ctx.globalAlpha = 1 - hoverAmount;
        }
        ctx.fillStyle = highlighted ? theme.textHeaderSelected : theme.textLight;
        ctx.font = fontStyle;
        ctx.fillText(text, start, y + height / 2 + getMiddleCenterBias(ctx, fontStyle));
        if (hoverAmount !== 0) {
            ctx.globalAlpha = 1;
        }
    }
}
