import {Component, ComponentFactoryResolver, Input, ViewContainerRef} from '@angular/core';
import {IBlock} from '../../data-source/block';
import {ActionBlockComponent} from '../action-block/action-block.component';
import {ContainerBlockComponent} from '../container-block/container-block.component';
import {DocumentsSourceBlockComponent} from '../documents-source-block/documents-source-block.component';
import {InformationBlockComponent} from '../information-block/information-block.component';
import {RequestDocumentBlockComponent} from '../request-document-block/request-document-block.component';
import {StepBlockComponent} from '../step-block/step-block.component';

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
    let componentFactory: any = null;
    switch (this.blockType) {
      case 'interfaceContainerBlock': {
        componentFactory = this.componentFactoryResolver.resolveComponentFactory(ContainerBlockComponent);
        break;
      }
      case 'interfaceDocumentsSource': {
        componentFactory = this.componentFactoryResolver.resolveComponentFactory(DocumentsSourceBlockComponent);
        break;
      }
      case 'requestVcDocument': {
        componentFactory = this.componentFactoryResolver.resolveComponentFactory(RequestDocumentBlockComponent);
        break;
      }
      case 'interfaceAction': {
        componentFactory = this.componentFactoryResolver.resolveComponentFactory(ActionBlockComponent);
        break;
      }
      case 'interfaceStepBlock': {
        componentFactory = this.componentFactoryResolver.resolveComponentFactory(StepBlockComponent);
        break;
      }
      case 'informationBlock': {
        componentFactory = this.componentFactoryResolver.resolveComponentFactory(InformationBlockComponent);
        break;
      }
    }
    if (componentFactory) {
      console.log('render: ', this.blockType);
      let componentRef: any = this.viewContainerRef.createComponent(componentFactory);
      componentRef.instance.id = this.id;
      componentRef.instance.static = this.static;
      componentRef.instance.policyId = this.policyId;
    }
  }
}