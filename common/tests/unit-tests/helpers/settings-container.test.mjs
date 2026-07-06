import { assert } from 'chai';
import { WalletEvents } from '@guardian/interfaces';
import { SettingsContainerOLD } from '../../../dist/helpers/settings-container.js';
import { PinoLogger } from '../../../dist/helpers/pino-logger.js';

describe('@unit SettingsContainerOLD', () => {
    let instance;
    let recorder;
    let savedEnv;
    let logged;
    let savedLoggerInfo;

    const makeResponder = (responses) => {
        recorder = [];
        return (subject, data) => {
            recorder.push({ subject, data });
            if (subject === WalletEvents.GET_GLOBAL_APPLICATION_KEY) {
                const value = Object.prototype.hasOwnProperty.call(responses, data.type)
                    ? responses[data.type]
                    : '';
                return Promise.resolve({ key: value });
            }
            return Promise.resolve({});
        };
    };

    const resetInstanceState = () => {
        instance.initialized = false;
        for (const key of Object.keys(instance._settings)) {
            delete instance._settings[key];
        }
    };

    beforeEach(() => {
        savedEnv = { ...process.env };
        process.env.QM_VERIFICATION = 'false';

        logged = [];
        const logger = new PinoLogger();
        savedLoggerInfo = logger.info;
        logger.info = async (message, attributes, userId) => {
            logged.push({ message, attributes, userId });
        };

        instance = new SettingsContainerOLD();
        instance.setConnection({
            subscribe() {
                return undefined;
            },
            publish() {
                return undefined;
            }
        });
        resetInstanceState();
        recorder = [];
        instance.sendMessage = makeResponder({});
    });

    afterEach(() => {
        const logger = new PinoLogger();
        logger.info = savedLoggerInfo;
        resetInstanceState();
        for (const key of Object.keys(process.env)) {
            if (!Object.prototype.hasOwnProperty.call(savedEnv, key)) {
                delete process.env[key];
            }
        }
        for (const key of Object.keys(savedEnv)) {
            process.env[key] = savedEnv[key];
        }
    });

    describe('singleton', () => {
        it('returns the same instance for repeated construction', () => {
            const a = new SettingsContainerOLD();
            const b = new SettingsContainerOLD();
            assert.strictEqual(a, b);
        });

        it('reuses the original instance', () => {
            const a = new SettingsContainerOLD();
            assert.strictEqual(a, instance);
        });
    });

    describe('settings getter', () => {
        it('throws when not initialized', () => {
            assert.throws(() => instance.settings, 'Settings container was not initialized');
        });

        it('returns the settings object after init', async () => {
            instance.sendMessage = makeResponder({ FOO: 'foo-value' });
            await instance.init('FOO');
            assert.deepEqual(instance.settings, { FOO: 'foo-value' });
        });

        it('returns the same underlying object reference', async () => {
            instance.sendMessage = makeResponder({ FOO: 'foo-value' });
            await instance.init('FOO');
            assert.strictEqual(instance.settings, instance._settings);
        });
    });

    describe('init', () => {
        it('marks the container initialized', async () => {
            instance.sendMessage = makeResponder({ FOO: 'foo-value' });
            await instance.init('FOO');
            assert.isTrue(instance.initialized);
        });

        it('reads each setting via GET event with {type} payload', async () => {
            instance.sendMessage = makeResponder({ FOO: 'a', BAR: 'b' });
            await instance.init('FOO', 'BAR');

            const gets = recorder.filter((r) => r.subject === WalletEvents.GET_GLOBAL_APPLICATION_KEY);
            assert.lengthOf(gets, 2);
            assert.deepEqual(gets[0].data, { type: 'FOO' });
            assert.deepEqual(gets[1].data, { type: 'BAR' });
        });

        it('uses the get-setting-key subject literal', async () => {
            instance.sendMessage = makeResponder({ FOO: 'a' });
            await instance.init('FOO');
            assert.strictEqual(recorder[0].subject, 'get-setting-key');
        });

        it('stores the returned key in the settings map', async () => {
            instance.sendMessage = makeResponder({ FOO: 'remote-value' });
            await instance.init('FOO');
            assert.strictEqual(instance._settings.FOO, 'remote-value');
        });

        it('issues no SET event when remote key is present', async () => {
            process.env.FOO = 'env-value';
            instance.sendMessage = makeResponder({ FOO: 'remote-value' });
            await instance.init('FOO');

            const sets = recorder.filter((r) => r.subject === WalletEvents.SET_GLOBAL_APPLICATION_KEY);
            assert.lengthOf(sets, 0);
            assert.strictEqual(instance._settings.FOO, 'remote-value');
        });

        it('handles init with zero settings', async () => {
            await instance.init();
            assert.isTrue(instance.initialized);
            assert.deepEqual(instance._settings, {});
            assert.lengthOf(recorder, 0);
        });

        it('handles multiple settings preserving order', async () => {
            instance.sendMessage = makeResponder({ A: '1', B: '2', C: '3' });
            await instance.init('A', 'B', 'C');
            assert.deepEqual(instance._settings, { A: '1', B: '2', C: '3' });
        });
    });

    describe('init env fallback', () => {
        it('writes env value via SET event when remote key is empty', async () => {
            process.env.FOO = 'env-value';
            instance.sendMessage = makeResponder({ FOO: '' });
            await instance.init('FOO');

            const sets = recorder.filter((r) => r.subject === WalletEvents.SET_GLOBAL_APPLICATION_KEY);
            assert.lengthOf(sets, 1);
            assert.deepEqual(sets[0].data, { type: 'FOO', key: 'env-value' });
        });

        it('uses the set-setting-key subject literal for fallback', async () => {
            process.env.FOO = 'env-value';
            instance.sendMessage = makeResponder({ FOO: '' });
            await instance.init('FOO');
            const sets = recorder.filter((r) => r.subject === 'set-setting-key');
            assert.lengthOf(sets, 1);
        });

        it('updates the local map to the env value on fallback', async () => {
            process.env.FOO = 'env-value';
            instance.sendMessage = makeResponder({ FOO: '' });
            await instance.init('FOO');
            assert.strictEqual(instance._settings.FOO, 'env-value');
        });

        it('logs that the setting was set from environment', async () => {
            process.env.FOO = 'env-value';
            instance.sendMessage = makeResponder({ FOO: '' });
            await instance.init('FOO');
            assert.lengthOf(logged, 1);
            assert.strictEqual(logged[0].message, 'FOO was set from environment');
            assert.deepEqual(logged[0].attributes, ['GUARDIAN_SERVICE']);
        });

        it('does not fall back when env var is absent and remote empty', async () => {
            delete process.env.FOO;
            instance.sendMessage = makeResponder({ FOO: '' });
            await instance.init('FOO');

            const sets = recorder.filter((r) => r.subject === WalletEvents.SET_GLOBAL_APPLICATION_KEY);
            assert.lengthOf(sets, 0);
            assert.strictEqual(instance._settings.FOO, '');
        });

        it('falls back only for the empty settings among several', async () => {
            process.env.A = 'env-a';
            process.env.B = 'env-b';
            instance.sendMessage = makeResponder({ A: '', B: 'remote-b' });
            await instance.init('A', 'B');

            const sets = recorder.filter((r) => r.subject === WalletEvents.SET_GLOBAL_APPLICATION_KEY);
            assert.lengthOf(sets, 1);
            assert.deepEqual(sets[0].data, { type: 'A', key: 'env-a' });
            assert.strictEqual(instance._settings.A, 'env-a');
            assert.strictEqual(instance._settings.B, 'remote-b');
        });
    });

    describe('double init', () => {
        it('throws when initialized a second time', async () => {
            instance.sendMessage = makeResponder({ FOO: 'foo-value' });
            await instance.init('FOO');

            let error;
            try {
                await instance.init('FOO');
            } catch (e) {
                error = e;
            }
            assert.instanceOf(error, Error);
            assert.strictEqual(error.message, 'Settings already initialized');
        });

        it('checks the flag after super.init (re-reads keys before throwing)', async () => {
            instance.sendMessage = makeResponder({ FOO: 'foo-value' });
            await instance.init('FOO');
            recorder.length = 0;

            try {
                await instance.init('FOO');
            } catch (e) {
                // expected
            }
            const gets = recorder.filter((r) => r.subject === WalletEvents.GET_GLOBAL_APPLICATION_KEY);
            assert.lengthOf(gets, 0);
        });
    });

    describe('updateSetting', () => {
        it('throws for an unregistered name', async () => {
            instance.sendMessage = makeResponder({ FOO: 'foo-value' });
            await instance.init('FOO');

            let error;
            try {
                await instance.updateSetting('BAR', 'x');
            } catch (e) {
                error = e;
            }
            assert.instanceOf(error, Error);
            assert.strictEqual(error.message, 'BAR setting was not registered');
        });

        it('throws before init since no settings registered', async () => {
            let error;
            try {
                await instance.updateSetting('FOO', 'x');
            } catch (e) {
                error = e;
            }
            assert.instanceOf(error, Error);
            assert.strictEqual(error.message, 'FOO setting was not registered');
        });

        it('sends SET event with {type,key} for a registered name', async () => {
            instance.sendMessage = makeResponder({ FOO: 'foo-value' });
            await instance.init('FOO');
            recorder.length = 0;

            await instance.updateSetting('FOO', 'new-value');

            const sets = recorder.filter((r) => r.subject === WalletEvents.SET_GLOBAL_APPLICATION_KEY);
            assert.lengthOf(sets, 1);
            assert.deepEqual(sets[0].data, { type: 'FOO', key: 'new-value' });
        });

        it('updates the local map for a registered name', async () => {
            instance.sendMessage = makeResponder({ FOO: 'foo-value' });
            await instance.init('FOO');
            await instance.updateSetting('FOO', 'new-value');
            assert.strictEqual(instance._settings.FOO, 'new-value');
        });
    });

    describe('requestSettings', () => {
        it('refreshes each registered key via GET event', async () => {
            instance.sendMessage = makeResponder({ A: '1', B: '2' });
            await instance.init('A', 'B');

            instance.sendMessage = makeResponder({ A: '10', B: '20' });
            await instance.requestSettings();

            const gets = recorder.filter((r) => r.subject === WalletEvents.GET_GLOBAL_APPLICATION_KEY);
            assert.lengthOf(gets, 2);
            assert.deepEqual(instance._settings, { A: '10', B: '20' });
        });

        it('is a no-op when no settings are registered', async () => {
            await instance.requestSettings();
            assert.lengthOf(recorder, 0);
        });

        it('applies env fallback for keys that became empty', async () => {
            instance.sendMessage = makeResponder({ A: '1' });
            await instance.init('A');

            process.env.A = 'env-a';
            instance.sendMessage = makeResponder({ A: '' });
            await instance.requestSettings();

            const sets = recorder.filter((r) => r.subject === WalletEvents.SET_GLOBAL_APPLICATION_KEY);
            assert.lengthOf(sets, 1);
            assert.deepEqual(sets[0].data, { type: 'A', key: 'env-a' });
            assert.strictEqual(instance._settings.A, 'env-a');
        });

        it('does not change initialized flag', async () => {
            instance.sendMessage = makeResponder({ A: '1' });
            await instance.init('A');
            await instance.requestSettings();
            assert.isTrue(instance.initialized);
        });
    });

    describe('getGlobalApplicationKey', () => {
        it('returns the key field of the response', async () => {
            instance.sendMessage = makeResponder({ FOO: 'foo-value' });
            const result = await instance.getGlobalApplicationKey('FOO');
            assert.strictEqual(result, 'foo-value');
        });

        it('sends GET event with {type} payload', async () => {
            instance.sendMessage = makeResponder({ FOO: 'foo-value' });
            await instance.getGlobalApplicationKey('FOO');
            assert.strictEqual(recorder[0].subject, WalletEvents.GET_GLOBAL_APPLICATION_KEY);
            assert.deepEqual(recorder[0].data, { type: 'FOO' });
        });
    });

    describe('setGlobalApplicationKey', () => {
        it('sends SET event with {type,key} payload', async () => {
            instance.sendMessage = makeResponder({});
            await instance.setGlobalApplicationKey('FOO', 'bar');
            assert.strictEqual(recorder[0].subject, WalletEvents.SET_GLOBAL_APPLICATION_KEY);
            assert.deepEqual(recorder[0].data, { type: 'FOO', key: 'bar' });
        });

        it('updates the local settings map', async () => {
            instance.sendMessage = makeResponder({});
            await instance.setGlobalApplicationKey('FOO', 'bar');
            assert.strictEqual(instance._settings.FOO, 'bar');
        });
    });
});
