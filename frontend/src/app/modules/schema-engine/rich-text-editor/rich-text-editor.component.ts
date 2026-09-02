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

    @Input() placeholder = 'Enter text here…';
    @Input() readonly = false;

    public showLinkDialog = false;
    public linkUrl = '';
    public isDisabled = false;
    public linkDialogPosition = { left: 8, top: 48 };
    public headingDisabled = false;

    private _value = '';
    private _onChange: (value: string) => void = () => {};
    private _onTouched: () => void = () => {};
    private _savedRange: Range | null = null;
    private _editingLink: HTMLAnchorElement | null = null;
    private _draggingFromEditor = false;
    private _onSelectionChange = (): void => this._updateHeadingState();
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
        { command: 'underline', icon: null, label: 'U', title: 'Underline (Ctrl+U)' },
        { separator: true },
        { command: 'insertUnorderedList', icon: 'pi pi-list', title: 'Bullet list' },
        { command: 'insertOrderedList', icon: 'pi pi-list-check', title: 'Numbered list' },
        { separator: true },
        { command: 'h1', icon: null, label: 'H1', title: 'Heading 1' },
        { command: 'h2', icon: null, label: 'H2', title: 'Heading 2' },
        { command: 'h3', icon: null, label: 'H3', title: 'Heading 3' },
        { separator: true },
        { command: 'link', icon: 'pi pi-link', title: 'Insert or edit link' },
    ];

    constructor(private cdr: ChangeDetectorRef, private host: ElementRef<HTMLElement>) {}

    ngAfterViewInit(): void {
        if (this.editorRef) {
            this._setEditorContent(this._value);
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
            this._setEditorContent(this._value);
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

    onInput(): void {
        const html = this.editorRef.nativeElement.innerHTML;
        const value = isBlankRichText(html) ? '' : html;
        this._value = value;
        this._onChange(value);
        this.cdr.markForCheck();
    }

    onPaste(event: ClipboardEvent): void {
        if (this.readonly || this.isDisabled) { return; }
        const clipboard = event.clipboardData;
        if (!clipboard) { return; }
        event.preventDefault();
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
        return this.headingDisabled && this.isHeadingCommand(command);
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
        } else {
            document.execCommand(command, false, undefined);
        }
        this.onInput();
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

    private _setEditorContent(value: string): void {
        const el = this.editorRef?.nativeElement;
        if (!el) { return; }
        if (el.innerHTML !== value) {
            el.innerHTML = value;
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

    private _updateHeadingState(): void {
        if (!this.editorRef) { return; }
        const disabled = this._isInListItem(this._getSelection());
        if (disabled !== this.headingDisabled) {
            this.headingDisabled = disabled;
            this.cdr.markForCheck();
        }
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
    holder.textContent = text;
    return holder.innerHTML;
}
