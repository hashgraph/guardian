import {
    AccountId,
    Client,
    Hbar,
    PrivateKey,
} from "@hashgraph/sdk";
import { HederaSDKHelper } from "./hedera-sdk-helper";
import { HederaDIDHelper } from "./hedera-did-helper";
import { AddressBook, HcsIdentityNetwork, HcsIdentityNetworkBuilder } from "did-sdk-js";

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

export class HederaHelper {
    public DID: HederaDIDHelper;
    public SDK: HederaSDKHelper;

    private client: Client;
    private network: string;
    private addressBook: AddressBook;
    private identityNetwork: HcsIdentityNetwork;

    constructor() {
    }

    public static setOperator(operatorId: string | AccountId, operatorKey: string | PrivateKey): IBaseHederaHelper {
        const hederaHelper = new HederaHelper();
        return hederaHelper.setOperator(operatorId, operatorKey);
    }

    public setOperator(operatorId: string | AccountId, operatorKey: string | PrivateKey): IBaseHederaHelper {
        this.client = Client.forTestnet();
        this.client.setOperator(operatorId, operatorKey);
        this.SDK = new HederaSDKHelper(this.client);
        return this;
    }

    public setAddressBook(fileId: string, didTopicId: string, vcTopicId: string): IHederaHelper {
        this.network = "testnet";
        this.addressBook = new AddressBook()
        this.identityNetwork = HcsIdentityNetwork.fromAddressBook(this.network, this.addressBook);

        // this.addressBook.setFileId(fileId);
        // this.addressBook.setDidTopicId(didTopicId);
        // this.addressBook.setVcTopicId(vcTopicId);
        const ab = AddressBook.fromJson(`{"didTopicId":"${didTopicId}","vcTopicId":"${vcTopicId}"}`, fileId);
        this.addressBook.setFileId(ab.getFileId());
        this.addressBook.setDidTopicId(ab.getDidTopicId());
        this.addressBook.setVcTopicId(ab.getVcTopicId());

        this.DID = new HederaDIDHelper(this.client, this.identityNetwork);
        return this;
    }

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

        const network = "testnet";
        const client = Client.forTestnet();
        client.setOperator(operatorId, operatorKey);

        const FEE = new Hbar(2);
        const didNetwork = await new HcsIdentityNetworkBuilder()
            .setNetwork(network)
            .setAppnetName(appnetName)
            .addAppnetDidServer(didServerUrl)
            .setPublicKey(operatorKey.publicKey)
            .setMaxTransactionFee(FEE)
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