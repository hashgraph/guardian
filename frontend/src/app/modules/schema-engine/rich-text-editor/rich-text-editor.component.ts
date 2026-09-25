import {
    Component,
    OnDestroy,
    Input,
    forwardRef,
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    AfterViewInit,
    ElementRef,
    ViewChild
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { isBlankRichText, isSafeHref, sanitizeRichText } from './rich-text-sanitizer';
import { escapeHtml, htmlToMarkdown, markdownToHtml } from './markdown';

@Component({
    selector: 'app-rich-text-editor',
    templateUrl: './rich-text-editor.component.html',
    styleUrls: ['./rich-text-editor.component.scss'],
    standalone: false,
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => RichTextEditorComponent),
            multi: true,
        },
    ],
})
export class RichTextEditorComponent
    implements AfterViewInit, OnDestroy, ControlValueAccessor
{
    @ViewChild('editor', { static: false }) editorRef!: ElementRef<HTMLDivElement>;
    @ViewChild('linkInput', { static: false }) linkInputRef?: ElementRef<HTMLInputElement>;
    @ViewChild('imageInput', { static: false }) imageInputRef?: ElementRef<HTMLInputElement>;

    @Input() placeholder = 'Enter text here…';
    @Input() readonly = false;
    @Input() imageUploader?: (file: File) => Promise<string>;
    @Input() imageResolver?: (reference: string) => Promise<string>;

    public showLinkDialog = false;
    public linkUrl = '';
    public isDisabled = false;
    public imageError = '';
    public imageLoading = false;
    public linkDialogPosition = { left: 8, top: 48 };
    public showTableToolbar = false;
    public tableToolbarPosition = { left: 8, top: 8 };
    public showTableSizePicker = false;
    public tableSizePosition = { left: 8, top: 48 };
    public tableSizeRows = 0;
    public tableSizeColumns = 0;
    public headingDisabled = false;
    public listLevelDisabled = true;
    public listOutdentDisabled = true;
    public tableEditDisabled = true;
    public inTableCell = false;
    public undoDisabled = false;
    public redoDisabled = false;
    public activeCommands = new Set<string>();

    private _value = '';
    private _onChange: (value: string) => void = () => {};
    private _onTouched: () => void = () => {};
    private _savedRange: Range | null = null;
    private _editingLink: HTMLAnchorElement | null = null;
    private _draggingFromEditor = false;
    private _resolvedImages = new Map<string, string>();
    private _tableSizeOpenedBy: MouseEvent | null = null;
    private _htmlBeforeInput = '';
    private _clearedHtml = '';

    private static readonly IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
    private static readonly MAX_IMAGE_SIDE = 1600;
    private static readonly MAX_IMAGE_BYTES = 512 * 1024;
    private _onSelectionChange = (): void => this._updateToolbarState();
    private _onDocumentMouseDown = (event: MouseEvent): void => {
        const target = event.target;
        const inside = target instanceof Node && this.host.nativeElement.contains(target);
        if (this.imageError && !this._isImageErrorTarget(target)) {
            this.imageError = '';
            this.cdr.markForCheck();
        }
        if (this.showTableSizePicker
            && event !== this._tableSizeOpenedBy
            && !(target instanceof Element && target.closest('.rte-table-picker'))) {
            this.cancelTableSize();
        }
        if (!this.showLinkDialog) { return; }
        if (inside) { return; }
        this.cancelLink();
        this.cdr.markForCheck();
    };

    public readonly toolbarItems = [
        { command: 'undo', icon: 'pi pi-undo', title: 'Undo (Ctrl+Z)' },
        { command: 'redo', icon: 'pi pi-refresh', title: 'Redo (Ctrl+Shift+Z)' },
        { separator: true },
        { command: 'bold', icon: null, label: 'B', title: 'Bold (Ctrl+B)' },
        { command: 'italic', icon: null, label: 'I', title: 'Italic (Ctrl+I)' },
        { separator: true },
        { command: 'insertUnorderedList', icon: 'pi pi-list', title: 'Bullet list' },
        { command: 'insertOrderedList', icon: 'pi pi-list-check', title: 'Numbered list' },
        { command: 'outdent', icon: 'pi pi-angle-double-left', title: 'Decrease list level' },
        { command: 'indent', icon: 'pi pi-angle-double-right', title: 'Increase list level' },
        { separator: true },
        { command: 'h1', icon: null, label: 'H1', title: 'Heading 1' },
        { command: 'h2', icon: null, label: 'H2', title: 'Heading 2' },
        { command: 'h3', icon: null, label: 'H3', title: 'Heading 3' },
        { separator: true },
        { command: 'link', icon: 'pi pi-link', title: 'Insert or edit link' },
        { command: 'image', icon: 'pi pi-image', title: 'Insert image' },
        { separator: true },
        { command: 'table', icon: 'pi pi-table', title: 'Insert table' },
    ];

    public readonly tableToolbarItems = [
        { command: 'tableRowAdd', icon: 'pi pi-plus-circle', title: 'Add a row below' },
        { command: 'tableRowRemove', icon: 'pi pi-minus-circle', title: 'Remove this row' },
        { command: 'tableColumnAdd', icon: 'pi pi-plus', title: 'Add a column to the right' },
        { command: 'tableColumnRemove', icon: 'pi pi-minus', title: 'Remove this column' },
    ];

    public readonly tableSizeRowOptions = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    public readonly tableSizeColumnOptions = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

    private static readonly FRESH_TABLE_MARK = 'data-rte-fresh';
    private static readonly TABLE_PICKER_WIDTH = 200;
    private static readonly TABLE_TOOLBAR_HEIGHT = 38;
    private static readonly TABLE_TOOLBAR_WIDTH = 160;

    private static readonly TABLE_EDIT_COMMANDS = [
        'tableRowAdd', 'tableRowRemove', 'tableColumnAdd', 'tableColumnRemove'
    ];

    isCommandHidden(command: string | undefined): boolean {
        return command === 'image' && !this.imageUploader;
    }

    constructor(private cdr: ChangeDetectorRef, private host: ElementRef<HTMLElement>) {}

    ngAfterViewInit(): void {
        if (this.editorRef) {
            this._setEditorContent(this._toEditorHtml(this._value));
        }
        document.addEventListener('selectionchange', this._onSelectionChange);
        document.addEventListener('mousedown', this._onDocumentMouseDown);
    }

    ngOnDestroy(): void {
        document.removeEventListener('selectionchange', this._onSelectionChange);
        document.removeEventListener('mousedown', this._onDocumentMouseDown);
    }

    writeValue(value: string | null): void {
        this._value = value ?? '';
        if (this.showLinkDialog) {
            this.cancelLink();
        }
        if (this.editorRef) {
            this._setEditorContent(this._toEditorHtml(this._value));
        }
    }

    registerOnChange(fn: (value: string) => void): void {
        this._onChange = fn;
    }

    registerOnTouched(fn: () => void): void {
        this._onTouched = fn;
    }

    setDisabledState(isDisabled: boolean): void {
        this.isDisabled = isDisabled;
        this.cdr.markForCheck();
    }

    onBeforeInput(): void {
        this._htmlBeforeInput = this.editorRef?.nativeElement.innerHTML || '';
    }

    onInput(event?: Event): void {
        this._clearedHtml = '';
        if (this._isDeletionEvent(event)) {
            this._clearEmptyFormatting();
        }
        const html = this.editorRef.nativeElement.innerHTML;
        const value = isBlankRichText(html) ? '' : htmlToMarkdown(html);
        this._value = value;
        this._onChange(value);
        this._updateHistoryState();
        this.cdr.markForCheck();
    }

    onPaste(event: ClipboardEvent): void {
        if (this.readonly || this.isDisabled) { return; }
        const clipboard = event.clipboardData;
        if (!clipboard) { return; }
        event.preventDefault();
        const image = this.imageUploader ? this._imageFileFrom(clipboard.files) : null;
        const html = clipboard.getData('text/html');
        const clean = html
            ? sanitizeRichText(html)
            : escapeText(clipboard.getData('text/plain'));
        if (clean && !(image && isBlankRichText(clean))) {
            document.execCommand('insertHTML', false, clean);
            this.onInput();
        }
        if (image) {
            this._savedRange = this._getSelection();
            this._uploadAndInsertImage(image);
        }
    }

    onDragStart(): void {
        this._draggingFromEditor = true;
    }

    onDragEnd(): void {
        this._draggingFromEditor = false;
    }

    onDragOver(event: DragEvent): void {
        if (this.readonly || this.isDisabled) { return; }
        if (this._draggingFromEditor) { return; }
        event.preventDefault();
    }

    onDrop(event: DragEvent): void {
        if (this.readonly || this.isDisabled) { return; }
        if (this._draggingFromEditor) {
            this._draggingFromEditor = false;
            return;
        }
        const transfer = event.dataTransfer;
        if (!transfer) { return; }
        event.preventDefault();
        const image = this.imageUploader ? this._imageFileFrom(transfer.files) : null;
        if (image) {
            this.editorRef.nativeElement.focus();
            this._placeCaretFromPoint(event);
            this._savedRange = this._getSelection();
            this._uploadAndInsertImage(image);
            return;
        }
        const html = transfer.getData('text/html');
        const clean = html
            ? sanitizeRichText(html)
            : escapeText(transfer.getData('text/plain'));
        if (!clean) { return; }
        this.editorRef.nativeElement.focus();
        this._placeCaretFromPoint(event);
        document.execCommand('insertHTML', false, clean);
        this.onInput();
    }

    onKeyDown(event: KeyboardEvent): void {
        if (this.readonly || this.isDisabled) { return; }
        if (event.key === 'Backspace') {
            const table = this._tableBeforeCaret();
            if (table) {
                event.preventDefault();
                this._removeTable(table);
            }
            return;
        }
        if (event.key !== 'Tab') { return; }
        const cell = this._currentTableCell();
        if (!cell) { return; }
        event.preventDefault();
        const table = cell.closest('table');
        const cells = Array.from(table ? table.querySelectorAll('th, td') : []);
        const step = event.shiftKey ? -1 : 1;
        const next = cells[cells.indexOf(cell) + step];
        if (next) {
            this._placeCaretIn(next);
            return;
        }
        if (step === 1 && this._applyTableEdit('tableRowAdd')) {
            this.onInput();
            this._updateToolbarState();
            this.cdr.markForCheck();
        }
    }

    onBlur(): void {
        this._onTouched();
    }

    private _toggleList(command: string): void {
        const depth = this._listDepth(command === 'insertUnorderedList' ? 'UL' : 'OL');
        document.execCommand(command, false, undefined);
        for (let level = 1; level < depth; level++) {
            document.execCommand(command, false, undefined);
        }
    }

    private _listNesting(): number {
        return this._listDepth('UL') + this._listDepth('OL');
    }

    private _listDepth(tag: string): number {
        const range = this._getSelection();
        const editor = this.editorRef?.nativeElement;
        if (!range || !editor) { return 0; }
        const node = range.startContainer;
        let element: Element | null = node instanceof Element ? node : node.parentElement;
        if (!element || !editor.contains(element) || !element.closest('li')) { return 0; }
        let depth = 0;
        while (element && element !== editor) {
            if (element.tagName === tag) { depth++; }
            element = element.parentElement;
        }
        return depth;
    }

    private _collapseTableSelection(): void {
        const selection = window.getSelection();
        const range = selection && selection.rangeCount ? selection.getRangeAt(0) : null;
        if (!range || range.collapsed) { return; }
        const node = range.commonAncestorContainer;
        const element = node instanceof Element ? node : node.parentElement;
        const table = element?.closest('table') || element?.querySelector('table');
        if (!table) { return; }
        this._placeCaretIn(table.querySelector('th, td'));
    }

    private _mergeSiblingLists(): void {
        const editor = this.editorRef?.nativeElement;
        if (!editor) { return; }
        for (const list of Array.from(editor.querySelectorAll('ul, ol'))) {
            let next = list.nextElementSibling;
            while (next && next.tagName === list.tagName) {
                while (next.firstChild) {
                    list.appendChild(next.firstChild);
                }
                const empty = next;
                next = next.nextElementSibling;
                empty.remove();
            }
        }
    }

    private _tableBeforeCaret(): HTMLTableElement | null {
        const range = this._getSelection();
        const editor = this.editorRef?.nativeElement;
        if (!range || !editor || !editor.contains(range.commonAncestorContainer)) { return null; }
        if (!range.collapsed) {
            const selected = range.commonAncestorContainer;
            const table = selected instanceof Element
                ? selected.closest('table')
                : selected.parentElement?.closest('table');
            return table && range.toString() === table.textContent ? table as HTMLTableElement : null;
        }
        if (this._currentTableCell()) { return null; }
        const previous = this._elementBeforeCaret(range, editor);
        return previous instanceof HTMLTableElement ? previous : null;
    }

    private _elementBeforeCaret(range: Range, editor: HTMLElement): Element | null {
        const start = range.startContainer;
        if (!(start instanceof Element) && range.startOffset > 0) { return null; }
        let previous: Node | null = start instanceof Element
            ? start.childNodes[range.startOffset - 1] || null
            : null;
        let node: Node | null = start;
        while (!previous && node && node !== editor) {
            previous = node.previousSibling;
            node = node.parentNode;
        }
        while (previous && !(previous instanceof Element)) {
            if (previous.textContent) { return null; }
            previous = previous.previousSibling;
        }
        return previous instanceof Element && editor.contains(previous) ? previous : null;
    }

    private _caretBlock(range: Range, editor: HTMLElement): Element | null {
        const node = range.startContainer;
        const element = node instanceof Element ? node : node.parentElement;
        if (!element || element === editor || !editor.contains(element)) { return null; }
        let block: Element = element;
        while (block.parentElement && block.parentElement !== editor) {
            block = block.parentElement;
        }
        return block.parentElement === editor ? block : null;
    }

    private _removeTable(table: HTMLTableElement): void {
        const range = document.createRange();
        range.selectNode(table);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
        document.execCommand('delete');
        this.onInput();
        this._updateToolbarState();
        this.cdr.markForCheck();
    }

    get isEmpty(): boolean {
        return isBlankRichText(this._value);
    }

    get isEditingLink(): boolean {
        return !!this._editingLink;
    }

    isHeadingCommand(command: string | undefined): boolean {
        return !!command && ['h1', 'h2', 'h3'].includes(command);
    }

    isListLevelCommand(command: string | undefined): boolean {
        return command === 'indent' || command === 'outdent';
    }

    isListCommand(command: string | undefined): boolean {
        return command === 'insertUnorderedList' || command === 'insertOrderedList';
    }

    isBlockedInTable(command: string | undefined): boolean {
        return this.isListCommand(command)
            || this.isListLevelCommand(command)
            || this.isHeadingCommand(command)
            || command === 'image'
            || command === 'table';
    }

    isTableEditCommand(command: string | undefined): boolean {
        return !!command && RichTextEditorComponent.TABLE_EDIT_COMMANDS.includes(command);
    }

    isCommandDisabled(command: string | undefined): boolean {
        return (this.headingDisabled && this.isHeadingCommand(command))
            || (this.listLevelDisabled && this.isListLevelCommand(command))
            || (this.listOutdentDisabled && command === 'outdent')
            || (this.inTableCell && this.isBlockedInTable(command))
            || (this.undoDisabled && command === 'undo')
            || (this.redoDisabled && command === 'redo')
            || (this.tableEditDisabled && this.isTableEditCommand(command))
            || (command === 'image' && this.imageLoading);
    }

    isCommandActive(command: string | undefined): boolean {
        return !!command && !this.isCommandDisabled(command) && this.activeCommands.has(command);
    }

    commandTitle(command: string | undefined, title: string): string {
        if (!this.isCommandDisabled(command)) {
            return title;
        }
        if (command === 'undo') { return 'Nothing to undo'; }
        if (command === 'redo') { return 'Nothing to redo'; }
        if (this.inTableCell && this.isBlockedInTable(command)) {
            if (command === 'image') { return 'Pictures are not available inside a table'; }
            if (command === 'table') { return 'A table cannot go inside another table'; }
            if (this.isHeadingCommand(command)) { return 'Headings are not available inside a table'; }
            return 'Lists are not available inside a table';
        }
        if (this.isListLevelCommand(command)) {
            return this.listLevelDisabled
                ? 'List levels are only available inside a list'
                : 'This item is already at the top level';
        }
        if (this.isTableEditCommand(command)) {
            return 'Table changes are only available inside a table';
        }
        return 'Headings are not available inside a list';
    }

    execCommand(command: string, event: MouseEvent): void {
        event.preventDefault();
        if (this.readonly || this.isDisabled) { return; }
        this.editorRef.nativeElement.focus();
        if (this.isHeadingCommand(command)) {
            if (this.inTableCell) { return; }
            if (this._isInListItem(this._getSelection())) { return; }
            document.execCommand('formatBlock', false, this._nextBlockFormat(command));
        } else if (this.isListLevelCommand(command)) {
            if (this.inTableCell) { return; }
            if (!this._isInListItem(this._getSelection())) { return; }
            if (command === 'outdent' && this._listNesting() < 2) { return; }
            document.execCommand(command, false, undefined);
        } else if (this.isListCommand(command)) {
            if (this.inTableCell) { return; }
            this._toggleList(command);
        } else if (command === 'undo' && this._clearedHtml) {
            this._restoreClearedHtml();
        } else if (command === 'table') {
            if (this.inTableCell) { return; }
            this._savedRange = this._getSelection();
            this._setTableSizePosition(event);
            this.tableSizeRows = 0;
            this.tableSizeColumns = 0;
            this._tableSizeOpenedBy = event;
            this.showTableSizePicker = true;
            this.cdr.markForCheck();
            return;
        } else if (this.isTableEditCommand(command)) {
            if (!this._applyTableEdit(command)) { return; }
        } else if (command === 'link') {
            this._savedRange = this._getSelection();
            this._editingLink = this._getLink(this._savedRange);
            this._setLinkDialogPosition(this._editingLink);
            this.showLinkDialog = true;
            this.linkUrl = this._editingLink?.getAttribute('href') || '';
            this.cdr.detectChanges();
            const input = this.linkInputRef?.nativeElement;
            input?.focus();
            input?.select();
            return;
        } else if (command === 'image') {
            if (this.inTableCell) { return; }
            this._savedRange = this._getSelection();
            this.imageError = '';
            this.imageInputRef?.nativeElement.click();
            return;
        } else {
            document.execCommand(command, false, undefined);
            if (command === 'undo' || command === 'redo') {
                this._collapseTableSelection();
            }
        }
        this._mergeSiblingLists();
        this.onInput();
        this._updateToolbarState();
        this.cdr.markForCheck();
    }

    insertLink(): void {
        if (!this.linkUrl.trim()) {
            if (this._editingLink) {
                this.removeLink();
                return;
            }
            this.showLinkDialog = false;
            return;
        }
        this.editorRef.nativeElement.focus();
        if (this._savedRange) {
            const sel = window.getSelection();
            if (sel) {
                sel.removeAllRanges();
                sel.addRange(this._savedRange);
            }
        }
        const typed = this.linkUrl.trim();
        const url = /^[a-z][a-z0-9+.-]*:/i.test(typed) ? typed : 'https://' + typed;
        if (!isSafeHref(url)) {
            this.cancelLink();
            this.cdr.markForCheck();
            return;
        }
        if (this._editingLink) {
            this._setLinkAttributes(this._editingLink, url);
        } else {
            const existingLinks = new Set(this.editorRef.nativeElement.querySelectorAll('a'));
            document.execCommand('createLink', false, url);
            const link = this._getLink(this._getSelection()) ||
                Array.from(this.editorRef.nativeElement.querySelectorAll('a'))
                    .find(item => !existingLinks.has(item));
            if (link) {
                this._setLinkAttributes(link, url);
            }
        }
        this.showLinkDialog = false;
        this.linkUrl = '';
        this._savedRange = null;
        this._editingLink = null;
        this.onInput();
        this.cdr.markForCheck();
    }

    removeLink(): void {
        const link = this._editingLink;
        if (link) {
            link.replaceWith(...Array.from(link.childNodes));
            this.onInput();
        }
        this.cancelLink();
        this.cdr.markForCheck();
    }

    private _isImageErrorTarget(target: EventTarget | null): boolean {
        return target instanceof Element && !!target.closest('.rte-image-error');
    }

    onEditorClick(event: MouseEvent): void {
        const target = event.target;
        if (!(target instanceof Element)) { return; }
        const link = target.closest('a');
        const href = link?.getAttribute('href') || '';
        if (!href || !isSafeHref(href)) { return; }
        if (!this.readonly && !this.isDisabled && !event.ctrlKey && !event.metaKey) { return; }
        event.preventDefault();
        window.open(href, '_blank', 'noopener,noreferrer');
    }

    cancelLink(): void {
        this.showLinkDialog = false;
        this.linkUrl = '';
        this._savedRange = null;
        this._editingLink = null;
    }

    private _toEditorHtml(value: string): string {
        return markdownToHtml(value);
    }

    private _setEditorContent(value: string): void {
        const el = this.editorRef?.nativeElement;
        if (!el) { return; }
        if (el.innerHTML !== value) {
            el.innerHTML = value;
        }
        this._resolveImages();
        this._updateToolbarState();
    }

    async onImageSelected(event: Event): Promise<void> {
        const input = event.target instanceof HTMLInputElement ? event.target : null;
        const file = input?.files?.[0];
        if (input) { input.value = ''; }
        if (!file) { return; }
        await this._uploadAndInsertImage(file);
    }

    private _imageFileFrom(files: FileList | null | undefined): File | null {
        const list = files ? Array.from(files) : [];
        return list.find(file => file.type.startsWith('image/')) || null;
    }

    private _rejectUnsupportedImage(file: File): void {
        this.imageError = `${file.name} is not a supported image. Use PNG, JPEG or WebP.`;
        this.cdr.markForCheck();
    }

    private async _uploadAndInsertImage(file: File): Promise<void> {
        if (!this.imageUploader) { return; }
        if (this.inTableCell) {
            this.imageError = 'Pictures are not available inside a table';
            this.cdr.markForCheck();
            return;
        }

        if (!RichTextEditorComponent.IMAGE_TYPES.includes(file.type)) {
            this._rejectUnsupportedImage(file);
            return;
        }

        this.imageLoading = true;
        this.cdr.markForCheck();
        try {
            const prepared = await this._prepareImage(file);
            if (!prepared) {
                this._rejectUnsupportedImage(file);
                return;
            }
            if (prepared.size > RichTextEditorComponent.MAX_IMAGE_BYTES) {
                const got = this._formatBytes(prepared.size);
                const limit = this._formatBytes(RichTextEditorComponent.MAX_IMAGE_BYTES);
                this.imageError = `${file.name} is still ${got} after compression, and the limit is ${limit}. `
                    + 'Use a smaller image, or crop it.';
                return;
            }
            const reference = await this.imageUploader(prepared);
            const dataUrl = await this._readAsDataUrl(prepared);
            this._resolvedImages.set(reference, dataUrl);
            this._insertImage(reference, dataUrl, file.name);
        } catch (error) {
            this.imageError = `${file.name} could not be uploaded. Check the connection and try again.`;
        } finally {
            this.imageLoading = false;
            this.cdr.markForCheck();
        }
    }

    private _insertImage(reference: string, dataUrl: string, alt: string): void {
        this.editorRef.nativeElement.focus();
        this._restoreRange(this._savedRange);
        const html = `<img src="${dataUrl}" data-src="${reference}" alt="${escapeHtml(alt)}">`;
        document.execCommand('insertHTML', false, html);
        this.onInput();
        this._updateToolbarState();
    }

    private async _resolveImages(): Promise<void> {
        const resolver = this.imageResolver;
        const el = this.editorRef?.nativeElement;
        if (!resolver || !el) { return; }

        const pending = Array.from(el.querySelectorAll('img[data-src]'))
            .filter(image => !!image.getAttribute('data-src') && !image.getAttribute('src'));
        if (!pending.length) { return; }

        const references = new Set(pending.map(image => image.getAttribute('data-src') || ''));
        await Promise.all(Array.from(references).map(async (reference) => {
            if (this._resolvedImages.has(reference)) { return; }
            try {
                this._resolvedImages.set(reference, await resolver(reference));
            } catch (error) {
                return;
            }
        }));

        for (const image of pending) {
            const resolved = this._resolvedImages.get(image.getAttribute('data-src') || '');
            if (resolved) {
                image.setAttribute('src', resolved);
            }
        }
        this.cdr.markForCheck();
    }

    private _restoreRange(range: Range | null): void {
        if (!range) { return; }
        const selection = window.getSelection();
        if (!selection) { return; }
        selection.removeAllRanges();
        selection.addRange(range);
    }

    private async _prepareImage(file: File): Promise<File | null> {
        let bitmap: ImageBitmap;
        try {
            bitmap = await createImageBitmap(file);
        } catch (error) {
            return null;
        }
        const side = RichTextEditorComponent.MAX_IMAGE_SIDE;
        const scale = Math.min(1, side / Math.max(bitmap.width, bitmap.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(bitmap.width * scale);
        canvas.height = Math.round(bitmap.height * scale);
        const context = canvas.getContext('2d');
        if (!context) { return file; }
        context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        const blob = await new Promise<Blob | null>(resolve =>
            canvas.toBlob(resolve, 'image/webp', 0.8)
        );
        if (!blob) { return file; }
        return new File([blob], `${file.name.replace(/\.[^.]+$/, '')}.webp`, { type: blob.type });
    }

    private _formatBytes(bytes: number): string {
        return bytes >= 1024 * 1024
            ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
            : `${Math.round(bytes / 1024)} KB`;
    }

    private _readAsDataUrl(file: File): Promise<string> {
        return new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result || ''));
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(file);
        });
    }

    private _isDeletionEvent(event?: Event): boolean {
        return event instanceof InputEvent
            && typeof event.inputType === 'string'
            && event.inputType.startsWith('delete');
    }

    private _clearEmptyFormatting(): void {
        const el = this.editorRef?.nativeElement;
        if (!el || !el.innerHTML || !isBlankRichText(el.innerHTML)) { return; }
        this._clearedHtml = this._htmlBeforeInput;
        el.innerHTML = '';
        this._collapseCaret(el, true);
        this._updateToolbarState();
    }

    private _restoreClearedHtml(): void {
        const el = this.editorRef.nativeElement;
        el.innerHTML = this._clearedHtml;
        this._clearedHtml = '';
        this._collapseCaret(el, false);
    }

    private _collapseCaret(el: HTMLElement, toStart: boolean): void {
        const range = document.createRange();
        range.selectNodeContents(el);
        range.collapse(toStart);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
    }

    private _currentTableCell(): HTMLTableCellElement | null {
        const range = this._getSelection();
        if (!range) { return null; }
        const node = range.commonAncestorContainer;
        const element = node instanceof Element ? node : node.parentElement;
        const cell = element?.closest('th, td');
        return cell instanceof HTMLTableCellElement && this.editorRef.nativeElement.contains(cell)
            ? cell
            : null;
    }

    private _emptyCell(tag: string): HTMLElement {
        const cell = document.createElement(tag);
        cell.appendChild(document.createElement('br'));
        return cell;
    }

    private _applyTableEdit(command: string): boolean {
        const cell = this._currentTableCell();
        const row = cell?.parentElement;
        const table = cell?.closest('table');
        if (!cell || !row || !table) { return false; }
        const rowIndex = Array.from(table.querySelectorAll('tr')).indexOf(row as HTMLTableRowElement);
        const columnIndex = Array.from(row.children).indexOf(cell);

        const clone = table.cloneNode(true) as HTMLTableElement;
        const caret = this._editTableCopy(clone, rowIndex, columnIndex, command);
        if (!caret) { return false; }
        this._replaceTable(table, clone, caret);
        return true;
    }

    private _editTableCopy(
        table: HTMLTableElement,
        rowIndex: number,
        columnIndex: number,
        command: string
    ): { row: number, column: number } | null {
        const rows = Array.from(table.querySelectorAll('tr'));
        const row = rows[rowIndex];
        if (!row) { return null; }
        const isHeaderRow = row.parentElement?.tagName === 'THEAD';
        if (command === 'tableRowAdd') {
            const fresh = document.createElement('tr');
            for (let index = 0; index < row.children.length; index++) {
                fresh.appendChild(this._emptyCell('td'));
            }
            if (isHeaderRow) {
                const body = table.querySelector('tbody')
                    || table.appendChild(document.createElement('tbody'));
                body.insertBefore(fresh, body.firstChild);
            } else {
                row.after(fresh);
            }
            return { row: Array.from(table.querySelectorAll('tr')).indexOf(fresh), column: 0 };
        }
        if (command === 'tableRowRemove') {
            if (isHeaderRow) { return null; }
            const survivor = row.nextElementSibling || row.previousElementSibling
                || table.querySelector('thead tr');
            if (!survivor) { return null; }
            row.remove();
            return {
                row: Array.from(table.querySelectorAll('tr')).indexOf(survivor as HTMLTableRowElement),
                column: Math.min(columnIndex, survivor.children.length - 1),
            };
        }
        if (command === 'tableColumnAdd') {
            for (const current of rows) {
                const created = this._emptyCell(current.parentElement?.tagName === 'THEAD' ? 'th' : 'td');
                const reference = current.children[columnIndex];
                if (reference) {
                    reference.after(created);
                } else {
                    current.appendChild(created);
                }
            }
            return { row: rowIndex, column: columnIndex + 1 };
        }
        if (command === 'tableColumnRemove') {
            if (row.children.length < 2) { return null; }
            for (const current of rows) {
                current.children[columnIndex]?.remove();
            }
            return { row: rowIndex, column: Math.min(columnIndex, row.children.length - 1) };
        }
        return null;
    }

    private _replaceTable(
        table: HTMLTableElement,
        replacement: HTMLTableElement,
        caret: { row: number, column: number }
    ): void {
        replacement.setAttribute(RichTextEditorComponent.FRESH_TABLE_MARK, '');
        const range = document.createRange();
        range.selectNode(table);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
        document.execCommand('insertHTML', false, replacement.outerHTML);
        const editor = this.editorRef.nativeElement;
        const fresh = editor.querySelector(`table[${RichTextEditorComponent.FRESH_TABLE_MARK}]`);
        if (!fresh) { return; }
        fresh.removeAttribute(RichTextEditorComponent.FRESH_TABLE_MARK);
        const rows = Array.from(fresh.querySelectorAll('tr'));
        const target = rows[caret.row]?.children[caret.column];
        this._placeCaretIn(target);
        if (target instanceof HTMLElement) {
            target.scrollIntoView({ block: 'nearest', inline: 'nearest' });
        }
    }

    private _placeCaretIn(target: Element | null | undefined): void {
        if (target instanceof HTMLElement) {
            this._collapseCaret(target, true);
        }
    }

    private _getSelection(): Range | null {
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) {
            return sel.getRangeAt(0).cloneRange();
        }
        return null;
    }

    private _placeCaretFromPoint(event: DragEvent): void {
        const range = this._rangeFromPoint(event.clientX, event.clientY);
        if (!range || !this.editorRef.nativeElement.contains(range.commonAncestorContainer)) {
            return;
        }
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
    }

    private _rangeFromPoint(x: number, y: number): Range | null {
        if (typeof document.caretRangeFromPoint === 'function') {
            return document.caretRangeFromPoint(x, y);
        }
        if (typeof document.caretPositionFromPoint === 'function') {
            const position = document.caretPositionFromPoint(x, y);
            if (!position) {
                return null;
            }
            const range = document.createRange();
            range.setStart(position.offsetNode, position.offset);
            range.collapse(true);
            return range;
        }
        return null;
    }

    private _updateToolbarState(): void {
        if (!this.editorRef) { return; }
        const range = this._getSelection();
        const disabled = this._isInListItem(range);
        if (disabled !== this.headingDisabled) {
            this.headingDisabled = disabled;
            this.cdr.markForCheck();
        }
        if (disabled === this.listLevelDisabled) {
            this.listLevelDisabled = !disabled;
            this.cdr.markForCheck();
        }
        const outdentDisabled = this._listNesting() < 2;
        if (outdentDisabled !== this.listOutdentDisabled) {
            this.listOutdentDisabled = outdentDisabled;
            this.cdr.markForCheck();
        }
        this._updateHistoryState();
        const cell = this._currentTableCell();
        const inTable = !!cell;
        if (inTable !== this.inTableCell) {
            this.inTableCell = inTable;
            this.cdr.markForCheck();
        }
        if (inTable === this.tableEditDisabled) {
            this.tableEditDisabled = !inTable;
            this.cdr.markForCheck();
        }
        this._updateTableToolbar(cell);
        const next = this._readActiveCommands(range);
        if (!this._sameCommands(next, this.activeCommands)) {
            this.activeCommands = next;
            this.cdr.markForCheck();
        }
    }

    private _updateHistoryState(): void {
        const editor = this.editorRef?.nativeElement;
        if (!editor || !editor.contains(document.activeElement)) {
            this._setHistoryState(false, false);
            return;
        }
        this._setHistoryState(
            !this._clearedHtml && !this._queryEnabled('undo'),
            !this._queryEnabled('redo')
        );
    }

    private _setHistoryState(undoDisabled: boolean, redoDisabled: boolean): void {
        if (undoDisabled !== this.undoDisabled || redoDisabled !== this.redoDisabled) {
            this.undoDisabled = undoDisabled;
            this.redoDisabled = redoDisabled;
            this.cdr.markForCheck();
        }
    }

    private _queryEnabled(command: string): boolean {
        try {
            return document.queryCommandEnabled(command);
        } catch {
            return true;
        }
    }

    private _readActiveCommands(range: Range | null): Set<string> {
        const active = new Set<string>();
        if (!range || !this.editorRef.nativeElement.contains(range.commonAncestorContainer)) {
            return active;
        }
        for (const command of ['bold', 'italic', 'insertUnorderedList', 'insertOrderedList']) {
            if (this._queryCommandState(command)) {
                active.add(command);
            }
        }
        const block = this._currentBlockFormat();
        if (this.isHeadingCommand(block)) {
            active.add(block);
        }
        if (this._getLink(range)) {
            active.add('link');
        }
        return active;
    }

    private _queryCommandState(command: string): boolean {
        try {
            return document.queryCommandState(command);
        } catch {
            return false;
        }
    }

    private _sameCommands(a: Set<string>, b: Set<string>): boolean {
        if (a.size !== b.size) {
            return false;
        }
        for (const command of a) {
            if (!b.has(command)) {
                return false;
            }
        }
        return true;
    }

    private _isInListItem(range: Range | null): boolean {
        if (!range) { return false; }
        const node = range.commonAncestorContainer;
        const element = node instanceof Element ? node : node.parentElement;
        const item = element?.closest('li');
        return !!item && this.editorRef.nativeElement.contains(item);
    }

    private _getLink(range: Range | null): HTMLAnchorElement | null {
        if (!range) { return null; }
        const node = range.commonAncestorContainer;
        const element = node instanceof Element ? node : node.parentElement;
        const link = element?.closest('a');
        return link instanceof HTMLAnchorElement && this.editorRef.nativeElement.contains(link)
            ? link
            : null;
    }

    private _setLinkAttributes(link: HTMLAnchorElement, href: string): void {
        link.setAttribute('href', href);
        link.setAttribute('target', '_blank');
        link.setAttribute('rel', 'noopener noreferrer');
    }

    highlightTableSize(rows: number, columns: number): void {
        this.tableSizeRows = rows;
        this.tableSizeColumns = columns;
        this.cdr.markForCheck();
    }

    isTableSizeSelected(row: number, column: number): boolean {
        return row <= this.tableSizeRows && column <= this.tableSizeColumns;
    }

    cancelTableSize(): void {
        this._tableSizeOpenedBy = null;
        this.showTableSizePicker = false;
        this.tableSizeRows = 0;
        this.tableSizeColumns = 0;
        this.cdr.markForCheck();
    }

    insertTableOfSize(rows: number, columns: number, event: MouseEvent): void {
        event.preventDefault();
        this.showTableSizePicker = false;
        this.tableSizeRows = 0;
        this.tableSizeColumns = 0;
        this.editorRef.nativeElement.focus();
        this._restoreRange(this._savedRange);
        this._savedRange = null;
        const html = this._tableHtml(rows, columns);
        const list = this._caretTopList();
        if (list) {
            this._insertAfter(list, html);
        } else {
            document.execCommand('insertHTML', false, html);
        }
        this.onInput();
        this._updateToolbarState();
    }

    private _caretTopList(): Element | null {
        const range = this._getSelection();
        const editor = this.editorRef?.nativeElement;
        if (!range || !editor) { return null; }
        const block = this._caretBlock(range, editor);
        return block && (block.tagName === 'UL' || block.tagName === 'OL') ? block : null;
    }

    private _insertAfter(element: Element, html: string): void {
        const holder = document.createElement('div');
        holder.innerHTML = html;
        const nodes = Array.from(holder.childNodes);
        let anchor: ChildNode = element;
        for (const node of nodes) {
            anchor.after(node);
            anchor = node as ChildNode;
        }
        const last = nodes[nodes.length - 1];
        if (last instanceof HTMLElement) {
            this._placeCaretIn(last);
        }
    }

    private _tableHtml(rows: number, columns: number): string {
        const headers = this.tableSizeColumnOptions
            .slice(0, columns)
            .map(column => `<th>Header ${column}</th>`)
            .join('');
        const bodyRow = `<tr>${'<td><br></td>'.repeat(columns)}</tr>`;
        return `<table><thead><tr>${headers}</tr></thead>`
            + `<tbody>${bodyRow.repeat(Math.max(0, rows - 1))}</tbody></table><p><br></p>`;
    }

    private _setTableSizePosition(event: MouseEvent): void {
        const wrapper = this.editorRef.nativeElement.parentElement;
        const button = event.currentTarget;
        if (!wrapper || !(button instanceof Element)) { return; }
        const buttonRect = button.getBoundingClientRect();
        const wrapperRect = wrapper.getBoundingClientRect();
        this.tableSizePosition = {
            left: Math.max(8, Math.min(
                buttonRect.left - wrapperRect.left,
                wrapperRect.width - RichTextEditorComponent.TABLE_PICKER_WIDTH
            )),
            top: buttonRect.bottom - wrapperRect.top + 4,
        };
    }

    private _updateTableToolbar(cell: Element | null): void {
        const table = cell?.closest('table') || null;
        const visible = !!table && !this.readonly && !this.isDisabled;
        if (visible) {
            this._setTableToolbarPosition(table as HTMLElement);
        }
        if (visible !== this.showTableToolbar) {
            this.showTableToolbar = visible;
        }
        this.cdr.markForCheck();
    }

    private _setTableToolbarPosition(table: HTMLElement): void {
        const wrapper = this.editorRef.nativeElement.parentElement;
        if (!wrapper) { return; }
        const tableRect = table.getBoundingClientRect();
        const wrapperRect = wrapper.getBoundingClientRect();
        const above = tableRect.top - wrapperRect.top - RichTextEditorComponent.TABLE_TOOLBAR_HEIGHT;
        const top = above >= 4 ? above : tableRect.bottom - wrapperRect.top + 4;
        this.tableToolbarPosition = {
            left: Math.max(8, Math.min(
                tableRect.left - wrapperRect.left,
                wrapperRect.width - RichTextEditorComponent.TABLE_TOOLBAR_WIDTH
            )),
            top,
        };
    }

    onEditorScroll(): void {
        if (!this.showTableToolbar) { return; }
        const table = this._currentTableCell()?.closest('table');
        if (!table) { return; }
        this._setTableToolbarPosition(table as HTMLElement);
        this.cdr.markForCheck();
    }

    private _setLinkDialogPosition(link: HTMLAnchorElement | null): void {
        const wrapper = this.editorRef.nativeElement.parentElement;
        if (!link || !wrapper) {
            this.linkDialogPosition = { left: 8, top: 48 };
            return;
        }
        const linkRect = link.getBoundingClientRect();
        const wrapperRect = wrapper.getBoundingClientRect();
        const topBelow = linkRect.bottom - wrapperRect.top + 8;
        this.linkDialogPosition = {
            left: Math.max(8, Math.min(linkRect.left - wrapperRect.left, wrapperRect.width - 328)),
            top: topBelow,
        };
    }

    private _nextBlockFormat(command: string): string {
        return this._currentBlockFormat() === command ? 'p' : command;
    }

    private _currentBlockFormat(): string {
        try {
            return (document.queryCommandValue('formatBlock') || '').toLowerCase();
        } catch {
            return '';
        }
    }
}

function escapeText(text: string): string {
    const inert = document.implementation.createHTMLDocument('');
    const holder = inert.createElement('div');
    return text
        .replace(/\r\n|\r/g, '\n')
        .split('\n')
        .map((line) => {
            holder.textContent = line;
            return holder.innerHTML;
        })
        .join('<br>');
}
