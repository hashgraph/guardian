import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';

@Component({
    selector: 'app-add-event-topic',
    templateUrl: './add-event-topic-dialog.component.html',
    styleUrls: ['./add-event-topic-dialog.component.scss']
})
export class AddEventTopicDialogComponent implements OnChanges {
    @Input()
    public visible: boolean = false;

    @Input()
    public loading: boolean = false;

    @Output()
    public cancel: EventEmitter<void> = new EventEmitter<void>();

    @Output()
    public add: EventEmitter<string> = new EventEmitter<string>();

    private readonly prefix: string = '0.0.';

    public readonly minDigits: number = 7;
    public readonly maxDigits: number = 20;

    public topicDigits: string = '';

    public ngOnChanges(changes: SimpleChanges): void {
        if (changes['visible']) {
            if (this.visible) {
                this.topicDigits = '';
            }
        }
    }

    public get canAdd(): boolean {
        if (this.loading) {
            return false;
        }

        return this.isDigitsValid(this.topicDigits);
    }

    public onCancel(): void {
        this.cancel.emit();
    }

    public onAddClick(): void {
        const digits = this.normalizeDigits(this.topicDigits);

        if (!this.isDigitsValid(digits)) {
            return;
        }

        this.add.emit(`${this.prefix}${digits}`);
    }

    public onBeforeInput(event: InputEvent): void {
        if (this.loading) {
            return;
        }

        const inputType = String(event.inputType || '');

        if (inputType.startsWith('delete')) {
            return;
        }

        const data = String(event.data ?? '');

        if (!data) {
            return;
        }

        if (!/^\d+$/.test(data)) {
            event.preventDefault();
        }
    }

    public onInput(input: HTMLInputElement): void {
        if (!input) {
            return;
        }

        const prevCursor = input.selectionStart ?? input.value.length;

        const sanitized = this.normalizeDigits(input.value);

        if (sanitized !== input.value) {
            input.value = sanitized;
        }

        this.topicDigits = sanitized;

        const nextCursor = Math.min(prevCursor, sanitized.length);
        input.setSelectionRange(nextCursor, nextCursor);
    }

    public onPaste(event: ClipboardEvent, input: HTMLInputElement): void {
        event.preventDefault();
        event.stopPropagation();

        const text = String(event.clipboardData?.getData('text') ?? '').trim();
        const digits = this.extractDigitsFromAnyTopicInput(text);

        input.value = digits;
        this.topicDigits = digits;

        const pos = digits.length;
        input.setSelectionRange(pos, pos);
    }

    public onDrop(event: DragEvent, input: HTMLInputElement): void {
        event.preventDefault();
        event.stopPropagation();

        const text = String(event.dataTransfer?.getData('text') ?? '').trim();
        const digits = this.extractDigitsFromAnyTopicInput(text);

        input.value = digits;
        this.topicDigits = digits;

        const pos = digits.length;
        input.setSelectionRange(pos, pos);
    }

    private isDigitsValid(value: string): boolean {
        const digits = this.normalizeDigits(value);

        if (digits.length < this.minDigits) {
            return false;
        }

        if (digits.length > this.maxDigits) {
            return false;
        }

        return true;
    }

    private normalizeDigits(raw: string): string {
        let digits = String(raw ?? '').replace(/\D/g, '');

        if (digits.length > this.maxDigits) {
            digits = digits.slice(0, this.maxDigits);
        }

        return digits;
    }

    private extractDigitsFromAnyTopicInput(raw: string): string {
        let text = String(raw ?? '').trim();

        if (!text) {
            return '';
        }

        if (text.includes('.')) {
            const lastDotIndex = text.lastIndexOf('.');
            text = text.slice(lastDotIndex + 1);
        }

        if (text.startsWith(this.prefix)) {
            text = text.slice(this.prefix.length);
        }

        return this.normalizeDigits(text);
    }
}
