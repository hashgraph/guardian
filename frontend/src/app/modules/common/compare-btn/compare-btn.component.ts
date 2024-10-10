import { Component, Input, OnInit } from '@angular/core';
import { CompareStorage } from '../../../services/compare-storage.service';

@Component({
    selector: 'app-compare-btn',
    templateUrl: './compare-btn.component.html',
    styleUrls: ['./compare-btn.component.scss']
})
export class CompareBtnComponent implements OnInit {
    @Input('type') type!: string;
    @Input('id') id!: string;

    public status: boolean = false;
    public ids: string[];

    constructor(private compareStorage: CompareStorage) {
    }

    ngOnInit(): void {
        this.ids = this.compareStorage.load();
        this.status = this.ids.includes(this.id);
    }

    public onAdd(): void {
        this.status = !this.status;
        this.ids = this.compareStorage.load();
        if (this.status) {
            if (!this.ids.includes(this.id)) {
                this.ids.push(this.id);
                this.compareStorage.save(this.ids);
            }
        } else {
            this.ids = this.ids.filter(id => id !== this.id);
            this.compareStorage.save(this.ids);
        }
    }
}
