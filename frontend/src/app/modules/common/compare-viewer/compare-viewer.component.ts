import { Component, Input, OnInit, ViewChild } from '@angular/core';
import { CompareStorage } from '../../../services/compare-storage.service';
import { Subscription } from 'rxjs';
import { Router } from '@angular/router';
import { MatMenuTrigger } from '@angular/material/menu';

@Component({
    selector: 'app-compare-viewer',
    templateUrl: './compare-viewer.component.html',
    styleUrls: ['./compare-viewer.component.scss']
})
export class CompareViewerComponent implements OnInit {
    @Input() active: boolean = false;
    @Input() collapsed: boolean = false;

    @ViewChild(MatMenuTrigger) compareMenu: MatMenuTrigger;

    public count: number = 0;
    public ids: string[];
    public menuOpened: boolean = false;
    public listener: Subscription;
    public selected: { [x: string]: boolean } = {};
    public selectedCount: number = 0;

    constructor(
        private compareStorage: CompareStorage,
        private router: Router,
    ) {
        this.listener = this.compareStorage.subscribe(this.onStorage.bind(this));
    }

    ngOnInit(): void {
        this.ids = this.compareStorage.load();
        this.count = this.ids.length;
    }

    ngOnDestroy(): void {
        try {
            this.listener.unsubscribe();
        } catch (error) {
            console.error(error);
        }
    }

    private onStorage(ids: string[]) {
        this.ids = ids || [];
        this.refresh();
    }

    private refresh(): void {
        this.count = this.ids.length;
        this.selectedCount = 0;
        for (const id of this.ids) {
            if (this.selected[id]) {
                this.selectedCount++;
            }
        }
    }

    public isSelected(id: string): boolean {
        return this.selected[id] === true;
    }

    public onSelect(id: string): void {
        this.selected[id] = !this.selected[id];
        this.refresh();
    }

    public onDelete(id: string): void {
        this.selected[id] = false;
        this.ids = this.ids.filter(i => i !== id);
        this.refresh();
        this.compareStorage.remove(id);
    }

    public onCompare(): void {
        if (this.compareMenu) {
            this.compareMenu.closeMenu();
        }
        if (this.selectedCount > 1) {
            const ids = this.ids.filter(id => this.selected[id]);
            this.router.navigate(['/compare'], {
                queryParams: {
                    type: 'document',
                    documentIds: ids
                }
            });
        }
    }

    public onMenuOpened($event: MouseEvent) {
        $event.stopPropagation();
        if (this.collapsed) {
            $event.stopImmediatePropagation();
            const ids = this.ids.filter(id => this.selected[id]);
            this.router.navigate(['/compare'], {
                queryParams: {
                    type: 'document',
                    documentIds: ids
                }
            });
            return;
        }
        this.menuOpened = true;
        this.refresh();
    }
}
