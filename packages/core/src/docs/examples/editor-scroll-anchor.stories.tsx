import React from "react";
import { DataEditorAll as DataEditor } from "../../data-editor-all.js";
import { BeautifulWrapper, Description, defaultProps } from "../../data-editor/stories/utils.js";
import { SimpleThemeWrapper } from "../../stories/story-utils.js";
import {
    GridCellKind,
    type GridCell,
    type GridColumn,
    type Item,
} from "../../index.js";
import {
    DropdownCell as DropdownCellRenderer,
    TagsCell as TagsCellRenderer,
    MultiSelectCell as MultiSelectCellRenderer,
} from "@glideapps/glide-data-grid-cells";
import type {
    DropdownCellType,
    TagsCellType,
    MultiSelectCellType,
} from "@glideapps/glide-data-grid-cells";

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
                            to the grid boundary. Try the dropdown column — it has enough options to scroll.
                        </Description>
                    }>
                    <Story />
                </BeautifulWrapper>
            </SimpleThemeWrapper>
        ),
    ],
};

const dropdownOptions = [
    "Apple", "Banana", "Cherry", "Date", "Elderberry", "Fig", "Grape", "Honeydew",
    "Jackfruit", "Kiwi", "Lemon", "Mango", "Nectarine", "Orange", "Papaya", "Quince",
    "Raspberry", "Strawberry", "Tangerine", "Ugli Fruit", "Vanilla Bean", "Watermelon",
    "Xigua", "Yuzu", "Zucchini",
];

const possibleTags = [
    { tag: "Bug", color: "#ff4d4d35" },
    { tag: "Feature", color: "#35f8ff35" },
    { tag: "Enhancement", color: "#48ff5735" },
    { tag: "First Issue", color: "#436fff35" },
    { tag: "PR", color: "#e0ff3235" },
    { tag: "Assigned", color: "#ff1eec35" },
];

const multiSelectOptions = [
    { value: "frontend", color: "#ffc38a" },
    { value: "backend", color: "#ebfdea" },
    { value: "infra", color: "#b3d4ff" },
    { value: "design", color: "#f0c0ff" },
    { value: "mobile", color: "#ffe0b2" },
];

const customRenderers = [DropdownCellRenderer, TagsCellRenderer, MultiSelectCellRenderer];

const columns: GridColumn[] = [
    { title: "Name", width: 150 },
    { title: "Fruit (Dropdown)", width: 180 },
    { title: "Tags", width: 200 },
    { title: "Team (Multi-Select)", width: 220 },
    { title: "Number", width: 120 },
    { title: "Notes", width: 200 },
];

const NUM_ROWS = 500;

export const EditorScrollAnchor = () => {
    const [data, setData] = React.useState(() => {
        const rows: Array<{
            name: string;
            fruit: string;
            tags: string[];
            team: string[];
            num: number;
            notes: string;
        }> = [];
        for (let i = 0; i < NUM_ROWS; i++) {
            rows.push({
                name: `Row ${i + 1}`,
                fruit: dropdownOptions[i % dropdownOptions.length],
                tags: [
                    possibleTags[i % possibleTags.length].tag,
                    possibleTags[(i + 2) % possibleTags.length].tag,
                ],
                team: [
                    multiSelectOptions[i % multiSelectOptions.length].value,
                    multiSelectOptions[(i + 1) % multiSelectOptions.length].value,
                ],
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
                        kind: GridCellKind.Custom,
                        allowOverlay: true,
                        copyData: r.fruit,
                        data: {
                            kind: "dropdown-cell",
                            allowedValues: dropdownOptions,
                            value: r.fruit,
                        },
                    } as DropdownCellType;
                case 2:
                    return {
                        kind: GridCellKind.Custom,
                        allowOverlay: true,
                        copyData: r.tags.join(", "),
                        data: {
                            kind: "tags-cell",
                            possibleTags,
                            tags: r.tags,
                        },
                    } as TagsCellType;
                case 3:
                    return {
                        kind: GridCellKind.Custom,
                        allowOverlay: true,
                        copyData: r.team.join(", "),
                        data: {
                            kind: "multi-select-cell",
                            values: r.team,
                            options: multiSelectOptions,
                            allowCreation: true,
                            allowDuplicates: false,
                        },
                    } as MultiSelectCellType;
                case 4:
                    return {
                        kind: GridCellKind.Number,
                        data: r.num,
                        displayData: r.num.toString(),
                        allowOverlay: true,
                    };
                case 5:
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

    const onCellEdited = React.useCallback(([col, row]: Item, newValue: GridCell) => {
        setData(prev => {
            const next = [...prev];
            const r = { ...next[row] };
            switch (col) {
                case 0:
                    if (newValue.kind === GridCellKind.Text) r.name = newValue.data;
                    break;
                case 1:
                    if (newValue.kind === GridCellKind.Custom)
                        r.fruit = (newValue as DropdownCellType).data.value ?? r.fruit;
                    break;
                case 2:
                    if (newValue.kind === GridCellKind.Custom)
                        r.tags = (newValue as TagsCellType).data.tags;
                    break;
                case 3:
                    if (newValue.kind === GridCellKind.Custom)
                        r.team = (newValue as MultiSelectCellType).data.values ?? r.team;
                    break;
                case 4:
                    if (newValue.kind === GridCellKind.Number) r.num = newValue.data ?? 0;
                    break;
                case 5:
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
            customRenderers={customRenderers}
            rows={NUM_ROWS}
            onCellEdited={onCellEdited}
        />
    );
};
