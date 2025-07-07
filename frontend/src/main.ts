import { enableProdMode } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app/app.module';
import { environment } from './environments/environment';

// import 'codemirror/addon/lint/lint';
// import 'codemirror/addon/lint/json-lint';
import 'codemirror/lib/codemirror';
import 'codemirror/mode/javascript/javascript';
import 'codemirror/mode/markdown/markdown';
import 'codemirror/mode/yaml/yaml';
import 'codemirror/addon/fold/foldcode';
import 'codemirror/addon/fold/foldgutter';
import 'codemirror/addon/fold/brace-fold';
import 'codemirror/addon/fold/indent-fold';
import 'codemirror/addon/edit/closebrackets';
import 'codemirror/addon/edit/matchbrackets';

import { FormulaEngine } from '@guardian/interfaces';
import * as formulajs from '@formulajs/formulajs'
import { create, all, ImportObject } from 'mathjs';

function createMathjs() {
    const mathjs = create(all);
    const exclude = new Set(['PI'])
    const customFunctions: ImportObject = {};
    for (const [name, f] of Object.entries(formulajs)) {
        if (typeof f === 'function' && !exclude.has(name)) {
            customFunctions[name] = function (...args: any) {
                return (f as any).apply(null, args);
            }
        }
    }
    mathjs.import(customFunctions, { override: true });
    mathjs.import({
        equal: function (a: any, b: any) { return a == b }
    }, { override: true });
    return mathjs;
}

FormulaEngine.setMathEngine(createMathjs())

if (environment.production) {
    enableProdMode();
}

platformBrowserDynamic().bootstrapModule(AppModule)
    .catch(err => console.error(err));
