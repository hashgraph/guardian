import { MessageAction } from './message-action.js';
import { PolicyActionMessage } from './policy-action-message.js';
import { PolicyActionMessageBody } from './message-body.interface.js';
import { ITopicMessage } from '@guardian/common/topic-listener/topic-listener';
import { Message } from './message.js';
import { IPFS } from '@guardian/common/helpers/ipfs';

/**
 * Join request published on the actions topic of a policy.
 * The home instance and the Main instance do not share a key yet, so the document
 * is stored in plain text: it only holds public data, a signature and a message key
 * sealed to the policy owner.
 */
export class PolicyJoinMessage extends PolicyActionMessage {
    constructor() {
        super(MessageAction.RemotePolicyJoinRequest);
    }

    /**
     * To documents
     */
    public override async toDocuments(_key?: string): Promise<Buffer[]> {
        return [Buffer.from(JSON.stringify(this.document))];
    }

    /**
     * Load documents
     * @param documents
     */
    public override async loadDocuments(documents: string[], _key?: string): Promise<PolicyJoinMessage> {
        this.document = JSON.parse(documents[0]);
        return this;
    }

    /**
     * From topic message
     * @param data
     */
    public static override from(data: ITopicMessage): PolicyJoinMessage {
        if (!data?.message) {
            throw new Error('Message Object is empty');
        }
        const message = PolicyJoinMessage.fromMessageObject(JSON.parse(data.message));
        message.setPayer(data.owner);
        message.setIndex(data.sequenceNumber);
        message.setId(data.consensusTimestamp);
        message.setTopicId(data.topicId);
        return message;
    }

    /**
     * From message object
     * @param json
     */
    public static override fromMessageObject(json: PolicyActionMessageBody): PolicyJoinMessage {
        if (!json) {
            throw new Error('JSON Object is empty');
        }
        if (json.action !== MessageAction.RemotePolicyJoinRequest) {
            throw new Error('Invalid join message');
        }
        let message = new PolicyJoinMessage();
        message = Message._fromMessageObject(message, json);
        message._id = json.id;
        message._status = json.status;
        message.uuid = json.uuid;
        message.owner = json.owner;
        message.policyId = json.policyId;
        message.accountId = json.accountId;
        message.relayerAccount = json.relayerAccount;
        message.blockTag = json.blockTag;
        message.parent = json.parent;
        message.setUrls([{
            cid: json.cid,
            url: IPFS.IPFS_PROTOCOL + json.cid
        }]);
        return message;
    }
}
