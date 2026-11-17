// When a test fails, the page state that explains it (a block still loading, a request that never
// answered, an error the app logged) is gone by the time anyone looks. This records it while the
// test runs and appends it to the failure message, so it lands in the console output, the JUnit
// files and the HTML report of local and CI runs alike.

// The policy viewer blocks' own overlay, and the placeholder render-block shows until a block has a component.
const LOADING_SELECTORS = ['div.loading', '.empty-component'];
const MAX_CONSOLE_ENTRIES = 20;
const MAX_TEXT_LENGTH = 300;

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

/**
 * Records, in the app window `win`, the console errors and warnings and the HTTP requests still
 * waiting for an answer. Each page load gets a recorder of its own.
 */
function createBrowserRecorder(win, now = () => Date.now()) {
    const recorder = { consoleEntries: [], pendingRequests: new Map() };
    let nextRequestId = 0;

    for (const level of ['error', 'warn']) {
        const original = win.console[level];
        win.console[level] = (...args) => {
            recorder.consoleEntries.push({ level, at: now(), text: truncate(args.map(describeArgument).join(' ')) });
            if (recorder.consoleEntries.length > MAX_CONSOLE_ENTRIES) {
                recorder.consoleEntries.shift();
            }
            return original.apply(win.console, args);
        };
    }

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
// `policy-viewer > container-block > button-block`. Custom element names always contain a dash.
function componentPath(element) {
    const names = [];
    for (let node = element.parentElement; node; node = node.parentElement) {
        const name = String(node.tagName || '').toLowerCase();
        if (name.includes('-')) {
            names.unshift(name);
        }
    }
    return names.join(' > ') || '(no component)';
}

/** Where each loading overlay or placeholder still in `document` sits in the component tree. */
function describeLoadingElements(document) {
    return LOADING_SELECTORS.flatMap((selector) =>
        Array.from(document.querySelectorAll(selector), (element) => ({ selector, path: componentPath(element) })));
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
    return lines.length ? `Failure diagnostics:\n${lines.join('\n')}` : null;
}

// The reporters print the stack, which starts with the message it was created with, so both change.
function appendToError(error, text) {
    const original = error.message;
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
                    loadingElements: describeLoadingElements(current.win.document),
                    recorder: current.recorder,
                });
                if (report) {
                    appendToError(error, report);
                }
            } catch (diagnosticsError) {
                appendToError(error, `Failure diagnostics unavailable: ${diagnosticsError.message}`);
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
