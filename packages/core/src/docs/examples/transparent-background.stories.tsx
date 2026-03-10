import React from "react";
import { DataEditorAll as DataEditor } from "../../data-editor-all.js";
import {
    Description,
    PropName,
    useMockDataGenerator,
    defaultProps,
} from "../../data-editor/stories/utils.js";
import { SimpleThemeWrapper } from "../../stories/story-utils.js";
import { styled } from "@linaria/react";

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

const CheckerboardContainer = styled.div`
    display: flex;
    flex-direction: column;
    height: 100vh;
    padding: 32px 48px;
    font-family: sans-serif;
    color: white;

    background-color: #1e1e2e;
    background-image: linear-gradient(45deg, #2a2a3e 25%, transparent 25%),
        linear-gradient(-45deg, #2a2a3e 25%, transparent 25%),
        linear-gradient(45deg, transparent 75%, #2a2a3e 75%),
        linear-gradient(-45deg, transparent 75%, #2a2a3e 75%);
    background-size: 40px 40px;
    background-position:
        0 0,
        0 20px,
        20px -20px,
        -20px 0;

    & > h1 {
        font-size: 50px;
        font-weight: 600;
        flex-shrink: 0;
        margin: 0 0 12px 0;
    }

    .grid-container {
        flex-grow: 1;
        border-radius: 12px;
        overflow: hidden;
        position: relative;
    }
`;

const transparentTheme = {
    bgCell: "rgba(30, 30, 46, 0.6)",
    bgCellMedium: "rgba(30, 30, 46, 0.7)",
    bgHeader: "rgba(30, 30, 46, 0.8)",
    bgHeaderHasFocus: "rgba(60, 60, 80, 0.8)",
    bgHeaderHovered: "rgba(50, 50, 70, 0.8)",

    textDark: "#cdd6f4",
    textMedium: "#bac2de",
    textLight: "#a6adc8",
    textHeader: "#cdd6f4",
    textHeaderSelected: "#ffffff",
    textBubble: "#cdd6f4",

    accentColor: "#89b4fa",
    accentLight: "rgba(137, 180, 250, 0.2)",

    bgIconHeader: "#585b70",
    fgIconHeader: "#cdd6f4",

    bgBubble: "rgba(30, 30, 46, 0.8)",
    bgBubbleSelected: "rgba(30, 30, 46, 0.9)",
    bgSearchResult: "rgba(249, 226, 175, 0.2)",

    borderColor: "rgba(205, 214, 244, 0.15)",
    drilldownBorder: "rgba(205, 214, 244, 0.3)",

    linkColor: "#89b4fa",

    bgCellEditor: "#1e1e2e",
};

export const TransparentBackground: React.VFC = () => {
    const { cols, getCellContent, onColumnResize } = useMockDataGenerator(6);

    return (
        <CheckerboardContainer>
            <h1>Transparent Background</h1>
            <Description>
                Use rgba colors for <PropName>bgCell</PropName> and <PropName>bgHeader</PropName> to let a background
                show through the grid. Set <PropName>bgCellEditor</PropName> to an opaque color so editor overlays
                and the search bar remain solid. The checkerboard pattern behind the grid demonstrates the
                transparency.
            </Description>
            <div className="grid-container">
                <DataEditor
                    {...defaultProps}
                    theme={transparentTheme}
                    getCellContent={getCellContent}
                    columns={cols}
                    onColumnResize={onColumnResize}
                    rows={1000}
                />
            </div>
        </CheckerboardContainer>
    );
};
