import { Component, ComponentFactoryResolver, EventEmitter, Input, OnInit, Output, SimpleChanges, ViewChild, ViewContainerRef } from '@angular/core';
import { Schema, Token } from 'interfaces';
import { RegisteredBlocks } from '../../registered-blocks';
import { BlockNode } from '../../helpers/tree-data-source/tree-data-source';

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

    @Input('block') currentBlock!: BlockNode;
    @Input('schemes') schemes!: Schema[];
    @Input('tokens') tokens!: Token[];
    @Input('all') allBlocks!: BlockNode[];
    @Input('readonly') readonly!: boolean;
    @Input('roles') roles!: string[];
    @Output() onInit = new EventEmitter();

    propHidden: any = {
        metaData: false,
    };

    block!: BlockNode;

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

    load(block: BlockNode) {
        this.errors = [];
        this.block = block;
        if (this.block) {
            const block = { ...this.block } as any;
            delete block.children;
            this.code = JSON.stringify(block, null, 2);
        } else {
            this.code = '';
        }
    }

    onClose() {
        this.errors = [];
        if (this.block) {
            const block = { ...this.block } as any;
            delete block.children;
            this.code = JSON.stringify(block, null, 2);
        } else {
            this.code = '';
        }
    }

    onSave() {
        try {
            const block = JSON.parse(this.code);
            delete block.children;
            const keys = Object.keys(block);
            for (let i = 0; i < keys.length; i++) {
                const key = keys[i];
                this.block[key] = block[key];
            }
        } catch (error: any) {
            this.errors = [error.message];
        }
    }
}
