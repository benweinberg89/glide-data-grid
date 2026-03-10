import React from "react";
import { DataEditorAll as DataEditor } from "../../data-editor-all.js";
import { BeautifulWrapper, Description, defaultProps } from "../../data-editor/stories/utils.js";
import { SimpleThemeWrapper } from "../../stories/story-utils.js";
import {
    GridCellKind,
    type EditableGridCell,
    type GridCell,
    type GridColumn,
    type Item,
} from "../../index.js";

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
                            to the grid boundary.
                        </Description>
                    }>
                    <Story />
                </BeautifulWrapper>
            </SimpleThemeWrapper>
        ),
    ],
};

const columns: GridColumn[] = [
    { title: "Name", width: 150 },
    { title: "Company", width: 180 },
    { title: "Email", width: 220 },
    { title: "Number", width: 120 },
    { title: "Notes", width: 200 },
];

const NUM_ROWS = 500;

export const EditorScrollAnchor = () => {
    const [data, setData] = React.useState(() => {
        const rows: Array<{
            name: string;
            company: string;
            email: string;
            num: number;
            notes: string;
        }> = [];
        for (let i = 0; i < NUM_ROWS; i++) {
            rows.push({
                name: `Person ${i + 1}`,
                company: `Company ${String.fromCharCode(65 + (i % 26))}`,
                email: `person${i + 1}@example.com`,
                num: Math.round(Math.random() * 1000),
                notes: i % 3 === 0 ? "Some notes here" : "",
            });
        }
        return rows;
    });

    const getCellContent = React.useCallback(
        ([col, row]: Item): GridCell => {
            const r = data[row];
            switch (col) {
                case 0:
                    return {
                        kind: GridCellKind.Text,
                        data: r.name,
                        displayData: r.name,
                        allowOverlay: true,
                    };
                case 1:
                    return {
                        kind: GridCellKind.Text,
                        data: r.company,
                        displayData: r.company,
                        allowOverlay: true,
                    };
                case 2:
                    return {
                        kind: GridCellKind.Text,
                        data: r.email,
                        displayData: r.email,
                        allowOverlay: true,
                    };
                case 3:
                    return {
                        kind: GridCellKind.Number,
                        data: r.num,
                        displayData: r.num.toString(),
                        allowOverlay: true,
                    };
                case 4:
                    return {
                        kind: GridCellKind.Text,
                        data: r.notes,
                        displayData: r.notes,
                        allowOverlay: true,
                    };
                default:
                    return {
                        kind: GridCellKind.Text,
                        data: "",
                        displayData: "",
                        allowOverlay: false,
                    };
            }
        },
        [data]
    );

    const onCellEdited = React.useCallback(([col, row]: Item, newValue: EditableGridCell) => {
        setData(prev => {
            const next = [...prev];
            const r = { ...next[row] };
            switch (col) {
                case 0:
                    if (newValue.kind === GridCellKind.Text) r.name = newValue.data;
                    break;
                case 1:
                    if (newValue.kind === GridCellKind.Text) r.company = newValue.data;
                    break;
                case 2:
                    if (newValue.kind === GridCellKind.Text) r.email = newValue.data;
                    break;
                case 3:
                    if (newValue.kind === GridCellKind.Number) r.num = newValue.data ?? 0;
                    break;
                case 4:
                    if (newValue.kind === GridCellKind.Text) r.notes = newValue.data;
                    break;
            }
            next[row] = r;
            return next;
        });
    }, []);

    return (
        <DataEditor
            {...defaultProps}
            getCellContent={getCellContent}
            columns={columns}
            rows={NUM_ROWS}
            onCellEdited={onCellEdited}
            experimental={{ editorAnchorToCell: true }}
        />
    );
};
