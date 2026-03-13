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
    { title: "Status", width: 100 },
    { title: "URL", width: 250 },
    { title: "Description", width: 300 },
    { title: "Tags", width: 180 },
    { title: "Score", width: 90 },
];

const statuses = [
    "Active",
    "Inactive",
    "Pending",
    "Archived",
    "Draft",
    "Review",
    "Approved",
    "Rejected",
    "On Hold",
    "Cancelled",
    "Completed",
    "In Progress",
];
const tags = ["frontend", "backend", "devops", "design", "data", "mobile"];

const NUM_ROWS = 500;

export const EditorScrollAnchor = () => {
    const [data, setData] = React.useState(() => {
        const rows: Array<{
            name: string;
            company: string;
            email: string;
            num: number;
            notes: string;
            status: string;
            url: string;
            description: string;
            tags: string;
            score: number;
        }> = [];
        for (let i = 0; i < NUM_ROWS; i++) {
            rows.push({
                name: `Person ${i + 1}`,
                company: `Company ${String.fromCharCode(65 + (i % 26))}`,
                email: `person${i + 1}@example.com`,
                num: Math.round(Math.random() * 1000),
                notes: i % 3 === 0 ? "Some notes here that might be longer than the cell width" : "",
                status: statuses[i % statuses.length],
                url: `https://example.com/users/${i + 1}/profile`,
                description:
                    i % 4 === 0
                        ? "A much longer description field that will definitely overflow the cell and test wider editor overlays"
                        : i % 2 === 0
                          ? "Medium length text"
                          : "",
                tags: tags.slice(0, 1 + (i % tags.length)).join(", "),
                score: Math.round(Math.random() * 100) / 10,
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
                case 5:
                    return {
                        kind: GridCellKind.Text,
                        data: r.status,
                        displayData: r.status,
                        allowOverlay: true,
                    };
                case 6:
                    return {
                        kind: GridCellKind.Uri,
                        data: r.url,
                        displayData: r.url,
                        allowOverlay: true,
                    };
                case 7:
                    return {
                        kind: GridCellKind.Text,
                        data: r.description,
                        displayData: r.description,
                        allowOverlay: true,
                    };
                case 8:
                    return {
                        kind: GridCellKind.Text,
                        data: r.tags,
                        displayData: r.tags,
                        allowOverlay: true,
                    };
                case 9:
                    return {
                        kind: GridCellKind.Number,
                        data: r.score,
                        displayData: r.score.toFixed(1),
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
                case 5:
                    if (newValue.kind === GridCellKind.Text) r.status = newValue.data;
                    break;
                case 6:
                    if (newValue.kind === GridCellKind.Uri) r.url = newValue.data;
                    break;
                case 7:
                    if (newValue.kind === GridCellKind.Text) r.description = newValue.data;
                    break;
                case 8:
                    if (newValue.kind === GridCellKind.Text) r.tags = newValue.data;
                    break;
                case 9:
                    if (newValue.kind === GridCellKind.Number) r.score = newValue.data ?? 0;
                    break;
            }
            next[row] = r;
            return next;
        });
    }, []);

    const provideEditor = React.useCallback<ProvideEditorCallback<TextCell>>(cell => {
        if (cell.location?.[0] === 5) {
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
            experimental={{ editorAnchorToCell: true }}
        />
    );
};
