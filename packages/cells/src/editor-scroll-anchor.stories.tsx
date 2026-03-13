import * as React from "react";
import { styled } from "@linaria/react";
import {
    DataEditor,
    type DataEditorProps,
    type EditableGridCell,
    type GridCell,
    type GridColumn,
    type Item,
    GridCellKind,
} from "@glideapps/glide-data-grid";
import { useResizeDetector } from "react-resize-detector";
import "@glideapps/glide-data-grid/dist/index.css";
import "@toast-ui/editor/dist/toastui-editor.css";

import DropdownCellRenderer from "./cells/dropdown-cell.js";
import type { DropdownCell } from "./cells/dropdown-cell.js";
import MultiSelectCellRenderer from "./cells/multi-select-cell.js";
import type { MultiSelectCell } from "./cells/multi-select-cell.js";
import ArticleCellRenderer from "./cells/article-cell.js";
import type { ArticleCell } from "./cells/article-cell-types.js";
import TagsCellRenderer from "./cells/tags-cell.js";
import type { TagsCell } from "./cells/tags-cell.js";

const customRenderers = [DropdownCellRenderer, MultiSelectCellRenderer, ArticleCellRenderer, TagsCellRenderer];

const SimpleWrapper = styled.div`
    box-sizing: border-box;

    *,
    *::before,
    *::after {
        box-sizing: inherit;
    }
`;

const SimpleThemeWrapper: React.FC<React.PropsWithChildren> = p => {
    return (
        <SimpleWrapper>
            <div className="content">{p.children}</div>
        </SimpleWrapper>
    );
};

const BeautifulStyle = styled.div`
    background-color: #2790b9;
    background: linear-gradient(90deg, #2790b9, #2070a9);
    color: white;

    padding: 32px 48px;

    display: flex;
    flex-direction: column;
    height: 100vh;

    font-family: sans-serif;

    & > h1 {
        font-size: 50px;
        font-weight: 600;
        flex-shrink: 0;
        margin: 0 0 12px 0;
    }

    .sizer {
        flex-grow: 1;

        background-color: white;

        border-radius: 12px;
        box-shadow:
            rgba(9, 30, 66, 0.25) 0px 4px 8px -2px,
            rgba(9, 30, 66, 0.08) 0px 0px 0px 1px;

        .sizer-clip {
            border-radius: 12px;
            overflow: hidden;
            transform: translateZ(0);

            height: 100%;
        }
    }
`;

const Description = styled.p`
    font-size: 18px;
    flex-shrink: 0;
    margin: 0 0 20px 0;
`;

const BeautifulWrapper: React.FC<React.PropsWithChildren<{ title: string; description?: React.ReactNode }>> = p => {
    const { title, children, description } = p;
    const { ref, width, height } = useResizeDetector();

    return (
        <BeautifulStyle>
            <h1>{title}</h1>
            {description}
            <div className="sizer">
                <div className="sizer-clip" ref={ref}>
                    <div
                        style={{
                            position: "relative",
                            width: width ?? 100,
                            height: height ?? 100,
                        }}>
                        {children}
                    </div>
                </div>
            </div>
        </BeautifulStyle>
    );
};

const defaultProps: Partial<DataEditorProps> = {
    smoothScrollX: true,
    smoothScrollY: true,
    getCellsForSelection: true,
    width: "100%",
};

export default {
    title: "Extra Packages/Cells",

    decorators: [
        (Story: React.ComponentType) => (
            <SimpleThemeWrapper>
                <BeautifulWrapper
                    title="Editor Scroll Anchoring"
                    description={
                        <Description>
                            Open an editor by double-clicking a cell, then scroll. The editor tracks the cell and clips
                            to the grid boundary. Includes custom cell types (Dropdown, Multi-Select, Article, Tags).
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
    { title: "Status", width: 140 },
    { title: "Tags", width: 200 },
    { title: "Skills", width: 220 },
    { title: "Notes", width: 300 },
    { title: "Number", width: 120 },
    { title: "URL", width: 250 },
    { title: "Score", width: 90 },
];

const statuses = ["Active", "Inactive", "Pending", "Archived", "Draft", "Review", "Approved", "Rejected", "On Hold"];

const possibleTags = [
    { tag: "frontend", color: "#4fc3f735" },
    { tag: "backend", color: "#f5a62335" },
    { tag: "devops", color: "#a855f735" },
    { tag: "design", color: "#ec489935" },
    { tag: "data", color: "#22c55e35" },
    { tag: "mobile", color: "#eab30835" },
];

const skillOptions = [
    { value: "react", label: "React", color: "#61dafb40" },
    { value: "typescript", label: "TypeScript", color: "#3178c640" },
    { value: "python", label: "Python", color: "#30699840" },
    { value: "rust", label: "Rust", color: "#dea58440" },
    { value: "go", label: "Go", color: "#00add840" },
    { value: "docker", label: "Docker", color: "#2496ed40" },
];

const allSkillValues = skillOptions.map(s => s.value);

const NUM_ROWS = 500;

interface RowData {
    name: string;
    company: string;
    email: string;
    status: string;
    tags: string[];
    skills: string[];
    notes: string;
    num: number;
    url: string;
    score: number;
}

function generateRows(): RowData[] {
    const rows: RowData[] = [];
    for (let i = 0; i < NUM_ROWS; i++) {
        const tagCount = 1 + (i % possibleTags.length);
        const skillCount = 1 + (i % allSkillValues.length);
        rows.push({
            name: `Person ${i + 1}`,
            company: `Company ${String.fromCharCode(65 + (i % 26))}`,
            email: `person${i + 1}@example.com`,
            status: statuses[i % statuses.length],
            tags: possibleTags.slice(0, tagCount).map(t => t.tag),
            skills: allSkillValues.slice(0, skillCount),
            notes:
                i % 4 === 0
                    ? `# Person ${i + 1}\n\nA longer **markdown** description that tests the article editor overlay.`
                    : i % 2 === 0
                      ? "Short note"
                      : "",
            num: Math.round(Math.random() * 1000),
            url: `https://example.com/users/${i + 1}/profile`,
            score: Math.round(Math.random() * 100) / 10,
        });
    }
    return rows;
}

export const EditorScrollAnchorCustomCells = () => {
    const [data, setData] = React.useState(generateRows);

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
                        kind: GridCellKind.Custom,
                        allowOverlay: true,
                        copyData: r.status,
                        data: {
                            kind: "dropdown-cell",
                            value: r.status,
                            allowedValues: statuses,
                        },
                    } as DropdownCell;
                case 4:
                    return {
                        kind: GridCellKind.Custom,
                        allowOverlay: true,
                        copyData: r.tags.join(", "),
                        data: {
                            kind: "tags-cell",
                            tags: r.tags,
                            possibleTags,
                        },
                    } as TagsCell;
                case 5:
                    return {
                        kind: GridCellKind.Custom,
                        allowOverlay: true,
                        copyData: r.skills.join(", "),
                        data: {
                            kind: "multi-select-cell",
                            values: r.skills,
                            options: skillOptions,
                            allowCreation: true,
                            allowDuplicates: false,
                        },
                    } as MultiSelectCell;
                case 6:
                    return {
                        kind: GridCellKind.Custom,
                        allowOverlay: true,
                        copyData: r.notes,
                        data: {
                            kind: "article-cell",
                            markdown: r.notes,
                        },
                    } as ArticleCell;
                case 7:
                    return {
                        kind: GridCellKind.Number,
                        data: r.num,
                        displayData: r.num.toString(),
                        allowOverlay: true,
                    };
                case 8:
                    return {
                        kind: GridCellKind.Uri,
                        data: r.url,
                        displayData: r.url,
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
                    if (newValue.kind === GridCellKind.Custom) r.status = (newValue as DropdownCell).data.value ?? "";
                    break;
                case 4:
                    if (newValue.kind === GridCellKind.Custom) r.tags = [...(newValue as TagsCell).data.tags];
                    break;
                case 5:
                    if (newValue.kind === GridCellKind.Custom)
                        r.skills = [...((newValue as MultiSelectCell).data.values ?? [])];
                    break;
                case 6:
                    if (newValue.kind === GridCellKind.Custom) r.notes = (newValue as ArticleCell).data.markdown;
                    break;
                case 7:
                    if (newValue.kind === GridCellKind.Number) r.num = newValue.data ?? 0;
                    break;
                case 8:
                    if (newValue.kind === GridCellKind.Uri) r.url = newValue.data;
                    break;
                case 9:
                    if (newValue.kind === GridCellKind.Number) r.score = newValue.data ?? 0;
                    break;
            }
            next[row] = r;
            return next;
        });
    }, []);

    return (
        <DataEditor
            {...defaultProps}
            customRenderers={customRenderers}
            getCellContent={getCellContent}
            columns={columns}
            rows={NUM_ROWS}
            onCellEdited={onCellEdited}
            experimental={{ editorAnchorToCell: true }}
        />
    );
};

export const EditorScrollAnchorFrozenCells = () => {
    const [data, setData] = React.useState(generateRows);

    const getCellContent = React.useCallback(
        (cell: Item): GridCell => {
            const [col, row] = cell;
            const r = data[row];
            switch (col) {
                case 0:
                    return { kind: GridCellKind.Text, data: r.name, displayData: r.name, allowOverlay: true };
                case 1:
                    return { kind: GridCellKind.Text, data: r.company, displayData: r.company, allowOverlay: true };
                case 2:
                    return { kind: GridCellKind.Text, data: r.email, displayData: r.email, allowOverlay: true };
                case 3: {
                    const cell: DropdownCell = {
                        kind: GridCellKind.Custom,
                        data: { kind: "dropdown-cell", value: r.status, allowedValues: statuses },
                        copyData: r.status,
                        allowOverlay: true,
                    };
                    return cell;
                }
                case 4: {
                    const cell: TagsCell = {
                        kind: GridCellKind.Custom,
                        data: { kind: "tags-cell", tags: r.tags, possibleTags },
                        copyData: r.tags.join(", "),
                        allowOverlay: true,
                    };
                    return cell;
                }
                case 5: {
                    const cell: MultiSelectCell = {
                        kind: GridCellKind.Custom,
                        data: { kind: "multi-select-cell", values: r.skills, options: skillOptions, allowCreation: true },
                        copyData: r.skills.join(", "),
                        allowOverlay: true,
                    };
                    return cell;
                }
                case 6: {
                    const cell: ArticleCell = {
                        kind: GridCellKind.Custom,
                        data: { kind: "article-cell", markdown: r.notes },
                        copyData: r.notes,
                        allowOverlay: true,
                    };
                    return cell;
                }
                case 7:
                    return { kind: GridCellKind.Number, data: r.num, displayData: r.num.toString(), allowOverlay: true };
                case 8:
                    return { kind: GridCellKind.Uri, data: r.url, allowOverlay: true };
                case 9:
                    return { kind: GridCellKind.Number, data: r.score, displayData: r.score.toFixed(1), allowOverlay: true };
                default:
                    return { kind: GridCellKind.Text, data: "", displayData: "", allowOverlay: false };
            }
        },
        [data]
    );

    const onCellEdited = React.useCallback((cell: Item, newValue: EditableGridCell) => {
        const [col, row] = cell;
        setData(prev => {
            const next = [...prev];
            const r = { ...next[row] };
            switch (col) {
                case 0: r.name = (newValue as { data: string }).data; break;
                case 1: r.company = (newValue as { data: string }).data; break;
                case 2: r.email = (newValue as { data: string }).data; break;
                case 3:
                    if (newValue.kind === GridCellKind.Custom) r.status = (newValue.data as DropdownCell["data"]).value;
                    break;
                case 4:
                    if (newValue.kind === GridCellKind.Custom) r.tags = (newValue.data as TagsCell["data"]).tags.map(t => t.tag);
                    break;
                case 5:
                    if (newValue.kind === GridCellKind.Custom) r.skills = (newValue.data as MultiSelectCell["data"]).values ?? [];
                    break;
                case 6:
                    if (newValue.kind === GridCellKind.Custom) r.notes = (newValue.data as ArticleCell["data"]).markdown;
                    break;
                case 7: r.num = (newValue as { data: number | null }).data ?? 0; break;
                case 8: r.url = (newValue as { data: string }).data; break;
                case 9: r.score = (newValue as { data: number | null }).data ?? 0; break;
            }
            next[row] = r;
            return next;
        });
    }, []);

    return (
        <DataEditor
            {...defaultProps}
            customRenderers={customRenderers}
            getCellContent={getCellContent}
            columns={columns}
            rows={NUM_ROWS}
            onCellEdited={onCellEdited}
            freezeColumns={2}
            freezeTrailingRows={2}
            experimental={{ editorAnchorToCell: "close-on-scroll-out" }}
        />
    );
};
