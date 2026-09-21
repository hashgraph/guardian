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
    public headingDisabled = false;
    public activeCommands = new Set<string>();

    private _value = '';
    private _onChange: (value: string) => void = () => {};
    private _onTouched: () => void = () => {};
    private _savedRange: Range | null = null;
    private _editingLink: HTMLAnchorElement | null = null;
    private _draggingFromEditor = false;
    private _resolvedImages = new Map<string, string>();

    private static readonly IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
    private static readonly MAX_IMAGE_SIDE = 1600;
    private static readonly MAX_IMAGE_BYTES = 512 * 1024;
    private _onSelectionChange = (): void => this._updateToolbarState();
    private _onDocumentMouseDown = (event: MouseEvent): void => {
        if (!this.showLinkDialog) { return; }
        const target = event.target;
        if (target instanceof Node && this.host.nativeElement.contains(target)) { return; }
        this.cancelLink();
        this.cdr.markForCheck();
    };

    public readonly toolbarItems = [
        { command: 'bold', icon: null, label: 'B', title: 'Bold (Ctrl+B)' },
        { command: 'italic', icon: null, label: 'I', title: 'Italic (Ctrl+I)' },
        { separator: true },
        { command: 'insertUnorderedList', icon: 'pi pi-list', title: 'Bullet list' },
        { command: 'insertOrderedList', icon: 'pi pi-list-check', title: 'Numbered list' },
        { separator: true },
        { command: 'h1', icon: null, label: 'H1', title: 'Heading 1' },
        { command: 'h2', icon: null, label: 'H2', title: 'Heading 2' },
        { command: 'h3', icon: null, label: 'H3', title: 'Heading 3' },
        { separator: true },
        { command: 'link', icon: 'pi pi-link', title: 'Insert or edit link' },
        { command: 'image', icon: 'pi pi-image', title: 'Insert image' },
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

    onInput(event?: Event): void {
        if (this._isDeletionEvent(event)) {
            this._clearEmptyFormatting();
        }
        const html = this.editorRef.nativeElement.innerHTML;
        const value = isBlankRichText(html) ? '' : htmlToMarkdown(html);
        this._value = value;
        this._onChange(value);
        this.cdr.markForCheck();
    }

    onPaste(event: ClipboardEvent): void {
        if (this.readonly || this.isDisabled) { return; }
        const clipboard = event.clipboardData;
        if (!clipboard) { return; }
        event.preventDefault();
        const image = this.imageUploader ? this._imageFileFrom(clipboard.files) : null;
        if (image) {
            this._savedRange = this._getSelection();
            this._uploadAndInsertImage(image);
            return;
        }
        const html = clipboard.getData('text/html');
        const clean = html
            ? sanitizeRichText(html)
            : escapeText(clipboard.getData('text/plain'));
        if (!clean) { return; }
        document.execCommand('insertHTML', false, clean);
        this.onInput();
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

    onBlur(): void {
        this._onTouched();
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

    isCommandDisabled(command: string | undefined): boolean {
        return (this.headingDisabled && this.isHeadingCommand(command))
            || (command === 'image' && this.imageLoading);
    }

    isCommandActive(command: string | undefined): boolean {
        return !!command && !this.isCommandDisabled(command) && this.activeCommands.has(command);
    }

    commandTitle(command: string | undefined, title: string): string {
        return this.isCommandDisabled(command)
            ? 'Headings are not available inside a list'
            : title;
    }

    execCommand(command: string, event: MouseEvent): void {
        event.preventDefault();
        if (this.readonly || this.isDisabled) { return; }
        this.editorRef.nativeElement.focus();
        if (this.isHeadingCommand(command)) {
            if (this._isInListItem(this._getSelection())) { return; }
            document.execCommand('formatBlock', false, this._nextBlockFormat(command));
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
            this._savedRange = this._getSelection();
            this.imageError = '';
            this.imageInputRef?.nativeElement.click();
            return;
        } else {
            document.execCommand(command, false, undefined);
        }
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

    private async _uploadAndInsertImage(file: File): Promise<void> {
        if (!this.imageUploader) { return; }

        if (!RichTextEditorComponent.IMAGE_TYPES.includes(file.type)) {
            this.imageError = `${file.name} is not a supported image. Use PNG, JPEG or WebP.`;
            this.cdr.markForCheck();
            return;
        }

        this.imageLoading = true;
        this.cdr.markForCheck();
        try {
            const prepared = await this._prepareImage(file);
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

    private async _prepareImage(file: File): Promise<File> {
        try {
            const bitmap = await createImageBitmap(file);
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
        } catch (error) {
            return file;
        }
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
        el.innerHTML = '';
        const range = document.createRange();
        range.selectNodeContents(el);
        range.collapse(true);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
        this._updateToolbarState();
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
        const next = this._readActiveCommands(range);
        if (!this._sameCommands(next, this.activeCommands)) {
            this.activeCommands = next;
            this.cdr.markForCheck();
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
