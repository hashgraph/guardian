// When a test fails, the page state that explains it (a block still loading, a request that never
// answered, an error the app logged) is gone by the time anyone looks. This records it while the
// test runs and appends it to the failure message, so it lands in the console output, the JUnit
// files and the HTML report of local and CI runs alike.

// The policy viewer blocks' own overlay, and the placeholder render-block shows until a block has a component.
const LOADING_SELECTORS = ['div.loading', '.empty-component'];
const MAX_CONSOLE_ENTRIES = 20;
const MAX_TEXT_LENGTH = 300;
const REPORT_HEADING = 'Failure diagnostics';
// render-block only puts a block's uuid in the DOM (attribute block-uuid), and the uuids are new for
// every published policy. The policy viewer reads the policy here, with its config: uuids and tags.
const POLICY_URL = /\/policies\/[^/?]+(\?|$)/;

const truncate = (text) => {
    const value = String(text);
    return value.length > MAX_TEXT_LENGTH ? `${value.slice(0, MAX_TEXT_LENGTH)}…` : value;
};

const describeArgument = (value) => {
    if (value instanceof Error || (value && typeof value.message === 'string' && typeof value.stack === 'string')) {
        return `${value.name || 'Error'}: ${value.message}`;
    }
    if (typeof value === 'object' && value !== null) {
        try {
            return JSON.stringify(value);
        } catch {
            return String(value);
        }
    }
    return String(value);
};

/** Adds the tag of every block of a policy config (`{ id, tag, children }`) to `blockTags`, by uuid. */
function recordBlockTags(blockTags, block) {
    if (!block || typeof block !== 'object') {
        return;
    }
    if (block.id && block.tag) {
        blockTags.set(block.id, block.tag);
    }
    (block.children || []).forEach((child) => recordBlockTags(blockTags, child));
}

/**
 * Records, in the app window `win`, the console errors and warnings, the HTTP requests still
 * waiting for an answer and the tags of the blocks of the policies it reads. Each page load gets a recorder of its own.
 */
function createBrowserRecorder(win, now = () => Date.now()) {
    const recorder = { consoleEntries: [], pendingRequests: new Map(), blockTags: new Map() };
    let nextRequestId = 0;

    const record = (level, text) => {
        recorder.consoleEntries.push({ level, at: now(), text: truncate(text) });
        if (recorder.consoleEntries.length > MAX_CONSOLE_ENTRIES) {
            recorder.consoleEntries.shift();
        }
    };

    for (const level of ['error', 'warn']) {
        const original = win.console[level];
        win.console[level] = (...args) => {
            record(level, args.map(describeArgument).join(' '));
            return original.apply(win.console, args);
        };
    }

    // Angular reads JSON as text and parses it itself, so the body is in responseText.
    const readPolicyConfig = (xhr) => {
        if (xhr.status !== 200) {
            return;
        }
        try {
            const policy = typeof xhr.response === 'string' ? JSON.parse(xhr.responseText) : xhr.response;
            recordBlockTags(recorder.blockTags, policy?.config);
        } catch (error) {
            record('diagnostics', `policy of ${xhr.__diagnosticsRequest.url} unreadable: ${error.message}`);
        }
    };

    const track = (method, url) => {
        const id = nextRequestId++;
        recorder.pendingRequests.set(id, { method: String(method).toUpperCase(), url: String(url), startedAt: now() });
        return () => recorder.pendingRequests.delete(id);
    };

    const xhrPrototype = win.XMLHttpRequest.prototype;
    const originalOpen = xhrPrototype.open;
    const originalSend = xhrPrototype.send;
    xhrPrototype.open = function (method, url, ...rest) {
        this.__diagnosticsRequest = { method, url };
        return originalOpen.call(this, method, url, ...rest);
    };
    xhrPrototype.send = function (...args) {
        if (this.__diagnosticsRequest) {
            const done = track(this.__diagnosticsRequest.method, this.__diagnosticsRequest.url);
            this.addEventListener('loadend', done);
            if (String(this.__diagnosticsRequest.method).toUpperCase() === 'GET' && POLICY_URL.test(String(this.__diagnosticsRequest.url))) {
                this.addEventListener('load', () => readPolicyConfig(this));
            }
        }
        return originalSend.apply(this, args);
    };

    if (typeof win.fetch === 'function') {
        const originalFetch = win.fetch;
        win.fetch = function (input, init) {
            const url = typeof input === 'string' ? input : input?.url;
            const done = track(init?.method || input?.method || 'GET', url);
            return originalFetch.call(this, input, init).finally(done);
        };
    }

    return recorder;
}

// The chain of custom elements (Angular components) from the page down to the element, e.g.
// `policy-viewer > render-block[vvb_documents] > button-block`. Custom element names always contain
// a dash; a policy block is named by its tag, or by its uuid when the policy was not recorded.
function componentPath(element, blockTags) {
    const names = [];
    for (let node = element.parentElement; node; node = node.parentElement) {
        const name = String(node.tagName || '').toLowerCase();
        if (name.includes('-')) {
            const uuid = node.getAttribute?.('block-uuid');
            names.unshift(uuid ? `${name}[${blockTags.get(uuid) ?? uuid}]` : name);
        }
    }
    return names.join(' > ') || '(no component)';
}

/** Where each loading overlay or placeholder still in `document` sits in the component tree. */
function describeLoadingElements(document, blockTags = new Map()) {
    return LOADING_SELECTORS.flatMap((selector) =>
        Array.from(document.querySelectorAll(selector), (element) => ({ selector, path: componentPath(element, blockTags) })));
}

/** The report appended to a failure message; `null` when nothing was recorded. */
function formatDiagnostics({ url, loadingElements, recorder }, now = Date.now()) {
    const lines = [];
    if (url) {
        lines.push(`Page: ${url}`);
    }
    if (loadingElements.length) {
        lines.push(`Loading overlays and placeholders still in the page (${loadingElements.length}):`);
        loadingElements.forEach(({ selector, path }) => lines.push(`  ${selector} in ${path}`));
    }
    const pending = recorder ? Array.from(recorder.pendingRequests.values()) : [];
    if (pending.length) {
        lines.push(`Requests without an answer (${pending.length}):`);
        pending.forEach(({ method, url: requestUrl, startedAt }) =>
            lines.push(`  ${method} ${requestUrl} (for ${Math.round((now - startedAt) / 1000)} s)`));
    }
    const consoleEntries = recorder ? recorder.consoleEntries : [];
    if (consoleEntries.length) {
        lines.push(`Last browser console errors and warnings (${consoleEntries.length}):`);
        consoleEntries.forEach(({ level, at, text }) => lines.push(`  ${new Date(at).toISOString()} ${level}: ${text}`));
    }
    return lines.length ? `${REPORT_HEADING}:\n${lines.join('\n')}` : null;
}

// The reporters print the stack, which starts with the message it was created with, so both change.
// A fail handler can run more than once for the same error, so the report is added only once.
function appendToError(error, text) {
    const original = error.message;
    if (original.includes(`\n\n${REPORT_HEADING}`)) {
        return;
    }
    error.message = `${original}\n\n${text}`;
    if (typeof error.stack === 'string' && error.stack.includes(original)) {
        error.stack = error.stack.replace(original, error.message);
    }
}

/** Hooks the recorder into every page the tests load, and the report into every failure. */
function registerFailureDiagnostics(cypress) {
    let current = null;
    cypress.on('window:before:load', (win) => {
        current = { win, recorder: createBrowserRecorder(win) };
    });
    cypress.on('fail', (error) => {
        // An API spec loads no page, so there is nothing to describe.
        if (current) {
            try {
                const report = formatDiagnostics({
                    url: current.win.location?.href,
                    loadingElements: describeLoadingElements(current.win.document, current.recorder.blockTags),
                    recorder: current.recorder,
                });
                if (report) {
                    appendToError(error, report);
                }
            } catch (diagnosticsError) {
                appendToError(error, `${REPORT_HEADING} unavailable: ${diagnosticsError.message}`);
            }
        }
        throw error;
    });
    // What an earlier test of the spec recorded does not explain this test's failure.
    cypress.on('test:before:run', () => {
        if (current) {
            current.recorder.consoleEntries.length = 0;
            current.recorder.pendingRequests.clear();
        }
    });
}

module.exports = {
    createBrowserRecorder,
    describeLoadingElements,
    formatDiagnostics,
    registerFailureDiagnostics,
};
