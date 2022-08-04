import { MessageBrokerChannel } from '@guardian/common';

Promise.all([
    MessageBrokerChannel.connect('WORKERS_SERVICE')
]).then(async values => {
    const [cn] = values;
    const channel = new MessageBrokerChannel(cn, 'worker');
})
