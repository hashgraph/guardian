import { MessageBrokerChannel } from '@guardian/common';
import { Worker } from './api/worker';

Promise.all([
    MessageBrokerChannel.connect('WORKERS_SERVICE')
]).then(async values => {
    const [cn] = values;
    const channel = new MessageBrokerChannel(cn, 'worker');

    const w = new Worker(channel);

    console.log('Worker started');
})
