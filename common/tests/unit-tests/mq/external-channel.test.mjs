import { assert } from 'chai';
import { ExternalEventChannel } from '../../../dist/mq/external-channel.js';

describe('ExternalEventChannel @unit', function () {
    function makeFake() {
        const calls = [];
        return { calls, channel: { publish: (...args) => calls.push(args) } };
    }

    it('new ExternalEventChannel() returns an object instance', function () {
        const inst = new ExternalEventChannel();
        assert.isObject(inst);
        assert.instanceOf(inst, ExternalEventChannel);
    });

    it('new ExternalEventChannel() twice returns the SAME instance (singleton)', function () {
        const a = new ExternalEventChannel();
        const b = new ExternalEventChannel();
        assert.strictEqual(a, b);
    });

    it('exposes setChannel and publishMessage methods', function () {
        const inst = new ExternalEventChannel();
        assert.isFunction(inst.setChannel);
        assert.isFunction(inst.publishMessage);
    });

    it('publishMessage calls channel.publish exactly once', function () {
        const inst = new ExternalEventChannel();
        const fake = makeFake();
        inst.setChannel(fake.channel);
        inst.publishMessage('evt', { a: 1 });
        assert.lengthOf(fake.calls, 1);
    });

    it('publishMessage passes (type, data, true) with hardcoded allowError=true', function () {
        const inst = new ExternalEventChannel();
        const fake = makeFake();
        inst.setChannel(fake.channel);
        const data = { foo: 'bar' };
        inst.publishMessage('my-type', data);
        assert.deepStrictEqual(fake.calls[0], ['my-type', data, true]);
        assert.strictEqual(fake.calls[0][2], true);
    });

    it('publishMessage passes data through unchanged by reference (object)', function () {
        const inst = new ExternalEventChannel();
        const fake = makeFake();
        inst.setChannel(fake.channel);
        const data = { nested: { x: 1 } };
        inst.publishMessage('t', data);
        assert.strictEqual(fake.calls[0][1], data);
    });

    it('publishMessage passes data through unchanged by reference (array)', function () {
        const inst = new ExternalEventChannel();
        const fake = makeFake();
        inst.setChannel(fake.channel);
        const data = [1, 2, 3];
        inst.publishMessage('t', data);
        assert.strictEqual(fake.calls[0][1], data);
    });

    it('publishMessage forwards a string data value', function () {
        const inst = new ExternalEventChannel();
        const fake = makeFake();
        inst.setChannel(fake.channel);
        inst.publishMessage('t', 'hello');
        assert.deepStrictEqual(fake.calls[0], ['t', 'hello', true]);
    });

    it('publishMessage forwards a null data value', function () {
        const inst = new ExternalEventChannel();
        const fake = makeFake();
        inst.setChannel(fake.channel);
        inst.publishMessage('t', null);
        assert.deepStrictEqual(fake.calls[0], ['t', null, true]);
    });

    it('publishMessage forwards an undefined data value', function () {
        const inst = new ExternalEventChannel();
        const fake = makeFake();
        inst.setChannel(fake.channel);
        inst.publishMessage('t', undefined);
        assert.deepStrictEqual(fake.calls[0], ['t', undefined, true]);
    });

    it('multiple publishMessage calls each delegate to the channel', function () {
        const inst = new ExternalEventChannel();
        const fake = makeFake();
        inst.setChannel(fake.channel);
        inst.publishMessage('one', 1);
        inst.publishMessage('two', 2);
        inst.publishMessage('three', 3);
        assert.lengthOf(fake.calls, 3);
        assert.deepStrictEqual(fake.calls[0], ['one', 1, true]);
        assert.deepStrictEqual(fake.calls[1], ['two', 2, true]);
        assert.deepStrictEqual(fake.calls[2], ['three', 3, true]);
    });

    it('forwards the type argument unchanged', function () {
        const inst = new ExternalEventChannel();
        const fake = makeFake();
        inst.setChannel(fake.channel);
        inst.publishMessage('SOME_EVENT_TYPE', {});
        assert.strictEqual(fake.calls[0][0], 'SOME_EVENT_TYPE');
    });

    it('re-setChannel redirects subsequent publishes to the new channel', function () {
        const inst = new ExternalEventChannel();
        const first = makeFake();
        const second = makeFake();
        inst.setChannel(first.channel);
        inst.publishMessage('a', 1);
        inst.setChannel(second.channel);
        inst.publishMessage('b', 2);
        assert.lengthOf(first.calls, 1);
        assert.lengthOf(second.calls, 1);
        assert.deepStrictEqual(first.calls[0], ['a', 1, true]);
        assert.deepStrictEqual(second.calls[0], ['b', 2, true]);
    });

    it('publishMessage before any setChannel throws (channel undefined)', function () {
        const Fresh = class FreshExternalEventChannel {
            channel;
            setChannel(channel) {
                this.channel = channel;
            }
            publishMessage(type, data) {
                this.channel.publish(type, data, true);
            }
        };
        const inst = new Fresh();
        assert.throws(() => inst.publishMessage('t', {}));
    });

    it('setChannel returns undefined', function () {
        const inst = new ExternalEventChannel();
        const fake = makeFake();
        assert.strictEqual(inst.setChannel(fake.channel), undefined);
    });

    it('publishMessage returns undefined', function () {
        const inst = new ExternalEventChannel();
        const fake = makeFake();
        inst.setChannel(fake.channel);
        assert.strictEqual(inst.publishMessage('t', {}), undefined);
    });
});
