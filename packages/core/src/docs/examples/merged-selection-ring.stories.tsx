import React from "react";
import { DataEditorAll as DataEditor } from "../../data-editor-all.js";
import { CompactSelection } from "../../index.js";
import {
    BeautifulWrapper,
    Description,
    PropName,
    useMockDataGenerator,
    defaultProps,
} from "../../data-editor/stories/utils.js";
import { SimpleThemeWrapper } from "../../stories/story-utils.js";
import type { GridSelection } from "../../index.js";

export default {
    title: "Glide-Data-Grid/DataEditor Demos",
    decorators: [
        (Story: React.ComponentType) => (
            <SimpleThemeWrapper>
                <Story />
            </SimpleThemeWrapper>
        ),
    ],
};

export const MergedSelectionRing: React.VFC = () => {
    const { cols, getCellContent, setCellValue } = useMockDataGenerator(20, false);
    const [selection, setSelection] = React.useState<GridSelection>({
        columns: CompactSelection.empty(),
        rows: CompactSelection.empty(),
    });
    const selectionRef = React.useRef(selection);

    const [flashRegions, setFlashRegions] = React.useState<
        { color: string; range: { x: number; y: number; width: number; height: number } }[]
    >([]);

    const onGridSelectionChange = React.useCallback((sel: GridSelection) => {
        selectionRef.current = sel;
        setSelection(sel);
    }, []);

    const onCopyFlash = React.useCallback(() => {
        const sel = selectionRef.current;
        if (sel.current === undefined) return;

        const allRanges = [sel.current.range, ...sel.current.rangeStack];
        const regions = allRanges
            .filter(r => r.width * r.height > 0)
            .map(r => ({
                color: "rgba(79, 93, 255, 0.2)",
                range: { x: r.x, y: r.y, width: r.width, height: r.height },
            }));

        setFlashRegions(regions);
        setTimeout(() => setFlashRegions([]), 200);
    }, []);

    React.useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "c") {
                onCopyFlash();
            }
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [onCopyFlash]);

    return (
        <BeautifulWrapper
            title="Merged Selection Ring"
            description={
                <Description>
                    With <PropName>experimental.mergedSelectionRing</PropName> enabled, multi-rect selections render a
                    single contour border around the union of all selected cells instead of per-rect outlines.
                    Overlapping fills no longer stack. Use <PropName>rangeSelect=&quot;multi-rect&quot;</PropName> and{" "}
                    <b>Cmd+click</b> (or <b>Ctrl+click</b>) to add overlapping selections. Copy and paste preserves
                    spatial layout with holes skipped on GDG-to-GDG paste.
                </Description>
            }>
            <DataEditor
                {...defaultProps}
                getCellContent={getCellContent}
                onCellEdited={setCellValue}
                onPaste={true}
                gridSelection={selection}
                onGridSelectionChange={onGridSelectionChange}
                highlightRegions={flashRegions.length > 0 ? flashRegions : undefined}
                columns={cols}
                rows={1000}
                rangeSelect="multi-rect"
                rangeSelectionBlending="mixed"
                experimental={{ mergedSelectionRing: true }}
            />
        </BeautifulWrapper>
    );
};
