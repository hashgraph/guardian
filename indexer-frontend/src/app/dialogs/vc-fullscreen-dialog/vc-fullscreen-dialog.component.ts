import { Component, ElementRef } from '@angular/core';
import { DialogService, DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { FormulaFiles, FormulaItem, FormulasTree, SchemaItem } from '../../models/formula-tree';
import { TreeListData, TreeListItem, TreeListView } from '../../models/tree-list';
import { MathLiveComponent } from '@components/math-live/math-live.component';
import { TabViewModule } from 'primeng/tabview';
import { TranslocoModule } from '@jsverse/transloco';
import { SchemaFormViewComponent } from '@components/schema-form-view/schema-form-view.component';
import { CommentsComponent } from '@components/comments/comments.component';

@Component({
    standalone: true,
    selector: 'vc-fullscreen-dialog',
    templateUrl: './vc-fullscreen-dialog.component.html',
    styleUrls: ['./vc-fullscreen-dialog.component.scss'],
    imports: [
        TranslocoModule,
        TabViewModule,
        SchemaFormViewComponent,
        CommentsComponent
    ]
})
export class VCFullscreenDialog {
    public loading = true;
    public title: string;
    public schema: any;
    public credentialSubject: any;
    public formulasResults: any | null;
    public targetId: string;
    public discussionId: string;
    public discussion: any;
    public key: string;
    public privateFields = {
        '@context': true,
        'type': true,
        'policyId': true,
        'ref': true
    };

    constructor(
        public ref: DynamicDialogRef,
        public config: DynamicDialogConfig,
        private dialogService: DialogService,
        private el: ElementRef
    ) {
        this.title = this.config.data?.title;
        this.schema = this.config.data?.schema;
        this.credentialSubject = this.config.data?.credentialSubject;
        this.formulasResults = this.config.data?.formulasResults;

        this.targetId = this.config.data?.targetId;
        this.discussionId = this.config.data?.discussionId;
        this.discussion = this.config.data?.discussion;
        this.key = this.config.data?.key;
    }

    ngOnInit() {

    }

    ngOnDestroy() {
    }

    public onClose(): void {
        this.ref.close(null);
    }

    public onLinkField($event: any) {
        setTimeout(() => {
            this.el.nativeElement
                ?.querySelector('.form')
                ?.querySelector(`[field-id="${$event}"]`)
                ?.scrollIntoView();
        }, 0);
    }
}
