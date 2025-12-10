import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnInit, } from '@angular/core';
import { PolicyEngineService } from 'src/app/services/policy-engine.service';
import { WebSocketService } from 'src/app/services/web-socket.service';
import { HttpErrorResponse } from '@angular/common/http';
import { ToastrService } from 'ngx-toastr';
import { PolicyStatus } from '@guardian/interfaces';

/**
 * Component for display block of 'Transformation Button Block' type.
 */
@Component({
    selector: 'transformation-button-block',
    templateUrl: './transformation-button-block.component.html',
    styleUrls: ['./transformation-button-block.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class TransformationButtonBlockComponent implements OnInit {
    @Input('id') id!: string;
    @Input('policyId') policyId!: string;
    @Input('static') static!: any;
    @Input('policyStatus') policyStatus!: string;

    loading: boolean = true;
    socket: any;
    data: any;
    buttonName: string;
    hideWhenDiscontinued?: boolean;
    url: string;
    readonly: boolean = false;
    commonVisible: boolean = false;
    private readonly _commentField: string = 'option.comment';

    constructor(
        private policyEngineService: PolicyEngineService,
        private wsService: WebSocketService,
        private cdref: ChangeDetectorRef,
        private toastr: ToastrService
    ) {
    }

    ngOnInit(): void {
        if (!this.static) {
            this.socket = this.wsService.blockSubscribe(
                this.onUpdate.bind(this)
            );
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
        if (this.static) {
            this.setData(this.static);
            setTimeout(() => {
                this.loading = false;
                this.cdref.detectChanges();
                this.commonVisible = true;
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
            this.commonVisible = true;
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
            this.readonly = !!data.readonly;
            this.data = data.data;
            this.buttonName = data.buttonName;
            this.hideWhenDiscontinued = !!data.hideWhenDiscontinued;
            this.url = data.url;
        } else {
            this.data = null;
        }
    }

    isBtnVisible() {
        if (this.policyStatus === PolicyStatus.DISCONTINUED && this.hideWhenDiscontinued) {
            return false;
        }

        return true;
    }

    onClick() {
        this.loading = true;
        this.commonVisible = false;
        this.policyEngineService.setBlockData(this.id, this.policyId, this.data).subscribe(
            (data) => {
                this.commonVisible = true;
                this.loading = false;
                if (data) {
                    const token = localStorage.getItem('accessToken') as string;
                    this.policyEngineService
                        .sendData(data.url, data.data, token).subscribe((data) => {
                            this.toastr.success(`The data was sent to ${data.url}`, '', {
                                timeOut: 3000,
                                closeButton: true,
                                positionClass: 'toast-bottom-right',
                                enableHtml: true,
                            });
                        }, (error) => {
                            console.log(error);
                            this.toastr.error(`An error occurred while sending the data to ${data.url}`, '', {
                                timeOut: 3000,
                                closeButton: true,
                                positionClass: 'toast-bottom-right',
                                enableHtml: true,
                            });
                        })
                }

                this.cdref.detectChanges();
            },
            (e) => {
                this.commonVisible = true;
                console.error(e.error);
                this.loading = false;
            });
    }
}
