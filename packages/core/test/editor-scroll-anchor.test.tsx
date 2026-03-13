/* eslint-disable sonarjs/no-duplicate-string */
import * as React from "react";
import { render, screen, act } from "@testing-library/react";
import { DataEditor, type DataEditorRef } from "../src/index.js";
import { vi, expect, describe, test, beforeEach, afterEach } from "vitest";
import {
    EventedDataEditor,
    basicProps,
    prep,
    sendClick,
    Context,
    standardBeforeEach,
    standardAfterEach,
} from "./test-utils.js";

describe("editor-scroll-anchor", () => {
    vi.mock("../src/common/resize-detector", () => {
        return {
            useResizeDetector: () => ({ ref: undefined, width: 1000, height: 1000 }),
        };
    });

    beforeEach(() => {
        standardBeforeEach();
    });

    afterEach(() => {
        vi.useRealTimers();
        standardAfterEach();
    });

    test("Editor opens with editorAnchorToCell close-on-scroll-out", async () => {
        vi.useFakeTimers();
        render(
            <EventedDataEditor
                {...basicProps}
                experimental={{ editorAnchorToCell: "close-on-scroll-out" }}
            />,
            { wrapper: Context }
        );
        prep();

        const canvas = screen.getByTestId("data-grid-canvas");
        sendClick(canvas, { clientX: 230, clientY: 84 });
        sendClick(canvas, { clientX: 230, clientY: 84 });

        await act(() => new Promise(r => window.setTimeout(r, 500)));

        const overlay = screen.getByDisplayValue("Data: 1, 1");
        expect(document.body.contains(overlay)).toBe(true);
    });

    test("Editor opens with freezeColumns and editorAnchorToCell", async () => {
        vi.useFakeTimers();
        render(
            <EventedDataEditor
                {...basicProps}
                freezeColumns={2}
                experimental={{ editorAnchorToCell: "close-on-scroll-out" }}
            />,
            { wrapper: Context }
        );
        prep();

        const canvas = screen.getByTestId("data-grid-canvas");
        sendClick(canvas, { clientX: 230, clientY: 84 });
        sendClick(canvas, { clientX: 230, clientY: 84 });

        await act(() => new Promise(r => window.setTimeout(r, 500)));

        const overlay = screen.getByDisplayValue("Data: 1, 1");
        expect(document.body.contains(overlay)).toBe(true);
    });

    test("Editor opens with freezeTrailingRows and editorAnchorToCell", async () => {
        vi.useFakeTimers();
        render(
            <EventedDataEditor
                {...basicProps}
                freezeTrailingRows={2}
                experimental={{ editorAnchorToCell: "close-on-scroll-out" }}
            />,
            { wrapper: Context }
        );
        prep();

        const canvas = screen.getByTestId("data-grid-canvas");
        sendClick(canvas, { clientX: 230, clientY: 84 });
        sendClick(canvas, { clientX: 230, clientY: 84 });

        await act(() => new Promise(r => window.setTimeout(r, 500)));

        const overlay = screen.getByDisplayValue("Data: 1, 1");
        expect(document.body.contains(overlay)).toBe(true);
    });

    test("Editor survives column resize with editorAnchorToCell", async () => {
        let setBigColumns: () => void;

        function ResizeTestWrapper() {
            const [cols, setCols] = React.useState(basicProps.columns);
            setBigColumns = () => {
                setCols(prev =>
                    prev.map((c, i) => (i === 1 ? { ...c, width: 300 } : c))
                );
            };
            return (
                <DataEditor
                    {...basicProps}
                    columns={cols}
                    experimental={{ editorAnchorToCell: true }}
                />
            );
        }

        vi.useFakeTimers();
        render(<ResizeTestWrapper />, { wrapper: Context });
        prep();

        const canvas = screen.getByTestId("data-grid-canvas");
        sendClick(canvas, { clientX: 230, clientY: 84 });
        sendClick(canvas, { clientX: 230, clientY: 84 });

        await act(() => new Promise(r => window.setTimeout(r, 500)));

        const overlay = screen.getByDisplayValue("Data: 1, 1");
        expect(document.body.contains(overlay)).toBe(true);

        vi.useFakeTimers();
        act(() => {
            setBigColumns!();
        });
        act(() => {
            vi.runAllTimers();
        });

        // Editor should survive column resize
        expect(document.body.contains(overlay)).toBe(true);
    });
});
