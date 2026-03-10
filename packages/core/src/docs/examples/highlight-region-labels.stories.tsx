import React from "react";
import { type DataEditorProps } from "../../data-editor/data-editor.js";
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
                <BeautifulWrapper
                    title="Highlight Region Labels"
                    description={
                        <Description>
                            Add a <PropName>label</PropName> to <PropName>highlightRegions</PropName> entries to render
                            name pills above the highlighted area — useful for showing collaborator cursors.
                        </Description>
                    }>
                    <Story />
                </BeautifulWrapper>
            </SimpleThemeWrapper>
        ),
    ],
};

const collaborators = [
    { name: "Alice", color: "#3b82f6", col: 1, row: 2 },
    { name: "Bob", color: "#ef4444", col: 3, row: 5 },
    { name: "Charlie", color: "#22c55e", col: 0, row: 8 },
];

export const HighlightRegionLabels: React.VFC = () => {
    const { cols, getCellContent } = useMockDataGenerator(6);

    const highlights = React.useMemo<DataEditorProps["highlightRegions"]>(() => {
        return collaborators.map(c => ({
            color: c.color + "22",
            range: {
                x: c.col,
                y: c.row,
                width: 1,
                height: 1,
            },
            style: "solid" as const,
            label: c.name,
        }));
    }, []);

    return (
        <DataEditor
            {...defaultProps}
            highlightRegions={highlights}
            getCellContent={getCellContent}
            columns={cols}
            rows={1000}
        />
    );
};
