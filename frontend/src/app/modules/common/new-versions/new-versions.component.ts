import {
    Component,
    EventEmitter,
    Input,
    OnInit,
    Output,
    SimpleChanges,
} from '@angular/core';

@Component({
    selector: 'app-new-versions',
    templateUrl: './new-versions.component.html',
    styleUrls: ['./new-versions.component.scss'],
})
export class NewVersionsComponent implements OnInit {
    @Input('type') type: string;
    @Input('newVersions') newVersionsInput: {
        version: string;
        messageId: string;
    }[];
    public newVersions: {
        version: string;
        messageId: string;
        copied: boolean;
    }[] = [];
    public get visible() {
        return this.newVersions?.length > 0;
    }

    @Output('onClick') private onClickEvent = new EventEmitter<string>();

    constructor() { }

    ngOnInit(): void { }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes.newVersionsInput && this.newVersionsInput) {
            this.newVersions = this.newVersionsInput.map((item) => ({
                ...item,
                copied: false,
            }));
        }
    }

    onClick(messageId: string) {
        this.onClickEvent.emit(messageId);
    }

    onCopyClick(newVersion: any) {
        newVersion.copied = true;
        setTimeout(() => {
            newVersion.copied = false;
        }, 2000);
    }
}
