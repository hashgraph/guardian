import { Component, ElementRef, HostListener, TemplateRef, ViewChild } from '@angular/core';
import { Subject } from 'rxjs';
import { AutocompleteItem } from './autocomplete-item';

@Component({
    selector: 'mwl-text-input-autocomplete-menu',
    templateUrl: './text-input-autocomplete-menu.component.html',
    styleUrls: ['./text-input-autocomplete-menu.component.scss']
})
export class TextInputAutocompleteMenuComponent {
    @ViewChild('dropdownMenu') dropdownMenuElement: ElementRef<HTMLUListElement>;

    public itemTemplate?: TemplateRef<any>;
    public position?: {
        top: number;
        left: number;
        position: 'above' | 'below',
        height: number;
    };

    public selectChoice = new Subject<AutocompleteItem>();
    public activeChoice: AutocompleteItem;

    public searchText: string;
    public choiceLoadError: any;
    public choiceLoading = false;

    private _choices: AutocompleteItem[] = [];

    trackById = (index: number, choice: AutocompleteItem) => choice.value;

    public set choices(choices: AutocompleteItem[]) {
        this._choices = choices || [];
        if (this.activeChoice) {
            this.activeChoice = this._choices.find((item) => item.value === this.activeChoice.value) || this._choices[0];
        } else {
            this.activeChoice = this._choices[0];
        }
    }

    public get choices(): AutocompleteItem[] {
        return this._choices;
    }

    @HostListener('document:keydown.ArrowDown', ['$event'])
    onArrowDown(event: KeyboardEvent) {
        event.preventDefault();
        const index = this.choices.indexOf(this.activeChoice);
        if (this.choices[index + 1]) {
            this.scrollToChoice(index + 1);
        }
    }

    @HostListener('document:keydown.ArrowUp', ['$event'])
    onArrowUp(event: KeyboardEvent) {
        event.preventDefault();
        const index = this.choices.indexOf(this.activeChoice);
        if (this.choices[index - 1]) {
            this.scrollToChoice(index - 1);
        }
    }

    @HostListener('document:keydown.Enter', ['$event'])
    onEnter(event: KeyboardEvent) {
        if (this.choices.indexOf(this.activeChoice) > -1) {
            event.preventDefault();
            this.selectChoice.next(this.activeChoice);
        }
    }

    private scrollToChoice(index: number) {
        this.activeChoice = this._choices[index];

        if (this.dropdownMenuElement) {
            const ulPosition = this.dropdownMenuElement.nativeElement.getBoundingClientRect();
            const li = this.dropdownMenuElement.nativeElement.children[index];
            const liPosition = li.getBoundingClientRect();

            if (
                liPosition.top < ulPosition.top ||
                liPosition.bottom > ulPosition.bottom
            ) {
                li.scrollIntoView({
                    behavior: 'smooth',
                    block: 'nearest'
                });
            }
        }
    }
}
