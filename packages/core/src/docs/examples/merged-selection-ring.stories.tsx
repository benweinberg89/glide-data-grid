import React from "react";
import { DataEditorAll as DataEditor } from "../../data-editor-all.js";
import {
    BeautifulWrapper,
    Description,
    PropName,
    useMockDataGenerator,
    defaultProps,
} from "../../data-editor/stories/utils.js";
import { SimpleThemeWrapper } from "../../stories/story-utils.js";

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
    const { cols, getCellContent } = useMockDataGenerator(20);

    return (
        <BeautifulWrapper
            title="Merged Selection Ring"
            description={
                <Description>
                    With <PropName>experimental.mergedSelectionRing</PropName> enabled, multi-rect selections render a
                    single contour border around the union of all selected cells instead of per-rect outlines.
                    Overlapping fills no longer stack. Use <PropName>rangeSelect=&quot;multi-rect&quot;</PropName> and{" "}
                    <b>Cmd+click</b> (or <b>Ctrl+click</b>) to add overlapping selections.
                </Description>
            }>
            <DataEditor
                {...defaultProps}
                getCellContent={getCellContent}
                columns={cols}
                rows={1000}
                rangeSelect="multi-rect"
                rangeSelectionBlending="mixed"
                experimental={{ mergedSelectionRing: true }}
            />
        </BeautifulWrapper>
    );
};
