import { Component, Input, OnInit } from '@angular/core';
import { FormGroup } from '@angular/forms';

@Component({
    selector: 'app-token-configuration',
    templateUrl: './token-configuration.component.html',
    styleUrls: ['./token-configuration.component.css'],
})
export class TokenConfigurationComponent implements OnInit {

    @Input('preset') preset?: any;
    @Input('dataForm') dataForm!: FormGroup;
    @Input('ft') ft: any;

    constructor() {}

    ngOnInit(): void {
        if (this.preset) {
            this.dataForm.patchValue(this.preset);
            for (let presetEntry of Object.entries(this.preset)) {
                const controlName = presetEntry[0];
                this.dataForm.get(controlName)?.disable();
            }
        }
        this.onChangeType();
    }

    onChangeType() {
        const data = this.dataForm.getRawValue();
        this.ft = (data && data.tokenType == 'fungible');
    }
}
