import React from "react";
import { DataEditorAll as DataEditor } from "../../data-editor-all.js";
import { BeautifulWrapper, Description, useMockDataGenerator, defaultProps } from "../../data-editor/stories/utils.js";
import { SimpleThemeWrapper } from "../../stories/story-utils.js";

export default {
    title: "Glide-Data-Grid/DataEditor Demos",

    decorators: [
        (Story: React.ComponentType) => (
            <SimpleThemeWrapper>
                <BeautifulWrapper
                    title="Editor Scroll Anchoring"
                    description={
                        <Description>
                            Open an editor by double-clicking a cell, then scroll. The editor tracks the cell and clips
                            to the grid boundary. Scroll the cell fully out of view to auto-close.
                        </Description>
                    }>
                    <Story />
                </BeautifulWrapper>
            </SimpleThemeWrapper>
        ),
    ],
};

export const EditorScrollAnchor = () => {
    const { cols, getCellContent, setCellValue } = useMockDataGenerator(20, false);

    return (
        <DataEditor
            {...defaultProps}
            getCellContent={getCellContent}
            columns={cols}
            rows={1000}
            onCellEdited={setCellValue}
        />
    );
};
