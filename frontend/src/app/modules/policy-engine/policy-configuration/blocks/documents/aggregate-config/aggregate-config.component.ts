import {Component, EventEmitter, Input, OnInit, Output, SimpleChanges, ViewEncapsulation} from '@angular/core';
import {IModuleVariables, PolicyBlock} from '../../../../structures';

/**
 * Settings for block of 'aggregateDocument' type.
 */
@Component({
    selector: 'aggregate-config',
    templateUrl: './aggregate-config.component.html',
    styleUrls: ['./aggregate-config.component.scss'],
    encapsulation: ViewEncapsulation.Emulated,
    standalone: false
})
export class AggregateConfigComponent implements OnInit {
    @Input('block') currentBlock!: PolicyBlock;
    @Input('readonly') readonly!: boolean;
    @Output() onInit = new EventEmitter();

    private moduleVariables!: IModuleVariables | null;
    private item!: PolicyBlock;

    propHidden: any = {
        main: false,
        options: false,
        expressionsGroup: false,
        expressions: {},
    };

    properties!: any;
    allTimer!: PolicyBlock[];

    private expressionsGroupInitialized = false;

    public aggregateTypeOptions = [
        {label: 'Period', value: 'period'},
        {label: 'Cumulative Dimension', value: 'cumulative'}
    ];

    ngOnInit(): void {
        this.onInit.emit(this);
        this.load(this.currentBlock);
    }

    ngOnChanges(changes: SimpleChanges) {
        this.load(this.currentBlock);
    }

    load(block: PolicyBlock) {
        this.moduleVariables = block.moduleVariables;
        this.item = block;
        this.properties = block.properties;
        this.properties.expressions = this.properties.expressions || [];
        this.properties.uiMetaData = this.properties.uiMetaData || {}
        if (!this.expressionsGroupInitialized) {
            this.propHidden.expressionsGroup = this.properties.expressions.length === 0;
            this.expressionsGroupInitialized = true;
        }
    }

    onHide(item: any, prop: any) {
        item[prop] = !item[prop];
    }

    addExpression() {
        this.properties.expressions.push({
            name: '',
            value: '',
        })
        this.propHidden.expressionsGroup = false;
    }

    onRemoveExpression(i: number) {
        this.properties.expressions.splice(i, 1);
        if (this.properties.expressions.length === 0) {
            this.propHidden.expressionsGroup = true;
        }
    }

    onSave() {
        this.item.changed = true;
    }
}
