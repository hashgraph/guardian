import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';

@Component({
    selector: 'app-add-event-topic-modal',
    templateUrl: './add-event-topic-modal.component.html',
    styleUrls: ['./add-event-topic-modal.component.scss']
})
export class AddEventTopicModalComponent implements OnChanges {
    @Input() public visible: boolean = false;
    @Input() public loading: boolean = false;

    @Output() public cancel: EventEmitter<void> = new EventEmitter<void>();
    @Output() public add: EventEmitter<string> = new EventEmitter<string>();

    public topicId: string = '0.0.';

    private readonly prefix: string = '0.0.';

    private readonly maxDigits: number = 20;

    public readonly maxLength: number = this.prefix.length + this.maxDigits;

    private readonly topicIdPattern: RegExp = /^0\.0\.\d+$/;

    public ngOnChanges(changes: SimpleChanges): void {
        if (changes['visible']) {
            if (this.visible) {
                this.topicId = this.prefix;
            }
        }
    }

    public get canAdd(): boolean {
        if (this.loading) {
            return false;
        }

        return this.isTopicIdValid(this.topicId);
    }

    public onCancel(): void {
        this.cancel.emit();
    }

    public onAddClick(): void {
        const value = String(this.topicId || '').trim();

        if (!this.isTopicIdValid(value)) {
            return;
        }

        this.add.emit(value);
    }

    public isTopicIdValid(value: string): boolean {
        const v = String(value || '').trim();

        if (!this.topicIdPattern.test(v)) {
            return false;
        }

        const digits = v.slice(this.prefix.length);
        if (digits.length < 1) {
            return false;
        }

        if (digits.length > this.maxDigits) {
            return false;
        }

        return true;
    }

    public onTopicIdChange(value: string, input: HTMLInputElement): void {
        const next = this.normalizeTopicId(value);

        this.topicId = next;

        queueMicrotask(() => {
            const pos = this.topicId.length;
            input.setSelectionRange(pos, pos);
        });
    }

    public onKeyPress(event: KeyboardEvent): void {
        const key = event.key;

        if (key.length === 1) {
            const isDigit = key >= '0' && key <= '9';

            if (!isDigit) {
                event.preventDefault();
                event.stopPropagation();
            }
        }
    }

    public onPaste(event: ClipboardEvent, input: HTMLInputElement): void {
        event.preventDefault();
        event.stopPropagation();

        const text = event.clipboardData?.getData('text') ?? '';
        const merged = `${this.topicId}${text}`;

        const next = this.normalizeTopicId(merged);

        this.topicId = next;

        queueMicrotask(() => {
            const pos = this.topicId.length;
            input.setSelectionRange(pos, pos);
        });
    }

    private normalizeTopicId(raw: string): string {
        let value = String(raw || '');

        if (value.startsWith(this.prefix)) {
            value = value.slice(this.prefix.length);
        }

        let digits = value.replace(/\D/g, '');

        if (digits.length > this.maxDigits) {
            digits = digits.slice(0, this.maxDigits);
        }

        return `${this.prefix}${digits}`;
    }
}
