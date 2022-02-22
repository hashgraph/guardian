import {
  ChangeDetectorRef,
  Component,
  ComponentFactoryResolver,
  ComponentRef,
  Input,
  TemplateRef,
  ViewChild,
  ViewContainerRef
} from '@angular/core';
import { IBlock } from '../../helpers/tree-data-source/block';
import { RegisteredBlocks } from '../../registered-blocks';

/**
 * Component for display all blocks.
 */
@Component({
  selector: 'render-block',
  templateUrl: './render-block.component.html',
  styleUrls: ['./render-block.component.css']
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
    public registeredBlocks: RegisteredBlocks,
    private componentFactoryResolver: ComponentFactoryResolver,
    private viewContainerRef: ViewContainerRef,
    private cdRef: ChangeDetectorRef
  ) { }

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
    const factory: any = this.registeredBlocks.getFactory(this.blockType);
    if (factory) {
      let componentFactory = this.componentFactoryResolver.resolveComponentFactory(factory);
      this.componentRef = this.target.createComponent(componentFactory);
      this.componentRef.instance.id = this.id;
      this.componentRef.instance.static = this.static;
      this.componentRef.instance.policyId = this.policyId;
      this.componentRef.changeDetectorRef.detectChanges();
    } else if (this.empty) {
      this.target.createEmbeddedView(this.empty);
    }
  }
}

