import assert from 'node:assert/strict';
import sinon from 'sinon';
import {
    registerGlobalErrorHandlers,
    setGlobalErrorLogger,
    markServiceBooted
} from '../../dist/helpers/process-error-handlers.js';

/**
 * A stray promise rejection must not silently crash the whole service. The
 * module keeps process-global state (booted flag), so tests are ordered: all
 * pre-boot expectations run before the boot flag is set, and the post-boot
 * expectation runs last.
 */
describe('global process error handlers', () => {
    let handlers;
    let exitStub;

    beforeEach(() => {
        handlers = {};
        // Capture registered handlers instead of attaching real process listeners
        // (so invoking them can't interfere with the test runner).
        sinon.stub(process, 'on').callsFake((event, fn) => {
            handlers[event] = fn;
            return process;
        });
        exitStub = sinon.stub(process, 'exit');
        sinon.stub(console, 'error');
    });

    afterEach(() => {
        sinon.restore();
    });

    it('registers both unhandledRejection and uncaughtException handlers', () => {
        registerGlobalErrorHandlers(['TEST']);
        assert.equal(typeof handlers.unhandledRejection, 'function');
        assert.equal(typeof handlers.uncaughtException, 'function');
    });

    it('exits(1) on an unhandledRejection that happens before boot completes', () => {
        registerGlobalErrorHandlers(['TEST']);
        handlers.unhandledRejection(new Error('boom'));
        assert.ok(exitStub.calledOnceWithExactly(1));
    });

    it('normalizes a non-Error rejection reason and still exits before boot', () => {
        registerGlobalErrorHandlers(['TEST']);
        handlers.unhandledRejection('a string reason');
        assert.ok(exitStub.calledOnceWithExactly(1));
    });

    it('routes errors to the logger (with kind + service attributes) once set', () => {
        const logger = { error: sinon.stub().resolves() };
        setGlobalErrorLogger(logger);
        registerGlobalErrorHandlers(['GUARDIAN_SERVICE']);

        handlers.unhandledRejection(new Error('boom'));

        assert.ok(logger.error.calledOnce);
        const [errArg, attrs, userId] = logger.error.firstCall.args;
        assert.ok(errArg instanceof Error);
        assert.deepEqual(attrs, ['GUARDIAN_SERVICE', 'unhandledRejection']);
        assert.equal(userId, null);
    });

    it('exits(1) on uncaughtException', () => {
        registerGlobalErrorHandlers(['TEST']);
        handlers.uncaughtException(new Error('fatal'));
        assert.ok(exitStub.calledOnceWithExactly(1));
    });

    // Must be last: flips the module-global boot flag for good.
    it('swallows unhandledRejection after markServiceBooted (does not exit)', () => {
        markServiceBooted();
        registerGlobalErrorHandlers(['TEST']);
        handlers.unhandledRejection(new Error('late, post-boot'));
        assert.ok(exitStub.notCalled);
    });
});
