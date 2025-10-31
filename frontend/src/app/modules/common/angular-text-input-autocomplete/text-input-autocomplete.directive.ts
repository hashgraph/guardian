import {
    ComponentFactoryResolver,
    ComponentRef,
    Directive,
    ElementRef,
    EventEmitter,
    Host,
    HostListener,
    Injector,
    Input,
    OnDestroy,
    Output,
    ViewContainerRef
} from '@angular/core';
import getCaretCoordinates from 'textarea-caret';
import { takeUntil } from 'rxjs/operators';
import { TextInputAutocompleteMenuComponent } from './text-input-autocomplete-menu.component';
import { Subject } from 'rxjs';
import { AutocompleteItem } from './autocomplete-item';
// @ts-ignore
import toPX from 'to-px';
import { TextInputAutocompleteContainerComponent } from './text-input-autocomplete-container.component';

export interface ChoiceSelectedEvent {
    choice: any;
    insertedAt: {
        start: number;
        end: number;
    };
}

@Directive({
    selector:
        'textarea[mwlTextInputAutocomplete],input[type="text"][mwlTextInputAutocomplete]'
})
export class TextInputAutocompleteDirective implements OnDestroy {
    /**
     * The character that will trigger the menu to appear
     */
    @Input() triggerCharacter: string[] = ['@'];

    /**
     * An optional keyboard shortcut that will trigger the menu to appear
     */
    @Input() keyboardShortcut: (event: KeyboardEvent) => string;

    /**
     * The regular expression that will match the search text after the trigger character
     */
    @Input() searchRegexp = /^\w*$/;

    /**
     * Whether to close the menu when the host textarea loses focus
     */
    @Input() closeMenuOnBlur = false;

    /**
     * The menu component to show with available options.
     * You can extend the built in `TextInputAutocompleteMenuComponent` component to use a custom template
     */
    @Input() menuComponent = TextInputAutocompleteMenuComponent;

    /**
     * Called when the options menu is shown
     */
    @Output() menuShown = new EventEmitter<void>();

    /**
     * Called when the options menu is hidden
     */
    @Output() menuHidden = new EventEmitter<void>();

    /**
     * Called when a choice is selected
     */
    @Output() choiceSelected = new EventEmitter<ChoiceSelectedEvent>();

    /**
     * A function that accepts a search string and returns an array of choices. Can also return a promise.
     */
    @Input() findChoices: (searchText: string, triggerCharacter: string) => AutocompleteItem[] | Promise<AutocompleteItem[]>;

    /**
     * A function that formats the selected choice once selected.
     */
    @Input() getChoiceLabel: (choice: AutocompleteItem) => string = choice => choice.value;

    @Input() menuPosition: 'above' | 'below' = 'below';

    @Input() menuMaxSize: number = 200;

    /* tslint:disable member-ordering */
    private menu:
        | {
            component: ComponentRef<TextInputAutocompleteMenuComponent>;
            triggerCharacterPosition: number;
            lastCaretPosition?: number;
        }
        | undefined;

    private menuHidden$ = new Subject<void>();

    private usingShortcut = false;
    private usingShortcutCharacter: string = '';

    constructor(
        private componentFactoryResolver: ComponentFactoryResolver,
        private viewContainerRef: ViewContainerRef,
        private injector: Injector,
        private elm: ElementRef,
        @Host() private parent: TextInputAutocompleteContainerComponent
    ) {
    }

    @HostListener('keypress', ['$event.key'])
    onKeypress(key: string) {
        if (this.triggerCharacter.includes(key)) {
            this.usingShortcut = false;
            this.showMenu();
        }
    }

    @HostListener('keydown', ['$event'])
    onKeyDown(event: KeyboardEvent) {
        if (this.keyboardShortcut) {
            this.usingShortcutCharacter = this.keyboardShortcut(event)
            this.usingShortcut = !!this.usingShortcutCharacter;
            if (this.usingShortcut) {
                this.showMenu();
                this.onChange('');
            }
        }
    }

    @HostListener('input', ['$event.target.value'])
    onChange(value: string) {
        if (this.menu) {
            const triggerCharacter = value[this.menu.triggerCharacterPosition];
            if (
                !this.triggerCharacter.includes(triggerCharacter) &&
                !this.usingShortcut
            ) {
                this.hideMenu();
            } else {
                const cursor = this.elm.nativeElement.selectionStart;
                if (cursor < this.menu.triggerCharacterPosition) {
                    this.hideMenu();
                } else {
                    if (this.usingShortcut && !this.menu) {
                        value = this.usingShortcutCharacter;
                    }
                    const offset = this.usingShortcut ? 0 : 1;
                    const searchText = value.slice(
                        this.menu.triggerCharacterPosition + offset,
                        cursor
                    );

                    if (!searchText.match(this.searchRegexp)) {
                        this.hideMenu();
                    } else {
                        this.menu.component.instance.searchText = searchText;
                        this.menu.component.instance.choices = [];
                        this.menu.component.instance.choiceLoadError = undefined;
                        this.menu.component.instance.choiceLoading = true;
                        this.menu.component.changeDetectorRef.detectChanges();
                        Promise.resolve(this.findChoices(searchText, triggerCharacter))
                            .then(choices => {
                                if (this.menu) {
                                    this.menu.component.instance.choices = choices;
                                    this.menu.component.instance.choiceLoading = false;
                                    this.menu.component.changeDetectorRef.detectChanges();
                                }
                            })
                            .catch(err => {
                                if (this.menu) {
                                    this.menu.component.instance.choiceLoading = false;
                                    this.menu.component.instance.choiceLoadError = err;
                                    this.menu.component.changeDetectorRef.detectChanges();
                                }
                            });
                    }
                }
            }
        }
    }

    @HostListener('blur')
    onBlur() {
        if (this.menu) {
            this.menu.lastCaretPosition = this.elm.nativeElement.selectionStart;

            if (this.closeMenuOnBlur === true) {
                this.hideMenu();
            }
        }
    }

    private showMenu() {
        if (!this.menu) {
            const menuFactory = this.componentFactoryResolver
                .resolveComponentFactory<TextInputAutocompleteMenuComponent>(this.menuComponent);
            this.menu = {
                component: this.viewContainerRef.createComponent(
                    menuFactory,
                    0,
                    this.injector
                ),
                triggerCharacterPosition: this.elm.nativeElement.selectionStart
            };

            const size = this.elm.nativeElement?.getBoundingClientRect();
            const lineHeight = this.getLineHeight(this.elm.nativeElement);
            let { top, left } = getCaretCoordinates(
                this.elm.nativeElement,
                this.elm.nativeElement.selectionStart
            );
            if (this.menuPosition !== 'above') {
                top = top + lineHeight;
            }
            if (size && size.width) {
                const max = size.width - this.menuMaxSize;
                if (left > max) {
                    left = max;
                }
            }
            this.menu.component.instance.position = {
                top,
                left,
                position: this.menuPosition,
                height: lineHeight
            };
            this.menu.component.instance.itemTemplate = this.parent?.itemTemplate;
            this.menu.component.changeDetectorRef.detectChanges();
            this.menu.component.instance.selectChoice
                .pipe(takeUntil(this.menuHidden$))
                .subscribe(choice => {
                    const label = this.getChoiceLabel(choice);
                    const textarea: HTMLTextAreaElement = this.elm.nativeElement;
                    const value: string = textarea.value;
                    const startIndex = this.menu!.triggerCharacterPosition;
                    const start = value.slice(0, startIndex);
                    const caretPosition =
                        this.menu!.lastCaretPosition || textarea.selectionStart;
                    const end = value.slice(caretPosition);
                    textarea.value = start + label + end;
                    // force ng model / form control to update
                    textarea.dispatchEvent(new Event('input'));
                    this.hideMenu();
                    const setCursorAt = (start + label).length;
                    textarea.setSelectionRange(setCursorAt, setCursorAt);
                    textarea.focus();
                    this.choiceSelected.emit({
                        choice,
                        insertedAt: {
                            start: startIndex,
                            end: startIndex + label.length
                        }
                    });
                });
            this.menuShown.emit();
        }
    }

    getLineHeight(elm: HTMLElement): number {
        const lineHeightStr = getComputedStyle(elm).lineHeight || '';
        const fontSizeStr = getComputedStyle(elm).fontSize || '';
        const fontSize = +toPX(fontSizeStr);
        const normal = 1.2;
        const lineHeightNum = parseFloat(lineHeightStr);

        if (lineHeightStr === lineHeightNum + '') {
            return fontSize * lineHeightNum;
        }

        if (lineHeightStr.toLowerCase() === 'normal') {
            return fontSize * normal;
        }

        return toPX(lineHeightStr);
    }

    private hideMenu() {
        if (this.menu) {
            this.menu.component.destroy();
            this.menuHidden$.next();
            this.menuHidden.emit();
            this.menu = undefined;
        }
    }

    ngOnDestroy() {
        this.hideMenu();
    }
}
