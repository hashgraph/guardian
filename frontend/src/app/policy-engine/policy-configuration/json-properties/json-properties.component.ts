import {
    Component,
    ComponentFactoryResolver,
    EventEmitter,
    Input,
    OnInit,
    Output,
    SimpleChanges,
    ViewChild,
    ViewContainerRef
} from '@angular/core';
import { PolicyBlockModel } from "../../structures/";

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
    loading: boolean = false;

    constructor(
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
        this.loading = false;
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
            this.loading = true;
            const block = JSON.parse(this.code);
            this.block.rebuild(block);
            setTimeout(() => {
                this.loading = false;
            }, 250);
        } catch (error: any) {
            this.errors = [error.message];
            this.loading = false;
        }
    }
}
