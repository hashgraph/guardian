import { Component, Input, OnInit, Output, EventEmitter, SimpleChanges } from '@angular/core';
import { FlatBlockNode } from '../tree-flat-overview/tree-flat-overview';

@Component({
    selector: 'app-tree-node-actions',
    templateUrl: './tree-node-actions.component.html',
    styleUrls: ['./tree-node-actions.component.css'],
})
export class TreeNodeActionsComponent implements OnInit {
    @Input('node') node!: FlatBlockNode;
    @Input('visible') visible: boolean = true;
    @Input('visibleMoveActions') visibleMoveActions = false;

    @Output('delete') delete = new EventEmitter();
    @Output('visibleMoreActions') visibleMoreActions =
        new EventEmitter();
    @Output('dropUp') dropUp = new EventEmitter();
    @Output('dropDown') dropDown = new EventEmitter();
    @Output('dropLeft') dropLeft = new EventEmitter();
    @Output('dropRight') dropRight = new EventEmitter();

    onHoverVisible = false;
    constructor() {}

    ngOnInit(): void {}

    ngOnChanges(changes: SimpleChanges) {
        if (
            changes.visibleMoveActions &&
            !changes.visibleMoveActions.currentValue
        ) {
            // fix onHoverVisible when you fold move actions (clicking on right down corner of more-horiz button).
            this.onHoverVisible = false;
        }
    }

    onDelete(event: any) {
        this.delete.emit(event);
    }

    onVisibleMoreActions(event: any) {
        this.visibleMoreActions.emit(event);
    }

    onDropUp(event: any) {
        this.dropUp.emit(event);
    }

    onDropDown(event: any) {
        this.dropDown.emit(event);
    }

    onDropLeft(event: any) {
        this.dropLeft.emit(event);
    }

    onDropRight(event: any) {
        this.dropRight.emit(event);
    }
}
