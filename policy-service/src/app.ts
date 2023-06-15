import {
    MessageBrokerChannel,
    ApplicationState,
    Logger, LargePayloadContainer
} from '@guardian/common';
import { ApplicationStates } from '@guardian/interfaces';
import { PolicyContainer } from '@helpers/policy-container';
import { startMetricsServer } from './utils/metrics';

export const obj = {};

Promise.all([
    MessageBrokerChannel.connect('policy-service')
]).then(async values => {
    const [cn] = values;

    new Logger().setConnection(cn);
    const state = new ApplicationState();
    await state.setServiceName('POLICY_SERVICE').setConnection(cn).init();
    await state.updateState(ApplicationStates.STARTED);

    /////////////

    state.updateState(ApplicationStates.INITIALIZING);

    // await new PolicyContainer().setConnection(cn).init();

    const c = new PolicyContainer();
    await c.setConnection(cn).init();
    c.addPolicy({
        "policy": {
            "_id": "6477331d33a2fe10ea7a8fd8",
            "createDate": "2023-05-31T11:44:29.969Z",
            "updateDate": "2023-05-31T12:20:01.050Z",
            "uuid": "98d9ff7f-7aa0-44eb-a651-80c62f22b5b6",
            "name": "1",
            "version": "Dry Run",
            "description": "",
            "topicDescription": "",
            "configFileId": "64773b71e6db4f3fc55335d6",
            "status": "DRY-RUN",
            "creator": "did:hedera:testnet:8AvszwobPqq5kHmWWq52cFg3i8wZo9oy8xSY1mBZsfD7_0.0.13380748",
            "owner": "did:hedera:testnet:8AvszwobPqq5kHmWWq52cFg3i8wZo9oy8xSY1mBZsfD7_0.0.13380748",
            "policyRoles": [],
            "policyGroups": [],
            "policyTopics": [],
            "policyTokens": [],
            "topicId": "0.0.13727941",
            "instanceTopicId": "0.0.1685535599687",
            "policyTag": "Tag_1685533464720",
            "messageId": "1685.535600176",
            "codeVersion": "1.5.1",
            "config": {
                "id": "83584aaa-2840-4bec-9c86-1760f51a930b",
                "blockType": "interfaceContainerBlock",
                "permissions": [
                    "ANY_ROLE"
                ],
                "onErrorAction": "no-action",
                "uiMetaData": {
                    "type": "blank"
                },
                "tag": "",
                "children": [
                    {
                        "id": "e05659c8-3c7f-4b1e-9aa4-0d7a3795908a",
                        "blockType": "messagesReportBlock",
                        "defaultActive": true,
                        "permissions": [
                            "ANY_ROLE"
                        ],
                        "tag": "Block_1",
                        "children": [],
                        "events": [],
                        "artifacts": []
                    }
                ],
                "events": [],
                "artifacts": []
            },
            "id": "6477331d33a2fe10ea7a8fd8"
        },
        "policyId": "6477331d33a2fe10ea7a8fd8",
        "skipRegistration": false
    } as any)

    const maxPayload = parseInt(process.env.MQ_MAX_PAYLOAD, 10);
    if (Number.isInteger(maxPayload)) {
        new LargePayloadContainer().runServer();
    }
    await new Logger().info('Policy service started', ['GUARDIAN_SERVICE']);

    await state.updateState(ApplicationStates.READY);

    startMetricsServer();
}, (reason) => {
    console.log(reason);
    process.exit(0);
});
