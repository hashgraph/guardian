import {
    Component,
    ElementRef,
    EventEmitter,
    HostListener,
    Input,
    OnInit,
    Output,
    ViewChild,
} from '@angular/core';
import { StepTreeComponent } from '../step-tree/step-tree.component';

@Component({
    selector: 'app-separate-stepper',
    templateUrl: './separate-stepper.component.html',
    styleUrls: ['./separate-stepper.component.scss'],
})
export class SeparateStepperComponent implements OnInit {
    mousePosition!: any;
    resizeFunc!: any;
    hasPrevStep: boolean = false;
    hasNextStep: boolean = false;

    @ViewChild(StepTreeComponent) matTree!: StepTreeComponent;
    @ViewChild('stepperContainer', { read: ElementRef })
    stepperContainer!: ElementRef;

    @Input('treeData') treeData!: any;
    @Input('currentNode') currentNode: any;

    @Output('currentNodeChange') currentNodeChange: EventEmitter<any> =
        new EventEmitter();

    constructor() {}

    ngOnInit(): void {}

    ngOnChanges(): void {
        this.setHasPrevNextButtonsVisible();
    }

    setHasPrevNextButtonsVisible() {
        if (this.currentNode) {
            this.hasPrevStep = !!this.getPrevNode();
            this.hasNextStep = !!this.getNextNode();
        }
    }

    onNextClick() {
        const nextNode = this.getNextNode();
        if (nextNode) {
            this.currentNode = nextNode;
            this.hasNextStep = !!this.getNextNode();
            this.currentNodeChange.emit(this.currentNode);
        }
    }

    getNextNode() {
        if (this.currentNode.children && this.currentNode.children[0]) {
            return this.currentNode.children[0];
        } else {
            return this.findNextNode(this.currentNode);
        }
    }

    findNextNode(node: any): any {
        if (!node) {
            return;
        }
        const nextNode =
            node.parent?.children &&
            node.parent.children[node.parent.children.indexOf(node) + 1];
        return nextNode || this.findNextNode(node?.parent);
    }

    onPrevClick() {
        const prevNode = this.getPrevNode();
        if (prevNode) {
            this.currentNode = prevNode;
            this.hasPrevStep = !!this.getPrevNode();
            this.currentNodeChange.emit(this.currentNode);
        }
    }

    getPrevNode() {
        const prevNode =
            this.currentNode?.parent?.children &&
            this.currentNode.parent.children[
                this.currentNode.parent.children.indexOf(this.currentNode) - 1
            ];
        if (prevNode) {
            return this.findPrevNode(prevNode);
        } else if (this.currentNode?.parent !== this.treeData) {
            return this.currentNode.parent;
        }
    }

    findPrevNode(node: any): any {
        return (
            (node?.children &&
                this.findPrevNode(node.children[node.children.length - 1])) ||
            node
        );
    }

    refreshTree() {
        this.matTree.refreshTree();
        this.setHasPrevNextButtonsVisible();
    }

    onSelectNode(node: any) {
        this.currentNode = node;
        this.currentNodeChange.emit(node);
    }

    resize(e: any, target: any) {
        const dx = this.mousePosition - e.x;
        this.mousePosition = e.x;
        target.style.width =
            parseInt(getComputedStyle(target).width) - dx + 'px';
    }

    onStartResizeDivider(e: any) {
        if (e.offsetX < e.currentTarget.offsetWidth - 9) {
            return;
        }
        this.stepperContainer.nativeElement.style.userSelect = 'none';
        this.mousePosition = e.x;
        this.resizeFunc = (ev: any) => this.resize.apply(this, [ev, e.target]);
        document.addEventListener('mousemove', this.resizeFunc, false);
    }

    @HostListener('document:mouseup', ['$event'])
    onEndResize(e: any) {
        this.stepperContainer.nativeElement.style.userSelect = '';
        document.removeEventListener('mousemove', this.resizeFunc, false);
    }
}
