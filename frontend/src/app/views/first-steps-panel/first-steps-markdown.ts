/*
 * Renders the authored First Steps markdown for the drawer. Uses `marked` for
 * standard GitHub-Flavored Markdown, extended with a small set of GitBook block
 * constructs so a page authored/managed in GitBook renders correctly in the app:
 *   {% hint %}, {% stepper %}/{% step %}, {% tabs %}/{% tab %}, {% code %},
 *   {% content-ref %}, and <details>/<summary>.
 * Any other GitBook block (`{% ... %}`) falls back to its inner markdown so the
 * page never shows raw `{% tag %}` text. A leading YAML front-matter block is
 * stripped. Output is bound through Angular's default [innerHTML] sanitizer.
 * Links written as `app://<route>` are resolved to same-origin relative
 * anchors; every other link opens in a new tab.
 */
import { marked, TokenizerAndRendererExtension, Tokens } from 'marked';

interface WrapToken extends Tokens.Generic {
    innerTokens: Tokens.Generic[];
}

function attr(params: string, name: string): string {
    const m = new RegExp(`${name}="([^"]*)"`).exec(params || '');
    return m ? m[1] : '';
}

// Authored in-app links carry no host: `app://policy-viewer`. The scheme is
// resolved here into a root-relative path, because Angular's sanitizer rewrites an
// unknown scheme to `unsafe:` and the anchor would stop working.
const INTERNAL_SCHEME = 'app://';

function resolveInternalHref(href: string): string | null {
    if (!href.startsWith(INTERNAL_SCHEME)) {
        return null;
    }
    const route = href.slice(INTERNAL_SCHEME.length).replace(/^\/+/, '');
    return `/${route}`;
}

function escapeAttr(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

const hintExtension: TokenizerAndRendererExtension = {
    name: 'gbHint',
    level: 'block',
    start(src) { const i = src.indexOf('{% hint'); return i < 0 ? undefined : i; },
    tokenizer(src) {
        const m = /^{% hint([^%]*)%}\s*([\s\S]*?)\s*{% endhint %}/.exec(src);
        if (!m) { return undefined; }
        const style = attr(m[1], 'style') || 'info';
        return { type: 'gbHint', raw: m[0], style, innerTokens: this.lexer.blockTokens(m[2]) } as WrapToken;
    },
    renderer(token) {
        const t = token as WrapToken;
        return `<div class="fs-block-hint fs-block-hint--${t['style']}">${this.parser.parse(t.innerTokens)}</div>`;
    }
};

const stepperExtension: TokenizerAndRendererExtension = {
    name: 'gbStepper',
    level: 'block',
    start(src) { const i = src.indexOf('{% stepper'); return i < 0 ? undefined : i; },
    tokenizer(src) {
        const m = /^{% stepper %}\s*([\s\S]*?)\s*{% endstepper %}/.exec(src);
        if (!m) { return undefined; }
        const stepRe = /{% step %}\s*([\s\S]*?)\s*{% endstep %}/g;
        const steps: Tokens.Generic[][] = [];
        let sm: RegExpExecArray | null;
        while ((sm = stepRe.exec(m[1])) !== null) {
            steps.push(this.lexer.blockTokens(sm[1]));
        }
        return { type: 'gbStepper', raw: m[0], steps } as Tokens.Generic;
    },
    renderer(token) {
        const steps = (token['steps'] || []) as Tokens.Generic[][];
        const items = steps.map((tokens, i) =>
            `<li class="fs-block-step">` +
            `<span class="fs-block-step-num">${i + 1}</span>` +
            `<div class="fs-block-step-body">${this.parser.parse(tokens)}</div>` +
            `</li>`).join('');
        return `<ol class="fs-block-stepper">${items}</ol>`;
    }
};

const tabsExtension: TokenizerAndRendererExtension = {
    name: 'gbTabs',
    level: 'block',
    start(src) { const i = src.indexOf('{% tabs'); return i < 0 ? undefined : i; },
    tokenizer(src) {
        const m = /^{% tabs %}\s*([\s\S]*?)\s*{% endtabs %}/.exec(src);
        if (!m) { return undefined; }
        const tabRe = /{% tab([^%]*)%}\s*([\s\S]*?)\s*{% endtab %}/g;
        const tabs: { title: string; tokens: Tokens.Generic[] }[] = [];
        let tm: RegExpExecArray | null;
        while ((tm = tabRe.exec(m[1])) !== null) {
            tabs.push({ title: attr(tm[1], 'title'), tokens: this.lexer.blockTokens(tm[2]) });
        }
        return { type: 'gbTabs', raw: m[0], tabs } as Tokens.Generic;
    },
    renderer(token) {
        // No JS runs in [innerHTML]; render tabs as stacked, titled sections.
        const tabs = (token['tabs'] || []) as { title: string; tokens: Tokens.Generic[] }[];
        const sections = tabs.map((tab) =>
            `<div class="fs-block-tab">` +
            (tab.title ? `<div class="fs-block-tab-title">${tab.title}</div>` : '') +
            this.parser.parse(tab.tokens) +
            `</div>`).join('');
        return `<div class="fs-block-tabs">${sections}</div>`;
    }
};

const codeExtension: TokenizerAndRendererExtension = {
    name: 'gbCode',
    level: 'block',
    start(src) { const i = src.indexOf('{% code'); return i < 0 ? undefined : i; },
    tokenizer(src) {
        const m = /^{% code([^%]*)%}\s*([\s\S]*?)\s*{% endcode %}/.exec(src);
        if (!m) { return undefined; }
        return { type: 'gbCode', raw: m[0], title: attr(m[1], 'title'), innerTokens: this.lexer.blockTokens(m[2]) } as WrapToken;
    },
    renderer(token) {
        const t = token as WrapToken;
        const head = t['title'] ? `<div class="fs-block-code-title">${t['title']}</div>` : '';
        return `<div class="fs-block-code">${head}${this.parser.parse(t.innerTokens)}</div>`;
    }
};

const contentRefExtension: TokenizerAndRendererExtension = {
    name: 'gbContentRef',
    level: 'block',
    start(src) { const i = src.indexOf('{% content-ref'); return i < 0 ? undefined : i; },
    tokenizer(src) {
        const m = /^{% content-ref([^%]*)%}\s*([\s\S]*?)\s*{% endcontent-ref %}/.exec(src);
        if (!m) { return undefined; }
        return { type: 'gbContentRef', raw: m[0], url: attr(m[1], 'url'), innerTokens: this.lexer.blockTokens(m[2]) } as WrapToken;
    },
    renderer(token) {
        const t = token as WrapToken;
        return `<div class="fs-block-content-ref">${this.parser.parse(t.innerTokens)}</div>`;
    }
};

const detailsExtension: TokenizerAndRendererExtension = {
    name: 'gbDetails',
    level: 'block',
    start(src) { const i = src.indexOf('<details'); return i < 0 ? undefined : i; },
    tokenizer(src) {
        const m = /^<details>\s*<summary>([\s\S]*?)<\/summary>\s*([\s\S]*?)<\/details>/.exec(src);
        if (!m) { return undefined; }
        return { type: 'gbDetails', raw: m[0], summary: m[1].trim(), innerTokens: this.lexer.blockTokens(m[2].trim()) } as WrapToken;
    },
    renderer(token) {
        const t = token as WrapToken;
        return `<details class="fs-block-details"><summary>${t['summary']}</summary>` +
            `<div class="fs-block-details-body">${this.parser.parse(t.innerTokens)}</div></details>`;
    }
};

// Fallback for any other GitBook block: keep the inner markdown, drop the wrapper
// tags, so unsupported blocks never appear as raw `{% tag %}` text.
const genericExtension: TokenizerAndRendererExtension = {
    name: 'gbGeneric',
    level: 'block',
    start(src) { const i = src.indexOf('{%'); return i < 0 ? undefined : i; },
    tokenizer(src) {
        const paired = /^{% (\w+)[^%]*%}\s*([\s\S]*?)\s*{% end\1 %}/.exec(src);
        if (paired) {
            return { type: 'gbGeneric', raw: paired[0], innerTokens: this.lexer.blockTokens(paired[2]) } as WrapToken;
        }
        const selfClosing = /^{%[^%]*%}/.exec(src);
        if (selfClosing) {
            return { type: 'gbGeneric', raw: selfClosing[0], innerTokens: [] } as WrapToken;
        }
        return undefined;
    },
    renderer(token) {
        const t = token as WrapToken;
        return t.innerTokens.length ? this.parser.parse(t.innerTokens) : '';
    }
};

marked.use({
    gfm: true,
    renderer: {
        link(href: string, title: string | null | undefined, text: string): string {
            const safeHref = escapeAttr(href || '');
            const titleAttr = title ? ` title="${escapeAttr(title)}"` : '';
            if (!href || href.startsWith('#') || href.startsWith('mailto:')) {
                return `<a href="${safeHref}"${titleAttr}>${text}</a>`;
            }
            const internal = resolveInternalHref(href);
            if (internal) {
                return `<a class="fs-link fs-link--internal" href="${escapeAttr(internal)}"${titleAttr}>${text}</a>`;
            }
            return `<a class="fs-link fs-link--external" href="${safeHref}"${titleAttr} target="_blank" rel="noopener noreferrer">${text}</a>`;
        }
    },
    extensions: [
        hintExtension,
        stepperExtension,
        tabsExtension,
        codeExtension,
        contentRefExtension,
        detailsExtension,
        genericExtension
    ]
});

function stripFrontMatter(markdown: string): string {
    const normalized = markdown.replace(/\r\n/g, '\n');
    if (normalized.startsWith('---\n')) {
        const end = normalized.indexOf('\n---', 4);
        if (end !== -1) {
            const after = normalized.indexOf('\n', end + 1);
            return after !== -1 ? normalized.slice(after + 1) : '';
        }
    }
    return normalized;
}

export function renderFirstStepsMarkdown(markdown: string): string {
    const body = stripFrontMatter(markdown);
    try {
        const rendered = marked.parse(body);
        return typeof rendered === 'string' ? rendered : '';
    } catch {
        return '';
    }
}
