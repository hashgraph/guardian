import {
    AccountId,
    Client,
    Hbar,
    PrivateKey,
} from '@hashgraph/sdk';
import { HederaSDKHelper } from './hedera-sdk-helper';
import { HederaDIDHelper } from './hedera-did-helper';
import { AddressBook, HcsIdentityNetwork, HcsIdentityNetworkBuilder } from '@hashgraph/did-sdk-js';
import { MAX_FEE } from './max-fee';
import { timeout } from './utils';

export interface IHederaNetwork {
    network: HcsIdentityNetwork,
    client: Client,
    addressBook: string,
    addressBookId: string,
    didTopicId: string,
    vcTopicId: string
}

export interface IBaseHederaHelper {
    SDK: HederaSDKHelper,
    setOperator(operatorId: string | AccountId, operatorKey: string | PrivateKey): IBaseHederaHelper
    setAddressBook(fileId: string, didTopicId: string, vcTopicId: string): IHederaHelper
}

export interface IHederaHelper {
    SDK: HederaSDKHelper,
    DID: HederaDIDHelper,
    setOperator(operatorId: string | AccountId, operatorKey: string | PrivateKey): IBaseHederaHelper
    setAddressBook(fileId: string, didTopicId: string, vcTopicId: string): IHederaHelper
}

/**
 * Contains methods for working with documents and the Hedera Network
 * 
 * DID - Methods for send documents from Hedera Network
 * SDK - Contains methods to simplify work with hashgraph sdk
 */
export class HederaHelper {
    public static MAX_TIMEOUT: number = 60000;
    public static readonly HEDERA_MESSAGE_API: string = "https://testnet.mirrornode.hedera.com/api/v1/topics/messages";

    public DID: HederaDIDHelper;
    public SDK: HederaSDKHelper;

    private client: Client;
    private network: string;
    private addressBook: AddressBook;
    private identityNetwork: HcsIdentityNetwork;

    constructor() {
    }

    /**
     * Set the account that will, by default, pay for transactions and queries built with this client.
     * 
     * @param {string | AccountId} operatorId - Operator Id
     * @param {string | PrivateKey} operatorKey - Operator Private Key
     */
    public static setOperator(operatorId: string | AccountId, operatorKey: string | PrivateKey): IBaseHederaHelper {
        const hederaHelper = new HederaHelper();
        return hederaHelper.setOperator(operatorId, operatorKey);
    }

    /**
     * Set the account that will, by default, pay for transactions and queries built with this client.
     * 
     * @param {string | AccountId} operatorId - Operator Id
     * @param {string | PrivateKey} operatorKey - Operator Private Key
     */
    public setOperator(operatorId: string | AccountId, operatorKey: string | PrivateKey): IBaseHederaHelper {
        this.client = Client.forTestnet();
        this.client.setOperator(operatorId, operatorKey);
        this.SDK = new HederaSDKHelper(this.client);
        return this;
    }

    /**
     * Set AddressBook
     * 
     * @param {string} fileId - AddressBook Id
     * @param {string} didTopicId - DID Topic Id
     * @param {string} vcTopicId -  VC Topic Id
     */
    public setAddressBook(fileId: string, didTopicId: string, vcTopicId: string): IHederaHelper {
        this.network = 'testnet';
        this.addressBook = new AddressBook()
        this.identityNetwork = HcsIdentityNetwork.fromAddressBook(this.network, this.addressBook);
        const ab = AddressBook.fromJson(`{"didTopicId":"${didTopicId}","vcTopicId":"${vcTopicId}"}`, fileId);
        this.addressBook.setFileId(ab.getFileId());
        this.addressBook.setDidTopicId(ab.getDidTopicId());
        this.addressBook.setVcTopicId(ab.getVcTopicId());
        this.DID = new HederaDIDHelper(this.client, this.identityNetwork);
        return this;
    }

    /**
     * Create appnet's identity network based on Hedera HCS DID method specification.
     * 
     * @param {string} id - Operator Id
     * @param {string} key - Operator Private Key
     * @param {string} appnetName - Name of the appnet.
     * @param {string} didServerUrl - List of appnet API servers.
     * @param {string} didTopicMemo - DID Topic memo field.
     * @param {string} vcTopicMemo - VC Topic memo field.
     */
    @timeout(HederaHelper.MAX_TIMEOUT)
    public static async newNetwork(
        id: string,
        key: string,
        appnetName: string,
        didServerUrl: string,
        didTopicMemo: string,
        vcTopicMemo: string
    ): Promise<IHederaNetwork> {
        const operatorId = AccountId.fromString(id);
        const operatorKey = PrivateKey.fromString(key);

        const network = 'testnet';
        const client = Client.forTestnet();
        client.setOperator(operatorId, operatorKey);

        const didNetwork = await new HcsIdentityNetworkBuilder()
            .setNetwork(network)
            .setAppnetName(appnetName)
            .addAppnetDidServer(didServerUrl)
            .setPublicKey(operatorKey.publicKey)
            .setMaxTransactionFee(new Hbar(MAX_FEE))
            .setDidTopicMemo(didTopicMemo)
            .setVCTopicMemo(vcTopicMemo)
            .execute(client);

        const addressBook = didNetwork.getAddressBook();
        const addressBookId = didNetwork.getAddressBook().getFileId().toString();
        const didTopicId = didNetwork.getAddressBook().getDidTopicId().toString();
        const vcTopicId = didNetwork.getAddressBook().getVcTopicId().toString();

        return {
            network: didNetwork,
            client: client,
            addressBook: addressBook.toJSON(),
            addressBookId: addressBookId,
            didTopicId: didTopicId,
            vcTopicId: vcTopicId
        }
    }
}