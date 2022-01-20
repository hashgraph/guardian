import { Component, ComponentFactoryResolver, Input, ViewContainerRef } from '@angular/core';
import { IBlock } from '../../helpers/tree-data-source/block';
import { ActionBlockComponent } from '../blocks/action-block/action-block.component';
import { ContainerBlockComponent } from '../blocks/container-block/container-block.component';
import { DocumentsSourceBlockComponent } from '../blocks/documents-source-block/documents-source-block.component';
import { InformationBlockComponent } from '../blocks/information-block/information-block.component';
import { RequestDocumentBlockComponent } from '../blocks/request-document-block/request-document-block.component';
import { StepBlockComponent } from '../blocks/step-block/step-block.component';
import { RolesBlockComponent } from '../blocks/roles-block/roles-block.component';
import { FiltersAddonBlockComponent } from '../blocks/filters-addon-block/filters-addon-block.component';
import { RegisteredBlocks } from '../../helpers/registered-blocks';


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

  id: any;
  blockType: any;

  constructor(
    public registeredBlocks: RegisteredBlocks,
    private componentFactoryResolver: ComponentFactoryResolver,
    private viewContainerRef: ViewContainerRef) {
  }

  ngOnChanges() {
    if (this.block && this.block.id) {
      if (this.id != this.block.id) {
        this.id = this.block.id;
        this.blockType = this.block.blockType;
        this.loadComponent();
      }
    } else {
      if (this.id != null) {
        this.id = null;
        this.blockType = null;
        this.viewContainerRef.clear();
      }
    }
  }

  loadComponent() {
    this.viewContainerRef.clear();
    const factory: any = this.registeredBlocks.getFactory(this.blockType);
    if (factory) {
      let componentFactory = this.componentFactoryResolver.resolveComponentFactory(factory);
      let componentRef: any = this.viewContainerRef.createComponent(componentFactory);
      componentRef.instance.id = this.id;
      componentRef.instance.static = this.static;
      componentRef.instance.policyId = this.policyId;
    }
  }
}