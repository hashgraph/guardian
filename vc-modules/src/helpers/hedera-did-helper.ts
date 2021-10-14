import {
    Client,
    Hbar,
    PrivateKey,
} from "@hashgraph/sdk";
import {
    CredentialSubject,
    HcsVcMessage,
    HcsVcOperation,
    MessageEnvelope,
    HcsIdentityNetwork,
    HcsDidMessage,
    DidMethodOperation,
    HcsDid
} from "did-sdk-js";
import { HcsVcDocument } from "../vc/vc-document";
import { HcsDidDocument } from "../did-document";

export class HederaDIDHelper {
    public readonly client: Client;
    public readonly network: HcsIdentityNetwork;

    constructor(client: Client, network: HcsIdentityNetwork) {
        this.client = client;
        this.network = network;
    }

    public async createVcTransaction<T extends CredentialSubject>(
        vc: HcsVcDocument<T>,
        privateKey: PrivateKey | string
    ): Promise<HcsVcMessage> {
        const key = (typeof privateKey == "string") ? PrivateKey.fromString(privateKey) : privateKey;
        const transaction = new Promise<HcsVcMessage>(async (resolve, reject) => {
            try {
                const fee: Hbar = new Hbar(10);
                const transaction = this.network
                    .createVcTransaction(HcsVcOperation.ISSUE, vc.toCredentialHash(), key.publicKey)
                    .signMessage(doc => key.sign(doc))
                    .buildAndSignTransaction(tx => tx.setMaxTransactionFee(fee))
                    .onMessageConfirmed((env: MessageEnvelope<HcsVcMessage>) => {
                        resolve(env.open());
                    })
                    .onError((e: Error) => {
                        reject("Error while sending VC message transaction: " + e);
                    });
                await transaction.execute(this.client);
            } catch (error) {
                reject("BAD_REQUEST");
            }
        });
        return transaction;
    }

    public async createDid(privateKey?: string): Promise<{
        hcsDid: HcsDid;
        did: string;
        key: string;
        document: HcsDidDocument;
    }> {
        const pk = privateKey ? PrivateKey.fromString(privateKey) : PrivateKey.generate();
        const hcsDid = this.network.generateDid(pk, false);
        const did = hcsDid.toDid();
        const document = HcsDidDocument.fromDocumentBase(hcsDid.generateDidDocument());
        return {
            hcsDid: hcsDid,
            did: did,
            key: pk.toString(),
            document: document.getDidDocument()
        };
    }

    public async createDidTransaction(hcsDid: HcsDid): Promise<HcsDidMessage> {
        const transaction = new Promise<HcsDidMessage>(async (resolve, reject) => {
            try {
                const didDocument: string = hcsDid.generateDidDocument().toJSON();
                const didRootKey: PrivateKey = hcsDid.getPrivateDidRootKey();
                const transactionId = this.network
                    .createDidTransaction(DidMethodOperation.CREATE)
                    .setDidDocument(didDocument)
                    .signMessage((doc: Uint8Array) => didRootKey.sign(doc))
                    .buildAndSignTransaction((tx) => tx.setMaxTransactionFee(new Hbar(10)))
                    .onMessageConfirmed((env: MessageEnvelope<HcsDidMessage>) => {
                        resolve(env.open());
                    })
                    .onError((e: Error) => {
                        reject("Error while sending DID message transaction: " + e);
                    });
                const txResponse = await transactionId.execute(this.client);
            } catch (e) {
                reject("BAD_REQUEST");
            }
        });
        return transaction;
    }
}
