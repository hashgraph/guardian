import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnDestroy } from '@angular/core';
import { Clipboard } from '@angular/cdk/clipboard';

/**
 * An icon button that copies a value. The icon turns into a check for a moment,
 * the same way the policy details panel does it.
 */
@Component({
    selector: 'sf-copy',
    templateUrl: './copy-button.component.html',
    styleUrls: ['./copy-button.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: false
})
export class CopyButtonComponent implements OnDestroy {
    /** What to copy. Nothing happens for an empty value. */
    @Input() value: string | null | undefined = '';
    /** The tooltip and the accessible name. */
    @Input() tip: string = 'Copy';
    /** An optional text next to the icon, e.g. "CID". */
    @Input() label: string = '';

    public copied = false;
    private timer: ReturnType<typeof setTimeout> | null = null;

    constructor(
        private clipboard: Clipboard,
        private changeDetector: ChangeDetectorRef
    ) {
    }

    public copy(event?: Event): void {
        event?.stopPropagation();
        if (!this.value) {
            return;
        }
        if (!this.clipboard.copy(this.value)) {
            return;
        }
        this.copied = true;
        if (this.timer) {
            clearTimeout(this.timer);
        }
        this.timer = setTimeout(() => {
            this.copied = false;
            this.timer = null;
            this.changeDetector.markForCheck();
        }, 1500);
    }

    public ngOnDestroy(): void {
        if (this.timer) {
            clearTimeout(this.timer);
        }
    }
}
