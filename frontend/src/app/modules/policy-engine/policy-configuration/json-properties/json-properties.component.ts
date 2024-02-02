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
import { PolicyBlock } from "../../structures/";

/**
 * Settings for all blocks.
 */
@Component({
    selector: 'json-properties',
    templateUrl: './json-properties.component.html',
    styleUrls: ['./json-properties.component.scss']
})
export class JsonPropertiesComponent implements OnInit {
    @ViewChild("configContainer", { read: ViewContainerRef }) configContainer!: ViewContainerRef;

    @Input('block') currentBlock!: PolicyBlock;
    @Input('readonly') readonly!: boolean;

    propHidden: any = {
        metaData: false,
    };

    block!: PolicyBlock;

    codeMirrorOptions: any = {
        theme: 'default',
        mode: 'policy-json-lang',
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
        this.codeMirrorOptions.mode = 'policy-json-lang';
    }

    ngOnInit(): void {
    }

    ngOnChanges(changes: SimpleChanges) {
        this.codeMirrorOptions.readOnly = !!this.readonly;
        this.load(this.currentBlock);
    }

    onHide(item: any, prop: any) {
        item[prop] = !item[prop];
    }

    load(block: PolicyBlock) {
        this.loading = false;
        this.errors = [];
        this.block = block;
        if (this.block) {
            const json = block.getJSON();
            delete json.children;
            delete json.artifacts;
            delete json.events;
            delete json.innerEvents;

            this.code = JSON.stringify(json, null, 2);
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
