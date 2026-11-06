import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, EventEmitter, Input, OnDestroy, Output, ViewChild } from '@angular/core';
import { BooleanProperty } from '../../policy-engine/structures/storage/boolean-prop';
import { IFormCompletion } from '../schema-form/schema-form-completion';
import { IRailCard, IRailSection } from '../schema-form-rail/schema-form-rail.component';

export const SCHEMA_FORM_RAIL_HIDDEN = 'SCHEMA_FORM_RAIL_HIDDEN';

/** The nearest ancestor that scrolls vertically, which is what the rail has to fit. */
export function getScrollParent(element: HTMLElement): HTMLElement | null {
    let node: HTMLElement | null = element.parentElement;
    while (node) {
        const overflowY = getComputedStyle(node).overflowY;
        if (overflowY === 'auto' || overflowY === 'scroll') {
            return node;
        }
        node = node.parentElement;
    }
    return null;
}

/**
 * The section navigation shared by every host (edit form, read-only document, label document):
 * the rail column on wide containers, the section bar and the drawer on narrow ones (<= 1000px of
 * the shell's own width), and "Hide menu" / "Show menu". The page is projected into it.
 */
@Component({
    selector: 'app-schema-form-nav',
    templateUrl: './schema-form-nav.component.html',
    styleUrls: ['./schema-form-nav.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: false
})
export class SchemaFormNavComponent implements OnDestroy {
    @Input() sections: IRailSection[] = [];
    @Input() completion: IFormCompletion | null = null;
    @Input() screen: 'overview' | 'section' = 'overview';
    @Input() activeIndex = 0;
    @Input() cards: IRailCard[] = [];
    @Input() errorsRevealed = false;
    @Input() mode: 'edit' | 'view' = 'edit';
    @Input() title = 'Sections';
    @Input() overviewLabel: string | null = 'Overview';
    /** The small line of the section bar, for example "Section 2 of 8". */
    @Input() barLabel = '';
    /** The host is busy (Preview): the rail and the bar don't react. */
    @Input() locked = false;

    @Output() sectionSelect = new EventEmitter<number | 'overview'>();
    @Output() selectCard = new EventEmitter<IRailCard>();

    public drawerOpen = false;
    private readonly railHiddenProp = new BooleanProperty(SCHEMA_FORM_RAIL_HIDDEN, false);

    private railElement: HTMLElement | null = null;
    private railScrollParent: HTMLElement | null = null;
    private railResizeObserver: ResizeObserver | null = null;

    // The rail is sticky inside the host's scroll container, whose height depends on the dialog
    // size and the banners shown above the form. Sync the rail height to that container.
    @ViewChild('railContainer') set railContainer(ref: ElementRef<HTMLElement> | undefined) {
        const element = ref?.nativeElement ?? null;
        if (element === this.railElement) {
            return;
        }
        this.railElement = element;
        this.setupRailHeightSync();
    }

    constructor(private changeDetectorRef: ChangeDetectorRef) {
        this.railHiddenProp.load();
    }

    public get railHidden(): boolean {
        return this.railHiddenProp.value;
    }

    public get hasSections(): boolean {
        return this.sections.length > 0;
    }

    public get barTitle(): string {
        return this.screen === 'section'
            ? this.sections[this.activeIndex]?.title ?? ''
            : this.overviewLabel ?? this.sections[this.activeIndex]?.title ?? '';
    }

    public onSelect(target: number | 'overview'): void {
        this.sectionSelect.emit(target);
        this.closeDrawer();
    }

    public onSelectCard(card: IRailCard): void {
        this.selectCard.emit(card);
        this.closeDrawer();
    }

    public setDrawer(open: boolean): void {
        this.drawerOpen = open;
        this.changeDetectorRef.markForCheck();
    }

    public closeDrawer(): void {
        if (this.drawerOpen) {
            this.setDrawer(false);
        }
    }

    public toggleRail(): void {
        this.railHiddenProp.value = !this.railHiddenProp.value;
        this.railHiddenProp.save();
        this.drawerOpen = false;
        this.changeDetectorRef.detectChanges();
    }

    private setupRailHeightSync(): void {
        this.railResizeObserver?.disconnect();
        this.railResizeObserver = null;
        this.railScrollParent = null;
        if (!this.railElement) {
            return;
        }
        this.railScrollParent = getScrollParent(this.railElement);
        if (!this.railScrollParent) {
            return;
        }
        this.railResizeObserver = new ResizeObserver(() => this.updateRailHeight());
        this.railResizeObserver.observe(this.railScrollParent);
        this.updateRailHeight();
    }

    private updateRailHeight(): void {
        if (!this.railElement || !this.railScrollParent) {
            return;
        }
        // The rail fills the visible height of the scroll area, however short the page is
        const style = getComputedStyle(this.railScrollParent);
        const padding = (parseFloat(style.paddingTop) || 0) + (parseFloat(style.paddingBottom) || 0);
        const height = `${Math.max(0, this.railScrollParent.clientHeight - padding)}px`;
        this.railElement.style.maxHeight = height;
        this.railElement.style.minHeight = height;
    }

    ngOnDestroy(): void {
        this.railResizeObserver?.disconnect();
        this.railResizeObserver = null;
    }
}
