import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { createRequire } from 'node:module';
import { describe, it } from 'node:test';

const require = createRequire(import.meta.url);
const { createBrowserRecorder, describeLoadingElements, formatDiagnostics, registerFailureDiagnostics } =
    require('../cypress/support/failureDiagnostics.js');

// A window with just what the recorder wraps: the console, XMLHttpRequest and fetch.
function fakeWindow() {
    const logged = [];
    class FakeXhr extends EventEmitter {
        open() {}
        send() {}
        addEventListener(event, listener) { this.on(event, listener); }
        // Angular asks for text and parses the JSON itself
        answer(body = '') {
            this.status = 200;
            this.response = this.responseText = body;
            this.emit('load');
            this.emit('loadend');
        }
    }
    let answerFetch;
    return {
        logged,
        console: { error: (...args) => logged.push(['error', ...args]), warn: (...args) => logged.push(['warn', ...args]) },
        XMLHttpRequest: FakeXhr,
        fetch: () => new Promise((resolve) => { answerFetch = resolve; }),
        answerFetch: () => answerFetch({ ok: true }),
    };
}

// An element tree with the parentElement links, tag names and attributes a browser gives.
function element(tagName, parent = null, attributes = {}) {
    return { tagName: tagName.toUpperCase(), parentElement: parent, getAttribute: (name) => attributes[name] ?? null };
}

describe('createBrowserRecorder', () => {
    it('lists the requests that have not been answered yet', async () => {
        const win = fakeWindow();
        const recorder = createBrowserRecorder(win, () => 1000);

        const answered = new win.XMLHttpRequest();
        answered.open('get', '/api/v1/policies');
        answered.send();
        const waiting = new win.XMLHttpRequest();
        waiting.open('get', '/api/v1/policies/p1/blocks/b1');
        waiting.send();
        const fetched = win.fetch('/api/v1/tokens', { method: 'post' });
        answered.answer();

        assert.deepEqual([...recorder.pendingRequests.values()].map(({ method, url }) => `${method} ${url}`),
            ['GET /api/v1/policies/p1/blocks/b1', 'POST /api/v1/tokens']);
        win.answerFetch();
        await fetched;
        assert.equal(recorder.pendingRequests.size, 1);
    });

    it('records console errors and warnings as text, and still prints them', () => {
        const win = fakeWindow();
        const recorder = createBrowserRecorder(win, () => 0);

        win.console.error('Block failed', new Error('Block Unavailable'));
        win.console.warn({ status: 503 });

        assert.equal(win.logged.length, 2, 'the app console still gets every message');
        assert.deepEqual(recorder.consoleEntries.map(({ level, text }) => `${level}: ${text}`),
            ['error: Block failed Error: Block Unavailable', 'warn: {"status":503}']);
    });

    it('keeps only the last 20 console entries', () => {
        const win = fakeWindow();
        const recorder = createBrowserRecorder(win, () => 0);

        for (let i = 0; i < 25; i++) {
            win.console.error(`error ${i}`);
        }

        assert.equal(recorder.consoleEntries.length, 20);
        assert.equal(recorder.consoleEntries.at(0).text, 'error 5');
        assert.equal(recorder.consoleEntries.at(-1).text, 'error 24');
    });
});

describe('policy block tags', () => {
    it('names a block by the tag the policy config gives its uuid', () => {
        const win = fakeWindow();
        const recorder = createBrowserRecorder(win, () => 0);
        const policy = new win.XMLHttpRequest();
        policy.open('GET', '/api/v1/policies/p1');
        policy.send();
        policy.answer(JSON.stringify({
            id: 'p1',
            config: {
                id: 'uuid-root', tag: 'root', blockType: 'interfaceContainerBlock',
                children: [{ id: 'uuid-btn', tag: 'revoke_vvb_own_document_btn', blockType: 'buttonBlock', children: [] }],
            },
        }));

        const viewer = element('policy-viewer', element('body'));
        const root = element('render-block', viewer, { 'block-uuid': 'uuid-root' });
        const button = element('render-block', element('container-block', root), { 'block-uuid': 'uuid-btn' });
        const unknown = element('render-block', viewer, { 'block-uuid': 'uuid-unknown' });
        const overlays = [element('div', element('button-block', button)), element('div', element('button-block', unknown))];
        const document = { querySelectorAll: (selector) => (selector === 'div.loading' ? overlays : []) };

        assert.deepEqual(describeLoadingElements(document, recorder.blockTags).map(({ path }) => path), [
            'policy-viewer > render-block[root] > container-block > render-block[revoke_vvb_own_document_btn] > button-block',
            'policy-viewer > render-block[uuid-unknown] > button-block',
        ]);
    });

    it('notes a policy it cannot read instead of failing the page', () => {
        const win = fakeWindow();
        const recorder = createBrowserRecorder(win, () => 0);
        const policy = new win.XMLHttpRequest();
        policy.open('GET', '/api/v1/policies/p1');
        policy.send();
        policy.answer('<html>');

        assert.equal(recorder.blockTags.size, 0);
        assert.match(recorder.consoleEntries.at(-1).text, /^policy of \/api\/v1\/policies\/p1 unreadable/);
    });

    it('reads no tags from the other policy requests', () => {
        const win = fakeWindow();
        const recorder = createBrowserRecorder(win, () => 0);
        const blocks = new win.XMLHttpRequest();
        blocks.open('GET', '/api/v1/policies/p1/blocks');
        blocks.send();
        blocks.answer(JSON.stringify({ config: { id: 'uuid-root', tag: 'root' } }));

        assert.equal(recorder.blockTags.size, 0);
    });
});

describe('describeLoadingElements', () => {
    it('tells which components still show a loading overlay or placeholder', () => {
        const viewer = element('policy-viewer', element('body'));
        const container = element('container-block', element('div', viewer));
        const buttonOverlay = element('div', element('button-block', container));
        const placeholder = element('div', element('render-block', container));
        const document = {
            querySelectorAll: (selector) => ({ 'div.loading': [buttonOverlay], '.empty-component': [placeholder] }[selector] ?? []),
        };

        assert.deepEqual(describeLoadingElements(document), [
            { selector: 'div.loading', path: 'policy-viewer > container-block > button-block' },
            { selector: '.empty-component', path: 'policy-viewer > container-block > render-block' },
        ]);
    });
});

describe('formatDiagnostics', () => {
    it('reports the page, the overlays, the unanswered requests and the console', () => {
        const recorder = {
            pendingRequests: new Map([[0, { method: 'GET', url: '/api/v1/policies/p1/blocks/b1', startedAt: 0 }]]),
            consoleEntries: [{ level: 'error', at: 0, text: 'Block Unavailable' }],
        };

        const report = formatDiagnostics({
            url: 'http://127.0.0.1:4200/policy-viewer/p1',
            loadingElements: [{ selector: 'div.loading', path: 'policy-viewer > button-block' }],
            recorder,
        }, 21000);

        assert.equal(report, [
            'Failure diagnostics:',
            'Page: http://127.0.0.1:4200/policy-viewer/p1',
            'Loading overlays and placeholders still in the page (1):',
            '  div.loading in policy-viewer > button-block',
            'Requests without an answer (1):',
            '  GET /api/v1/policies/p1/blocks/b1 (for 21 s)',
            'Last browser console errors and warnings (1):',
            '  1970-01-01T00:00:00.000Z error: Block Unavailable',
        ].join('\n'));
    });
});

describe('registerFailureDiagnostics', () => {
    const register = () => {
        const handlers = {};
        registerFailureDiagnostics({ on: (event, handler) => { handlers[event] = handler; } });
        return handlers;
    };

    it('appends the page state to the failure and rethrows it', () => {
        const handlers = register();
        const win = fakeWindow();
        win.location = { href: 'http://127.0.0.1:4200/policy-viewer/p1' };
        win.document = { querySelectorAll: (selector) => (selector === 'div.loading' ? [element('div', element('button-block'))] : []) };
        handlers['window:before:load'](win);

        const failure = new Error('Timed out retrying after 20000ms');
        assert.throws(() => handlers.fail(failure), (thrown) => thrown === failure);
        assert.match(failure.message, /^Timed out retrying after 20000ms\n\nFailure diagnostics:\nPage: .*\n.*\n {2}div\.loading in button-block$/);
        assert.ok(failure.stack.startsWith(`Error: ${failure.message}\n`), 'the printed stack carries the report too');
    });

    it('appends the page state once when the same failure is handled again', () => {
        const handlers = register();
        const win = fakeWindow();
        win.location = { href: 'http://127.0.0.1:4200/' };
        win.document = { querySelectorAll: (selector) => (selector === 'div.loading' ? [element('div', element('button-block'))] : []) };
        handlers['window:before:load'](win);

        const failure = new Error('Timed out');
        assert.throws(() => handlers.fail(failure));
        assert.throws(() => handlers.fail(failure));
        assert.equal(failure.message.split('Failure diagnostics:').length, 2);
    });

    it('leaves the failure of a spec that loaded no page as it is', () => {
        const handlers = register();
        const failure = new Error('expected [] not to be empty');

        assert.throws(() => handlers.fail(failure));
        assert.equal(failure.message, 'expected [] not to be empty');
    });
});
