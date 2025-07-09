import { AfterContentInit, Component, Inject } from '@angular/core';
import { UntypedFormControl, Validators } from '@angular/forms';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';

/**
 * Dialog allowing you to select a file and load schemas.
 */
@Component({
    selector: 'enum-editor-dialog',
    templateUrl: './enum-editor-dialog.component.html',
    styleUrls: ['./enum-editor-dialog.component.scss'],
})
export class EnumEditorDialog implements AfterContentInit {
    public header: string;

    public enumValue!: string;

    public codeMirrorOptions: any = {
        lineNumbers: true,
        theme: 'default',
        mode: 'text/plain',
    };

    public initDialog: boolean = false;
    public loading: boolean = false;
    public loadToIpfs: boolean = false;
    public loadToIpfsValue: boolean = true;

    public code: UntypedFormControl = new UntypedFormControl();
    public urlControl = new UntypedFormControl('', [
        Validators.pattern(
            /^(http:\/\/www\.|https:\/\/www\.|http:\/\/|https:\/\/)?[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,5}(:[0-9]{1,5})?(\/.*)?$/
        ),
    ]);

    public errorHandler!: Function;

    constructor(
        public ref: DynamicDialogRef,
        public config: DynamicDialogConfig
    ) {
        this.header = this.config.header || '';
        this.enumValue =
            this.config.data.enumValue?.join('\n') ||
            'FIRST_OPTION\nSECOND_OPTION\nTHIRD_OPTION';
        this.loadToIpfs = this.config.data.enumValue.length > 5;
        this.errorHandler = this.config.data.errorHandler;
    }

    ngOnInit() {
    }

    ngAfterContentInit() {
        setTimeout(() => {
            this.initDialog = true;

            // Allows drop files into text-editor directly
            const dropArea = document.getElementById('text-area');
            dropArea?.addEventListener('dragover', (event) => {
                event.stopPropagation();
                event.preventDefault();
            });
            dropArea?.addEventListener('drop', (event) => {
                event.stopPropagation();
                event.preventDefault();
            });
        }, 150);
    }

    public importEnumData(file: any) {
        const reader = new FileReader();
        reader.readAsText(file);
        reader.addEventListener('load', (e: any) => {
            const fileText = e.target.result;
            this.ref.close(
                new Blob([
                    JSON.stringify({
                        enum: [...new Set(fileText.split('\r\n'))],
                    }),
                ])
            );
        });
    }

    public onImportByUrl() {
        this.loading = true;
        fetch(this.urlControl.value)
            .then((res) => res.text())
            .then((jsontext: any) => {
                try {
                    const parsedText = JSON.parse(jsontext);
                    this.enumValue =
                        (parsedText && parsedText.enum?.join('\n')) || '';
                } catch {
                    this.enumValue = jsontext;
                }
            })
            .catch((err) => {
                if (this.errorHandler) {
                    this.errorHandler(err.message, 'Can not import by URL');
                }
            })
            .finally(() => {
                this.loading = false;
            });
    }

    public onImportByFile() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.txt';
        input.onchange = (e: any) => {
            const file: File = e.target?.files[0];
            if (!file) {
                return;
            }
            this.loading = true;
            var reader = new FileReader();
            reader.readAsText(file, 'UTF-8');
            reader.onload = (readerEvent: any) => {
                this.loading = false;
                var content = readerEvent?.target?.result || '';
                this.enumValue = content;
            };
        };
        input.click();
    }

    public checkLoadIpfsVisible(value: string) {
        const linesCount = (value?.match(/\n/g) || []).length;
        this.loadToIpfs = linesCount > 4;
    }


    public onClose() {
        this.ref.close(null);
    }


    public onSave() {
        this.ref.close({
            enumValue: this.enumValue,
            loadToIpfs: this.loadToIpfs && this.loadToIpfsValue
        });
    }
}
