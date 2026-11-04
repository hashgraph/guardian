// Shared mechanics for the import dialogs (policy/tool/...) and the async
// task pages that follow them.

/**
 * `source` is either a file in cypress/fixtures (no '/') or a path relative
 * to the project root ('/' in it, e.g. a Methodology Library archive). The
 * file is dropped onto the open dialog's drop zone; the drop itself kicks off
 * the import and the preview dialog then appears.
 */
export function dropFile(source) {
    const fileName = source.includes('/') ? source.split('/').pop() : source;
    const load = source.includes('/')
        ? cy.readFile(source, { encoding: null })
        : cy.fixture(source, { encoding: null });
    // The drop zone's file input is transient (created on demand), so drive it
    // by dispatching a drop event with a DataTransfer - selectFile cannot reach
    // it. ngx-file-drop's dropFiles() prefers dataTransfer.items and calls
    // webkitGetAsEntry() on each item; entries added programmatically yield a
    // null there and a DataTransferItem (not a File) survives to the app.
    // Forcing items to null makes the library read dataTransfer.files instead
    // and resolve the real File.
    return load.then((buffer) => {
        const file = new File([buffer], fileName, { type: 'application/octet-stream' });
        return cy.window().then((win) => {
            const dropTarget = win.document.querySelector('app-file-drag-n-drop div.file-drop-zone') ||
                win.document.querySelector('app-file-drag-n-drop');
            if (!dropTarget) {
                throw new Error('file drop zone is not in the dialog');
            }
            const dataTransfer = new win.DataTransfer();
            dataTransfer.items.add(file);
            Object.defineProperty(dataTransfer, 'items', { get: () => null });
            const drop = new win.DragEvent('drop', { dataTransfer, bubbles: true, cancelable: true });
            dropTarget.dispatchEvent(drop);
        });
    });
}

/**
 * Push actions (create/publish/dry-run/import) run as backend tasks: the app
 * navigates to /task/:id and redirects back to its origin URL when the task
 * completes. Lists do not refresh on their own, so a cy.visit fired before
 * the task lands would snapshot the pre-completion state forever. Wait for
 * the full round trip instead.
 */
export function waitForTaskRoundtrip(timeout = 180000) {
    cy.location('pathname', { timeout: 30000 }).should('include', '/task');
    cy.location('pathname', { timeout }).should('not.include', '/task');
}

/**
 * Import-preview tool rows settle into 'valid'/'invalid' when their
 * checkMessage request answers, but the request has no client-side timeout:
 * a single check the gateway never answers pins its row at 'load' forever,
 * and any 'load' row keeps the Import button disabled. Wait for the verdict
 * with a deadline (a real-timer poll: a plain should() would fail the test
 * instead of the attempt); a row still loading gets its check re-issued -
 * the row input's change handler re-runs checkTool with the same value - and
 * the wait repeats. After the last attempt a stuck row fails the test with
 * the offending messageIds so a hung gateway is diagnosable in seconds.
 */
export function settleToolRowChecks(retries = 3, settleTimeout = 30000) {
    const rows = 'div.guardian-dialog div.tools-table__row input.input';
    const isStuck = (el) => el.getAttribute('status') === 'load';

    const waitSettled = ($in) => new Promise((resolve) => {
        const win = $in[0].ownerDocument.defaultView;
        const started = Date.now();
        const tick = () => {
            let stuck = 0;
            $in.each((_, el) => {
                if (isStuck(el)) {
                    stuck++;
                }
            });
            if (!stuck || Date.now() - started >= settleTimeout) {
                win.clearInterval(timer);
                resolve(stuck);
            }
        };
        const timer = win.setInterval(tick, 200);
    });

    const reissueStuckChecks = () => cy.get(rows).then(($in) => {
        $in.each((_, el) => {
            if (isStuck(el)) {
                cy.wrap(el).trigger('change');
            }
        });
    });

    const failOnStuck = () => cy.get(rows).then(($in) => {
        const stuck = [];
        $in.each((_, el) => {
            if (isStuck(el)) {
                stuck.push(el.value);
            }
        });
        expect(stuck, `the gateway never answered these import checks: ${stuck.join(', ')}`).to.be.empty;
    });

    const pass = (left) => cy.get(rows, { timeout: settleTimeout }).then({ timeout: settleTimeout + 10000 }, ($in) => waitSettled($in)).then((stuck) => {
        if (!stuck) {
            return;
        }
        if (!left) {
            return failOnStuck();
        }
        return reissueStuckChecks().then(() => pass(left - 1));
    });

    // A preview of an entity without tools has no rows to settle.
    return cy.get('div.guardian-dialog div.tools-table__row').then(($rows) => {
        if (!$rows.length) {
            return;
        }
        return pass(retries);
    });
}

/**
 * Import-preview rows that point at tool messages this gateway cannot resolve
 * are flagged invalid and hold the Import button ("This policy references
 * inaccessible Tools. Please provide replacements."). The row's search opens
 * the workspace tool picker, so re-point each invalid row at the same-named
 * workspace tool.
 */
export function replaceInaccessibleTools() {
    // The preview dialog replaces the import dialog in place, and the two share
    // the guardian-dialog class. The import dialog's footer already shows a
    // (disabled) Import button, so footer visibility cannot mark the switch.
    // Only the preview renders the search bar, so wait for that before reading
    // the tool rows.
    cy.get('div.guardian-dialog').find('div.search-bar', { timeout: 60000 }).should('exist');
    settleToolRowChecks(3, 60000);
    cy.get('div.guardian-dialog').then(($d) => {
        const rows = $d.find('div.tools-table__row');
        if (!rows.length) {
            return; // this entity references no tools
        }
        // The per-row work must run after the settle above: a .then
        // callback queues synchronously, so reading the rows there would see
        // the pre-verdict "load" status and skip every row.
        cy.get('div.guardian-dialog').find('div.tools-table__row input.input', { timeout: 60000 })
            .then(() => {
                rows.each((_, row) => {
                    const input = row.querySelector('input.input');
                    if (!input || input.getAttribute('status') !== 'invalid') {
                        return;
                    }
                    const name = (row.querySelector('label.tools-table__name') || {}).title || '';
                    cy.wrap(row).find('div.guardian-icon-button').click();
                    cy.get('search-tool-dialog input.search-policy-input', { timeout: 15000 }).clear();
                    cy.get('search-tool-dialog input.search-policy-input').type(name);
                    cy.get('search-tool-dialog div.grid-row', { timeout: 30000 })
                        .filter((_, el) => ((el.querySelector('div.col-auto') || {}).textContent || '').trim() === name)
                        .find('button:contains("Select")').first().click();
                    cy.get('search-tool-dialog').should('not.exist', { timeout: 15000 });
                });
            });
    });
    // Picked rows re-ran their check and went back to "load".
    settleToolRowChecks(3, 30000);
    // A row that still resolves inaccessible after its replacement holds the
    // Import button forever; fail immediately with the row names.
    cy.get('div.guardian-dialog').find('div.tools-table__row', { timeout: 60000 }).then(($rows) => {
        const inaccessible = [];
        $rows.each((_, row) => {
            const input = row.querySelector('input.input');
            if (input && input.getAttribute('status') !== 'valid') {
                const name = (row.querySelector('label.tools-table__name') || {}).title || '?';
                inaccessible.push(`${name} (${input.value}, status ${input.getAttribute('status')})`);
            }
        });
        expect(inaccessible, `import preview rows that never became accessible: ${inaccessible.join('; ')}`).to.be.empty;
    });
}
