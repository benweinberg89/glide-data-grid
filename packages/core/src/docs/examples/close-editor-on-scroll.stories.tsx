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
    type ProvideEditorCallback,
    type TextCell,
} from "../../index.js";

const DropdownEditor: React.FC<{
    value: TextCell;
    onFinishedEditing: (newValue: TextCell) => void;
    options: string[];
}> = ({ value, onFinishedEditing, options }) => {
    return (
        <div
            style={{
                display: "flex",
                flexDirection: "column",
                background: "white",
                padding: "4px 0",
                minWidth: 140,
                maxHeight: 180,
                overflowY: "auto",
            }}>
            {options.map(opt => (
                <div
                    key={opt}
                    style={{
                        padding: "6px 12px",
                        cursor: "pointer",
                        background: opt === value.data ? "#EEF1FF" : "transparent",
                        fontWeight: opt === value.data ? 600 : 400,
                    }}
                    onMouseDown={e => {
                        e.preventDefault();
                        onFinishedEditing({ ...value, data: opt, displayData: opt });
                    }}>
                    {opt}
                </div>
            ))}
        </div>
    );
};
DropdownEditor.displayName = "DropdownEditor";

export default {
    title: "Glide-Data-Grid/DataEditor Demos",

    decorators: [
        (Story: React.ComponentType) => (
            <SimpleThemeWrapper>
                <BeautifulWrapper
                    title="Close Editor on Scroll"
                    description={
                        <Description>
                            Open an editor by double-clicking a cell, then scroll. The editor closes immediately instead
                            of staying open while the cell moves away.
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
    { title: "Status", width: 100 },
    { title: "Notes", width: 200 },
];

const statuses = ["Active", "Inactive", "Pending", "Archived", "Draft", "Review", "Approved", "Rejected"];

const NUM_ROWS = 500;

export const CloseEditorOnScroll = () => {
    const [data, setData] = React.useState(() => {
        const rows: Array<{
            name: string;
            company: string;
            email: string;
            status: string;
            notes: string;
        }> = [];
        for (let i = 0; i < NUM_ROWS; i++) {
            rows.push({
                name: `Person ${i + 1}`,
                company: `Company ${String.fromCharCode(65 + (i % 26))}`,
                email: `person${i + 1}@example.com`,
                status: statuses[i % statuses.length],
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
                    return { kind: GridCellKind.Text, data: r.name, displayData: r.name, allowOverlay: true };
                case 1:
                    return { kind: GridCellKind.Text, data: r.company, displayData: r.company, allowOverlay: true };
                case 2:
                    return { kind: GridCellKind.Text, data: r.email, displayData: r.email, allowOverlay: true };
                case 3:
                    return { kind: GridCellKind.Text, data: r.status, displayData: r.status, allowOverlay: true };
                case 4:
                    return { kind: GridCellKind.Text, data: r.notes, displayData: r.notes, allowOverlay: true };
                default:
                    return { kind: GridCellKind.Text, data: "", displayData: "", allowOverlay: false };
            }
        },
        [data]
    );

    const onCellEdited = React.useCallback(([col, row]: Item, newValue: EditableGridCell) => {
        setData(prev => {
            const next = [...prev];
            const r = { ...next[row] };
            if (newValue.kind === GridCellKind.Text) {
                switch (col) {
                    case 0:
                        r.name = newValue.data;
                        break;
                    case 1:
                        r.company = newValue.data;
                        break;
                    case 2:
                        r.email = newValue.data;
                        break;
                    case 3:
                        r.status = newValue.data;
                        break;
                    case 4:
                        r.notes = newValue.data;
                        break;
                }
            }
            next[row] = r;
            return next;
        });
    }, []);

    const provideEditor = React.useCallback<ProvideEditorCallback<TextCell>>(cell => {
        if (cell.location?.[0] === 3) {
            return {
                editor: p => (
                    <DropdownEditor
                        value={p.value as TextCell}
                        onFinishedEditing={v => p.onFinishedEditing(v as TextCell)}
                        options={statuses}
                    />
                ),
                disablePadding: true,
                disableStyling: false,
            };
        }
        return undefined;
    }, []);

    return (
        <DataEditor
            {...defaultProps}
            getCellContent={getCellContent}
            columns={columns}
            rows={NUM_ROWS}
            onCellEdited={onCellEdited}
            provideEditor={provideEditor}
            experimental={{ closeEditorOnScroll: true }}
        />
    );
};
