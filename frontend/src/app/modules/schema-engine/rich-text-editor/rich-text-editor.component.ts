import {
    Component,
    OnInit,
    OnDestroy,
    Input,
    forwardRef,
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    AfterViewInit,
    ElementRef,
    ViewChild,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

/**
 * A lightweight Rich Text Editor component using the browser's built-in
 * `contenteditable` API.  No external dependencies required.
 *
 * Supports: bold, italic, underline, ordered/unordered lists,
 * headings (H1-H3), hyperlinks, and plain-text fallback rendering.
 *
 * Value contract: stores / emits HTML strings.  Existing plain-text
 * values are displayed as-is without breaking backward compatibility.
 */
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
    implements OnInit, OnDestroy, AfterViewInit, ControlValueAccessor
{
    @ViewChild('editor', { static: false }) editorRef!: ElementRef<HTMLDivElement>;

    @Input() placeholder: string = 'Enter text here…';
    @Input() readonly: boolean = false;

    public showLinkDialog: boolean = false;
    public linkUrl: string = '';
    public isDisabled: boolean = false;

    private _value: string = '';
    private _onChange: (value: string) => void = () => {};
    private _onTouched: () => void = () => {};

    /** Track saved selection for link insertion */
    private _savedRange: Range | null = null;

    public readonly toolbarItems = [
        { command: 'bold',          icon: 'pi pi-bold',           title: 'Bold (Ctrl+B)' },
        { command: 'italic',        icon: 'pi pi-italic',         title: 'Italic (Ctrl+I)' },
        { command: 'underline',     icon: 'pi pi-underline',      title: 'Underline (Ctrl+U)' },
        { separator: true },
        { command: 'insertUnorderedList', icon: 'pi pi-list',     title: 'Bullet list' },
        { command: 'insertOrderedList',   icon: 'pi pi-list-check', title: 'Numbered list' },
        { separator: true },
        { command: 'h1',            icon: null, label: 'H1',      title: 'Heading 1' },
        { command: 'h2',            icon: null, label: 'H2',      title: 'Heading 2' },
        { command: 'h3',            icon: null, label: 'H3',      title: 'Heading 3' },
        { separator: true },
        { command: 'link',          icon: 'pi pi-link',           title: 'Insert link' },
    ];

    constructor(private cdr: ChangeDetectorRef) {}

    ngOnInit(): void {}

    ngAfterViewInit(): void {
        if (this.editorRef) {
            this._setEditorContent(this._value);
        }
    }

    ngOnDestroy(): void {}

    // ── ControlValueAccessor ──────────────────────────────────────────────────

    writeValue(value: string | null): void {
        this._value = value ?? '';
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

    // ── Editor events ─────────────────────────────────────────────────────────

    onInput(): void {
        const html = this.editorRef.nativeElement.innerHTML;
        this._value = html;
        this._onChange(html);
    }

    onBlur(): void {
        this._onTouched();
    }

    /** Returns true if the field is empty (no visible text). */
    get isEmpty(): boolean {
        if (!this._value) { return true; }
        const tmp = document.createElement('div');
        tmp.innerHTML = this._value;
        return (tmp.textContent || '').trim() === '';
    }

    // ── Toolbar actions ───────────────────────────────────────────────────────

    execCommand(command: string, event: MouseEvent): void {
        event.preventDefault();
        if (this.readonly || this.isDisabled) { return; }
        this.editorRef.nativeElement.focus();

        if (['h1', 'h2', 'h3'].includes(command)) {
            document.execCommand('formatBlock', false, command);
        } else if (command === 'link') {
            this._savedRange = this._getSelection();
            this.showLinkDialog = true;
            this.linkUrl = '';
            this.cdr.markForCheck();
            return;
        } else {
            document.execCommand(command, false, undefined);
        }
        this.onInput();
        this.cdr.markForCheck();
    }

    insertLink(): void {
        if (!this.linkUrl) {
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
        const url = this.linkUrl.match(/^https?:\/\//)
            ? this.linkUrl
            : 'https://' + this.linkUrl;
        document.execCommand('createLink', false, url);
        // Make all links open in new tab
        this.editorRef.nativeElement
            .querySelectorAll('a')
            .forEach((a: HTMLAnchorElement) => a.setAttribute('target', '_blank'));
        this.showLinkDialog = false;
        this.linkUrl = '';
        this._savedRange = null;
        this.onInput();
        this.cdr.markForCheck();
    }

    cancelLink(): void {
        this.showLinkDialog = false;
        this.linkUrl = '';
        this._savedRange = null;
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private _setEditorContent(value: string): void {
        const el = this.editorRef?.nativeElement;
        if (!el) { return; }
        // Only update DOM if value actually changed to avoid cursor jump
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
}
