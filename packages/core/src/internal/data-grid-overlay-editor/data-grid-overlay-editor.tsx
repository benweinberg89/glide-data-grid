import * as React from "react";
import { createPortal } from "react-dom";

import ClickOutsideContainer from "../click-outside-container/click-outside-container.js";
import { makeCSSStyle, type Theme, ThemeContext } from "../../common/styles.js";
import type { GetCellRendererCallback } from "../../cells/cell-types.js";
import {
    type EditableGridCell,
    type GridCell,
    isEditableGridCell,
    isInnerOnlyCell,
    isObjectEditorCallbackResult,
    type Item,
    type ProvideEditorCallback,
    type ProvideEditorCallbackResult,
    type Rectangle,
    type ValidatedGridCell,
} from "../data-grid/data-grid-types.js";

import type { CellActivatedEventArgs } from "../data-grid/event-args.js";
import { DataGridOverlayEditorStyle } from "./data-grid-overlay-editor-style.js";
import type { OverlayImageEditorProps } from "./private/image-overlay-editor.js";
import { useStayOnScreen } from "./use-stay-on-screen.js";

type ImageEditorType = React.ComponentType<OverlayImageEditorProps>;

interface DataGridOverlayEditorProps {
    readonly target: Rectangle;
    readonly cell: Item;
    readonly content: GridCell;
    readonly className?: string;
    readonly id: string;
    readonly initialValue?: string;
    readonly bloom?: readonly [number, number];
    readonly theme: Theme;
    readonly onFinishEditing: (newCell: GridCell | undefined, movement: readonly [-1 | 0 | 1, -1 | 0 | 1]) => void;
    readonly forceEditMode: boolean;
    readonly highlight: boolean;
    readonly portalElementRef?: React.RefObject<HTMLElement>;
    readonly imageEditorOverride?: ImageEditorType;
    readonly getCellRenderer: GetCellRendererCallback;
    readonly markdownDivCreateNode?: (content: string) => DocumentFragment;
    readonly provideEditor?: ProvideEditorCallback<GridCell>;
    readonly activation: CellActivatedEventArgs;
    readonly validateCell?: (
        cell: Item,
        newValue: EditableGridCell,
        prevValue: GridCell
    ) => boolean | ValidatedGridCell;
    readonly isOutsideClick?: (e: MouseEvent | TouchEvent) => boolean;
    readonly customEventTarget?: HTMLElement | Window | Document;
    readonly gridBounds?: DOMRect;
    readonly headerHeight?: number;
    readonly frozenColumnRight?: number;
}

const DataGridOverlayEditor: React.FunctionComponent<DataGridOverlayEditorProps> = p => {
    const {
        target,
        content,
        onFinishEditing: onFinishEditingIn,
        forceEditMode,
        initialValue,
        imageEditorOverride,
        markdownDivCreateNode,
        highlight,
        className,
        theme,
        id,
        cell,
        bloom,
        portalElementRef,
        validateCell,
        getCellRenderer,
        provideEditor,
        isOutsideClick,
        customEventTarget,
        activation,
        gridBounds,
        headerHeight = 0,
        frozenColumnRight,
    } = p;

    const [tempValue, setTempValueRaw] = React.useState<GridCell | undefined>(forceEditMode ? content : undefined);
    const lastValueRef = React.useRef(tempValue ?? content);
    lastValueRef.current = tempValue ?? content;

    const [isValid, setIsValid] = React.useState(() => {
        if (validateCell === undefined) return true;
        return !(isEditableGridCell(content) && validateCell?.(cell, content, lastValueRef.current) === false);
    });

    const onFinishEditing = React.useCallback<typeof onFinishEditingIn>(
        (newCell, movement) => {
            onFinishEditingIn(isValid ? newCell : undefined, movement);
        },
        [isValid, onFinishEditingIn]
    );

    const setTempValue = React.useCallback(
        (newVal: GridCell | undefined) => {
            if (validateCell !== undefined && newVal !== undefined && isEditableGridCell(newVal)) {
                const validResult = validateCell(cell, newVal, lastValueRef.current);
                if (validResult === false) {
                    setIsValid(false);
                } else if (typeof validResult === "object") {
                    newVal = validResult;
                    setIsValid(true);
                } else {
                    setIsValid(true);
                }
            }
            setTempValueRaw(newVal);
        },
        [cell, validateCell]
    );

    const finished = React.useRef(false);
    const customMotion = React.useRef<[-1 | 0 | 1, -1 | 0 | 1] | undefined>(undefined);

    const onClickOutside = React.useCallback(() => {
        onFinishEditing(tempValue, [0, 0]);
        finished.current = true;
    }, [tempValue, onFinishEditing]);

    const onEditorFinished = React.useCallback(
        (newValue: GridCell | undefined, movement?: readonly [-1 | 0 | 1, -1 | 0 | 1]) => {
            onFinishEditing(newValue, movement ?? customMotion.current ?? [0, 0]);
            finished.current = true;
        },
        [onFinishEditing]
    );

    const onKeyDown = React.useCallback(
        async (event: React.KeyboardEvent) => {
            let save = false;
            if (event.key === "Escape") {
                event.stopPropagation();
                event.preventDefault();
                customMotion.current = [0, 0];
            } else if (
                event.key === "Enter" &&
                // The shift key is reserved for multi-line editing
                // to allow inserting new lines without closing the editor.
                !event.shiftKey
            ) {
                event.stopPropagation();
                event.preventDefault();
                customMotion.current = [0, 1];
                save = true;
            } else if (event.key === "Tab") {
                event.stopPropagation();
                event.preventDefault();
                customMotion.current = [event.shiftKey ? -1 : 1, 0];
                save = true;
            }

            window.setTimeout(() => {
                if (!finished.current && customMotion.current !== undefined) {
                    onFinishEditing(save ? tempValue : undefined, customMotion.current);
                    finished.current = true;
                }
            }, 0);
        },
        [onFinishEditing, tempValue]
    );

    const targetValue = tempValue ?? content;

    const [editorProvider, useLabel] = React.useMemo((): [ProvideEditorCallbackResult<GridCell>, boolean] | [] => {
        if (isInnerOnlyCell(content)) return [];
        const cellWithLocation = { ...content, location: cell, activation } as GridCell & {
            location: Item;
            activation: CellActivatedEventArgs;
        };
        const external = provideEditor?.(cellWithLocation);
        if (external !== undefined) return [external, false];
        return [getCellRenderer(content)?.provideEditor?.(cellWithLocation), false];
    }, [cell, content, getCellRenderer, provideEditor, activation]);

    const { ref, style: stayOnScreenStyle } = useStayOnScreen();

    // Flip detection: measure the editor and flip it above the cell when it overflows the grid bottom.
    const editorElRef = React.useRef<HTMLElement | null>(null);
    const [flipped, setFlipped] = React.useState(false);

    const combinedRef = React.useCallback(
        (el: HTMLElement | null) => {
            ref(el);
            editorElRef.current = el;
        },
        [ref]
    );

    React.useLayoutEffect(() => {
        if (gridBounds === undefined || editorElRef.current === null) {
            setFlipped(false);
            return;
        }
        // Use offsetHeight (layout size, unaffected by transforms) so the decision
        // is stable regardless of whether we're currently flipped or not.
        const editorHeight = editorElRef.current.offsetHeight;
        const bloomYVal = bloom?.[1] ?? 1;
        const normalBottom = target.y - bloomYVal + editorHeight;
        const spaceBelow = gridBounds.bottom - (target.y + target.height);
        const spaceAbove = target.y - (gridBounds.top + headerHeight);
        setFlipped(normalBottom > gridBounds.bottom + 1 && spaceAbove > spaceBelow);
    }, [gridBounds, target, headerHeight, bloom]);

    let pad = true;
    let editor: React.ReactNode;
    let style = true;
    let styleOverride: React.CSSProperties | undefined;

    if (editorProvider !== undefined) {
        pad = editorProvider.disablePadding !== true;
        style = editorProvider.disableStyling !== true;
        const isObjectEditor = isObjectEditorCallbackResult(editorProvider);
        if (isObjectEditor) {
            styleOverride = editorProvider.styleOverride;
        }
        const CustomEditor = isObjectEditor ? editorProvider.editor : editorProvider;
        editor = (
            <CustomEditor
                portalElementRef={portalElementRef}
                isHighlighted={highlight}
                activation={activation}
                onChange={setTempValue}
                value={targetValue}
                initialValue={initialValue}
                onFinishedEditing={onEditorFinished}
                validatedSelection={isEditableGridCell(targetValue) ? targetValue.selectionRange : undefined}
                forceEditMode={forceEditMode}
                target={target}
                imageEditorOverride={imageEditorOverride}
                markdownDivCreateNode={markdownDivCreateNode}
                isValid={isValid}
                theme={theme}
            />
        );
    }

    // When scroll-anchoring is active, clip-path handles edge clipping,
    // so skip the stay-on-screen translateX which fights with it.
    if (gridBounds === undefined) {
        styleOverride = { ...styleOverride, ...stayOnScreenStyle };
    }

    // Consider imperatively creating and adding the element to the dom?
    const portalElement = portalElementRef?.current ?? document.getElementById("portal");
    if (portalElement === null) {
        // eslint-disable-next-line no-console
        console.error(
            'Cannot open Data Grid overlay editor, because portal not found. Please, either provide a portalElementRef or add `<div id="portal" />` as the last child of your `<body>`.'
        );
        return null;
    }

    let classWrap = style ? "gdg-style" : "gdg-unstyle";
    if (!isValid) {
        classWrap += " gdg-invalid";
    }

    if (pad) {
        classWrap += " gdg-pad";
    }

    const bloomX = bloom?.[0] ?? 1;
    const bloomY = bloom?.[1] ?? 1;

    const overlayX = target.x - bloomX;
    const normalOverlayY = target.y - bloomY;
    const flippedOverlayY = target.y + target.height + bloomY;
    const overlayY = flipped ? flippedOverlayY : normalOverlayY;

    // When flipped, position the CSS box at the cell bottom and shift it up by its own height
    // via translateY(-100%). Constrain max-height to the space above (down to the data area top).
    let flipStyle: React.CSSProperties | undefined;
    if (flipped && gridBounds !== undefined) {
        const dataTop = gridBounds.top + headerHeight + 1;
        flipStyle = {
            transform: "translateY(-100%)",
            maxHeight: flippedOverlayY - dataTop,
        };
    }

    // Clip the overlay to the grid data area (below the header) so it doesn't spill outside during scroll.
    // Always apply when gridBounds is available — the overlay can be wider/taller than the target cell
    // (e.g. dropdowns, multi-select), so we can't check against target dimensions alone.
    // Raw values can be negative when the overlay is fully inside the grid — negative inset expands
    // the clip region beyond the element, allowing box-shadow/borders to render normally.
    let clipStyle: React.CSSProperties | undefined;
    if (gridBounds !== undefined) {
        const dataTop = gridBounds.top + headerHeight + 1; // +1 for header bottom border pixel
        const effectiveLeft = frozenColumnRight ?? gridBounds.left;
        const clipLeft = effectiveLeft - overlayX;
        const visibleWidth = gridBounds.right - overlayX;

        if (flipped) {
            // With translateY(-100%), clip-path operates on the untransformed box.
            // We compute insets that produce correct visual clipping after the transform.
            const clipTop = `calc(100% - ${flippedOverlayY - dataTop}px)`;
            const clipBottom = flippedOverlayY - gridBounds.bottom;
            clipStyle = {
                clipPath: `inset(${clipTop} calc(100% - ${visibleWidth}px) ${clipBottom}px ${clipLeft}px)`,
            };
        } else {
            const clipTop = dataTop - overlayY;
            const visibleHeight = gridBounds.bottom - overlayY;
            clipStyle = {
                clipPath: `inset(${clipTop}px calc(100% - ${visibleWidth}px) calc(100% - ${visibleHeight}px) ${clipLeft}px)`,
            };
        }
    }

    return createPortal(
        <ThemeContext.Provider value={theme}>
            <ClickOutsideContainer
                style={makeCSSStyle(theme)}
                className={className}
                onClickOutside={onClickOutside}
                isOutsideClick={isOutsideClick}
                customEventTarget={customEventTarget}>
                <DataGridOverlayEditorStyle
                    ref={combinedRef}
                    id={id}
                    className={classWrap}
                    style={{...styleOverride, ...clipStyle, ...flipStyle}}
                    as={useLabel === true ? "label" : undefined}
                    targetX={overlayX}
                    targetY={overlayY}
                    targetWidth={target.width + bloomX * 2}
                    targetHeight={target.height + bloomY * 2}>
                    <div className="gdg-clip-region" onKeyDown={onKeyDown}>
                        {editor}
                    </div>
                </DataGridOverlayEditorStyle>
            </ClickOutsideContainer>
        </ThemeContext.Provider>,
        portalElement
    );
};

export default DataGridOverlayEditor;
