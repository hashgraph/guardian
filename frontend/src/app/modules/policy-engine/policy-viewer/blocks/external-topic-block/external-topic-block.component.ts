import {ChangeDetectorRef, Component, Input, OnInit} from '@angular/core';
import {
    AbstractControl,
    FormArray,
    FormControl, FormGroup,
    UntypedFormBuilder,
    ValidationErrors, ValidatorFn,
    Validators
} from '@angular/forms';
import {PolicyEngineService} from 'src/app/services/policy-engine.service';
import {PolicyHelper} from 'src/app/services/policy-helper.service';
import {WebSocketService} from 'src/app/services/web-socket.service';
import {HttpErrorResponse} from '@angular/common/http';

/**
 * Component for display block of 'external-topic' type.
 */
@Component({
    selector: 'external-topic-block',
    templateUrl: './external-topic-block.component.html',
    styleUrls: ['./external-topic-block.component.scss']
})
export class ExternalTopicBlockComponent implements OnInit {
    @Input('id') id!: string;
    @Input('policyId') policyId!: string;
    @Input('static') static!: any;

    loading: boolean = true;
    socket: any;

    public documentTopicId: string | null = null;
    public instanceTopicId: string | null = null;
    public policyTopicId: string | null = null;
    public documentMessage: any = null;
    public policyInstanceMessage: any = null;
    public policyMessage: any = null;
    public schemas: any[] | null = null;
    public schema: any = null;
    public lastUpdate: string | null = null;
    public status: string | null = null;
    public stepIndex: number = 0;
    public completed: boolean[] = [];
    public editable: boolean[] = [];

    public topicForm = this.fb.group({
        topicId: ['', [Validators.required, this.minLengthValidator(3)]]
    });

    public schemaForm: FormGroup;

    public steps = [
        {label: 'Source Topic Selection'},
        {label: 'Policy Information'},
        {label: 'Document Schema Selection'},
        {label: 'Finish'}
    ];

    constructor(
        private policyEngineService: PolicyEngineService,
        private wsService: WebSocketService,
        private policyHelper: PolicyHelper,
        private fb: UntypedFormBuilder,
        private changeDetector: ChangeDetectorRef,
    ) {
        this.documentTopicId = null;
        this.instanceTopicId = null;
        this.policyTopicId = null;
        this.documentMessage = null;
        this.policyInstanceMessage = null;
        this.policyMessage = null;
        this.schemas = null;
        this.schema = null;
        this.lastUpdate = null;

        this.schemaForm = this.fb.group({
            schemaArray: this.fb.array([], this.atLeastOneSelectedValidator())
        });
    }

    ngOnInit(): void {
        if (!this.static) {
            this.socket = this.wsService.blockSubscribe(this.onUpdate.bind(this));
        }
        this.loadData();
    }

    ngOnDestroy(): void {
        if (this.socket) {
            this.socket.unsubscribe();
        }
    }

    onUpdate(blocks: string[]): void {
        if (Array.isArray(blocks) && blocks.includes(this.id)) {
            this.loadData();
        }
    }

    loadData() {
        this.loading = true;
        this.status = null;
        if (this.static) {
            this.setData(this.static);
            setTimeout(() => {
                this.loading = false;
            }, 500);
        } else {
            this.policyEngineService
                .getBlockData(this.id, this.policyId)
                .subscribe(this._onSuccess.bind(this), this._onError.bind(this));
        }
    }

    private _onSuccess(data: any) {
        this.setData(data);
        setTimeout(() => {
            this.loading = false;
        }, 500);
    }

    private _onError(e: HttpErrorResponse) {
        console.error(e.error);
        if (e.status === 503) {
            this._onSuccess(null);
        } else {
            this.loading = false;
        }
    }

    setData(data: any) {
        if (data) {
            this.status = data.status || 'NEED_TOPIC';
            this.documentTopicId = data.documentTopicId;
            this.instanceTopicId = data.instanceTopicId;
            this.policyTopicId = data.policyTopicId;
            this.documentMessage = data.documentMessage;
            this.policyInstanceMessage = data.policyInstanceMessage;
            this.policyMessage = data.policyMessage;
            this.schemas = data.schemas || [];
            this.schema = data.schema;
            this.lastUpdate = data.lastUpdate;

            const formArray = this.fb.array(
                this.schemas!.map((schema) => {
                    const control = this.fb.control(false);
                    if (schema.status === 'INCOMPATIBLE') {
                        control.disable();
                    }
                    return control;
                }),
                this.atLeastOneSelectedValidator()
            );

            this.schemaForm.setControl('schemaArray', formArray);

            switch (this.status) {
                case 'NEED_TOPIC':
                    this.topicForm.reset();
                    this.stepIndex = 0;
                    this.completed = [false, false, false, false, false];
                    this.editable = [true, false, false, false, false];
                    break;
                case 'NEED_SCHEMA':
                    this.schemaForm.reset();
                    const index = this.schemas?.findIndex(s => s.status === 'INCOMPATIBLE' || s.status === 'COMPATIBLE');
                    this.stepIndex = index === -1 ? 1 : 2;
                    this.completed = [true, true, false, false, false];
                    this.editable = [false, true, true, false, false];
                    break;
                case 'FREE':
                    this.stepIndex = 3;
                    this.completed = [true, true, true, true, true];
                    this.editable = [false, false, false, false, false];
                    break;
                default:
                    this.stepIndex = 0;
                    this.completed = [false, false, false, false, false];
                    this.editable = [false, false, false, false, false];
                    break;
            }
        } else {
            this.status = null;
            this.documentTopicId = null;
            this.instanceTopicId = null;
            this.policyTopicId = null;
            this.documentMessage = null;
            this.policyInstanceMessage = null;
            this.policyMessage = null;
            this.schemas = null;
            this.schema = null;
            this.lastUpdate = null;
            this.stepIndex = 0;

            this.schemaForm.setControl('schemaArray', this.fb.array([]));
        }
    }

    public setTopic() {
        this.loading = true;
        const form = this.topicForm.value;
        const data = {
            operation: 'SetTopic',
            value: form?.topicId
        };
        this.policyEngineService
            .setBlockData(this.id, this.policyId, data)
            .subscribe(() => {
                this.loadData();
            }, (e) => {
                console.error(e.error);
                this.loading = false;
            });
    }

    public setSchema() {
        this.loading = true;

        const selectedSchema = this.schemaArray.controls
            .find((control, index) =>
                control.value && this.schemas?.[index]?.id)?.value;

        const data = {
            operation: 'SetSchema',
            value: selectedSchema
        };

        this.policyEngineService
            .setBlockData(this.id, this.policyId, data)
            .subscribe(() => {
                this.loadData();
            }, (e) => {
                console.error(e.error);
                this.loading = false;
            });
    }

    public onRefresh() {
        this.loading = true;
        const data = {
            operation: 'LoadDocuments'
        };
        this.policyEngineService
            .setBlockData(this.id, this.policyId, data)
            .subscribe(() => {
                this.loadData();
            }, (e) => {
                console.error(e.error);
                this.loading = false;
            });
    }

    public onBack({isPrev}: { isPrev: boolean } = {isPrev: false}): void {
        this.restart();

        if (isPrev) {
            this.prev()
        }
    }

    public restart(): void {
        this.loading = true;
        const data = {
            operation: 'Restart'
        };
        this.policyEngineService
            .setBlockData(this.id, this.policyId, data)
            .subscribe(() => {
                this.loadData();
            }, (e) => {
                console.error(e.error);
                this.loading = false;
            });
    }

    public verificationAll() {
        this.loading = true;
        const data = {
            operation: 'VerificationSchemas'
        };
        this.policyEngineService
            .setBlockData(this.id, this.policyId, data)
            .subscribe(() => {
                this.loadData();
            }, (e) => {
                console.error(e.error);
                this.loading = false;
            });
    }

    public prev(): void {
        if (this.stepIndex > 0) {
            this.stepIndex--;
        }
    }

    public next(): void {
        if (this.stepIndex < this.steps.length - 1) {
            this.stepIndex++;
        }
    }

    public applyMask(event: any): void {
        const input = event.target.value.replace(/\D/g, '');
        let masked = '';

        if (input.length >= 1) {
            masked += input.substring(0, 1);
        }
        if (input.length >= 2) {
            masked += '.' + input.substring(1, 2);
        }
        if (input.length >= 3) {
            masked += '.' + input.substring(2, 3);
        }
        if (input.length > 3) {
            masked += input.substring(3);
        }

        event.target.value = masked;
        this.topicForm.get('topicId')?.setValue(masked, {emitEvent: false});
    }

    private minLengthValidator(minLength: number) {
        return (control: AbstractControl): ValidationErrors | null => {
            const value = control.value || '';
            const digitsOnly = value.replace(/\./g, '').length;
            return digitsOnly >= minLength ? null : {minLength: true};
        };
    }

    get schemaArray(): FormArray {
        return this.schemaForm.get('schemaArray') as FormArray;
    }

    getFormControl(control: AbstractControl): FormControl {
        return control as FormControl;
    }

    private atLeastOneSelectedValidator(): ValidatorFn {
        return (formArray: AbstractControl): ValidationErrors | null => {
            const controls = (formArray as FormArray).controls;
            const isValid = controls.some(control => control.value);
            return isValid ? null : {required: true};
        };
    }
}
