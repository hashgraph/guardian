import assert from 'node:assert/strict';
import sinon from 'sinon';
import {
    registerGlobalErrorHandlers,
    setGlobalErrorLogger,
    markServiceBooted,
    getSwallowedRejectionCount
} from '../../dist/helpers/process-error-handlers.js';

/**
 * A stray promise rejection must not silently crash the whole service. The
 * module keeps process-global state (booted flag, registration guard), so the
 * listeners can only be attached once — we capture them via a stubbed
 * process.on and drive them directly. Pre-boot expectations run before the boot
 * flag is set; the post-boot expectation runs last.
 */
describe('global process error handlers', () => {
    const handlers = {};
    let onStub;

    before(() => {
        // Capture the (single) registered handlers instead of attaching real listeners.
        onStub = sinon.stub(process, 'on').callsFake((event, fn) => {
            handlers[event] = fn;
            return process;
        });
        registerGlobalErrorHandlers(['GUARDIAN_SERVICE']);
    });

    after(() => {
        onStub.restore();
    });

    beforeEach(() => {
        sinon.stub(process, 'exit');
        sinon.stub(console, 'error');
    });

    afterEach(() => {
        process.exit.restore();
        console.error.restore();
    });

    it('registers both unhandledRejection and uncaughtException handlers', () => {
        assert.equal(typeof handlers.unhandledRejection, 'function');
        assert.equal(typeof handlers.uncaughtException, 'function');
    });

    it('is idempotent: a second call does not attach more listeners', () => {
        const before = onStub.callCount;
        registerGlobalErrorHandlers(['GUARDIAN_SERVICE']);
        assert.equal(onStub.callCount, before);
    });

    it('exits(1) on an unhandledRejection that happens before boot completes', () => {
        handlers.unhandledRejection(new Error('boom'));
        assert.ok(process.exit.calledOnceWithExactly(1));
    });

    it('normalizes a non-Error rejection reason and still exits before boot', () => {
        handlers.unhandledRejection('a string reason');
        assert.ok(process.exit.calledOnceWithExactly(1));
    });

    it('routes errors to the logger (with kind + service attributes) once set', () => {
        registerGlobalErrorHandlers(['GUARDIAN_SERVICE']); // attributes update even when idempotent
        const logger = { error: sinon.stub().resolves() };
        setGlobalErrorLogger(logger);

        handlers.unhandledRejection(new Error('boom'));

        assert.ok(logger.error.calledOnce);
        const [errArg, attrs, userId] = logger.error.firstCall.args;
        assert.ok(errArg instanceof Error);
        assert.deepEqual(attrs, ['GUARDIAN_SERVICE', 'unhandledRejection']);
        assert.equal(userId, null);
    });

    it('exits(1) on uncaughtException', () => {
        handlers.uncaughtException(new Error('fatal'));
        assert.ok(process.exit.calledOnceWithExactly(1));
    });

    // Must be last: flips the module-global boot flag for good.
    it('swallows unhandledRejection after markServiceBooted and counts it', () => {
        markServiceBooted();
        const before = getSwallowedRejectionCount();

        handlers.unhandledRejection(new Error('late, post-boot'));

        assert.ok(process.exit.notCalled);
        assert.equal(getSwallowedRejectionCount(), before + 1);
    });
});
