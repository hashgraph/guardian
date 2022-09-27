import { Component, ComponentFactoryResolver, EventEmitter, Input, OnInit, Output, SimpleChanges, ViewChild, ViewContainerRef } from '@angular/core';
import { Schema, Token } from '@guardian/interfaces';
import { RegisteredBlocks } from '../../registered-blocks';
import { BlockNode } from '../../helpers/tree-data-source/tree-data-source';
import { PolicyBlockModel } from '../../structures/policy-model';

/**
 * Settings for all blocks.
 */
@Component({
    selector: 'json-properties',
    templateUrl: './json-properties.component.html',
    styleUrls: ['./json-properties.component.css']
})
export class JsonPropertiesComponent implements OnInit {
    @ViewChild("configContainer", { read: ViewContainerRef }) configContainer!: ViewContainerRef;

    @Input('block') currentBlock!: PolicyBlockModel;
    @Input('readonly') readonly!: boolean;

    @Output() onInit = new EventEmitter();

    propHidden: any = {
        metaData: false,
    };

    block!: PolicyBlockModel;

    codeMirrorOptions: any = {
        theme: 'default',
        mode: 'application/ld+json',
        styleActiveLine: true,
        lineNumbers: true,
        lineWrapping: true,
        foldGutter: true,
        gutters: [
            'CodeMirror-linenumbers',
            'CodeMirror-foldgutter',
            'CodeMirror-lint-markers'
        ],
        autoCloseBrackets: true,
        matchBrackets: true,
        lint: true,
        readOnly: false,
        viewportMargin: Infinity
    };

    code!: string;
    errors: any[] = [];

    constructor(
        public registeredBlocks: RegisteredBlocks,
        private componentFactoryResolver: ComponentFactoryResolver
    ) {
        this.codeMirrorOptions.mode = 'application/ld+json';
    }

    ngOnInit(): void {
        this.onInit.emit(this);
        this.load(this.currentBlock);
    }

    ngOnChanges(changes: SimpleChanges) {
        this.load(this.currentBlock);
    }

    onHide(item: any, prop: any) {
        item[prop] = !item[prop];
    }

    load(block: PolicyBlockModel) {
        this.errors = [];
        this.block = block;
        if (this.block) {
            this.code = JSON.stringify(block.getJSON(), null, 2);
        } else {
            this.code = '';
        }
    }

    onClose() {
        this.load(this.block);
    }

    onSave() {
        try {
            const block = JSON.parse(this.code);
            this.block.rebuild(block)
        } catch (error: any) {
            this.errors = [error.message];
        }
    }
}
