import { Component } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { DialogService, DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';

@Component({
    selector: 'score-dialog',
    templateUrl: './score-dialog.component.html',
    styleUrls: ['./score-dialog.component.scss'],
})
export class ScoreDialog {
    public loading = true;
    public score: any;
    public options: any[];

    constructor(
        public ref: DynamicDialogRef,
        public config: DynamicDialogConfig,
        private dialogService: DialogService,
    ) {
        this.score = this.config.data?.score || {};
        this.options = this.score.options || [];
    }

    ngOnInit() {
        this.loading = false;
    }

    ngOnDestroy(): void {
    }

    public deleteOption(item: any, $event: any) {
        this.options = this.options.filter((e) => e !== item);
    }

    public addOption() {
        this.options.push({});
    }

    public onClose(): void {
        this.ref.close(null);
    }

    public onSubmit(): void {
        this.score.options = this.options;
        this.ref.close(this.score);
    }
}
