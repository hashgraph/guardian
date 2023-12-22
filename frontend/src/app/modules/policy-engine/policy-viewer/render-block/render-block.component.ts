import {
    ChangeDetectorRef,
    Component,
    ComponentFactoryResolver,
    ComponentRef,
    ElementRef,
    Input,
    Renderer2,
    TemplateRef,
    ViewChild,
    ViewContainerRef,
} from '@angular/core';
import { RegisteredService } from '../../services/registered.service';
import { IBlock } from '../../structures';
import { PolicyProgressService } from '../../services/policy-progress.service';

/**
 * Component for display all blocks.
 */
@Component({
    selector: 'render-block',
    templateUrl: './render-block.component.html',
    styleUrls: ['./render-block.component.scss'],
})
export class RenderBlockComponent {
    @Input('block') block!: IBlock<any>;
    @Input('static') static!: any;
    @Input('policyId') policyId!: any;

    @ViewChild('target', { read: ViewContainerRef }) target!: ViewContainerRef;
    @ViewChild('empty', { read: TemplateRef }) empty!: TemplateRef<any>;

    private id: any;
    private blockType: any;
    private componentRef!: ComponentRef<any>;
    private isViewInitialized: boolean = false;

    constructor(
        private registeredService: RegisteredService,
        private componentFactoryResolver: ComponentFactoryResolver,
        private viewContainerRef: ViewContainerRef,
        private cdRef: ChangeDetectorRef,
        private elementRef: ElementRef,
        private renderer: Renderer2,
        private policyProgressService: PolicyProgressService,
    ) {
    }

    ngOnChanges() {
        this.render();
    }

    ngAfterViewInit() {
        this.isViewInitialized = true;
        this.render();
    }

    ngOnDestroy() {
        if (this.componentRef) {
            this.componentRef.destroy();
        }
    }

    render() {
        if (!this.isViewInitialized) {
            return;
        }

        if (this.block && this.block.id) {
            if (this.id != this.block.id) {
                this.id = this.block.id;
                this.blockType = this.block.blockType;

                const nativeElement = this.elementRef.nativeElement;
                this.renderer.setAttribute(nativeElement, 'block-uuid', this.block.id);

                this.policyProgressService.updateData({block: this.block, blockElement: nativeElement});
                this.policyProgressService.addBlock(this.block.id, this.block);

                this.loadComponent();
            }
        } else {
            this.target.clear();
        }

        this.cdRef.detectChanges();
    }

    loadComponent() {
        if (this.componentRef) {
            this.componentRef.destroy();
        }
        this.target.clear();
        const factory: any = this.registeredService.getFactory(this.blockType);
        if (factory) {
            let componentFactory = this.componentFactoryResolver.resolveComponentFactory(
                factory
            );
            this.componentRef = this.target.createComponent(componentFactory);
            this.componentRef.instance.id = this.id;
            this.componentRef.instance.static = this.static;
            this.componentRef.instance.policyId = this.policyId;
            this.componentRef.changeDetectorRef.detectChanges();

            this.policyProgressService.addComponentRef(this.id, this.componentRef);
        } else if (this.empty) {
            this.target.createEmbeddedView(this.empty);
        }
    }
}
