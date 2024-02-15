import { HederaBBSMethod, HederaDidDocument, HederaEd25519Method, IAuthUser, KeyType, PolicyRoles, Users, Wallet } from '@guardian/common';
import { PolicyRole, SignatureType } from '@guardian/interfaces';
import { AnyBlockType, IPolicyDocument } from './policy-engine.interface';

/**
 * Hedera Account interface
 */
export interface IHederaCredentials {
    /**
     * Hedera account id
     */
    readonly hederaAccountId: string;
    /**
     * Hedera account key
     */
    readonly hederaAccountKey: string;
}

/**
 * User in policy
 */
export interface IPolicyUser {
    /**
     * User DID
     */
    readonly id: string;
    /**
     * User DID
     */
    readonly did: string;
    /**
     * User Role
     */
    readonly role: PolicyRole | null;
    /**
     * User Role
     */
    readonly group: string;
    /**
     * User DID
     */
    readonly virtual?: boolean;
    /**
     * username
     */
    readonly username?: string;
}

/**
 * User in policy
 */
export class PolicyUser implements IPolicyUser {
    /**
     * User DID
     */
    public id: string;
    /**
     * User DID
     */
    public did: string;
    /**
     * User Role
     */
    public role: PolicyRole | null;
    /**
     * User Role
     */
    public group: string;
    /**
     * User DID
     */
    public virtual?: boolean;
    /**
     * username
     */
    public username?: string;
    /**
     * Role message
     */
    public roleMessage?: string;

    constructor(did: string, virtual: boolean = false) {
        this.id = did;
        this.did = did;
        this.role = null;
        this.group = null;
        this.virtual = virtual;
        this.roleMessage = null;
    }

    /**
     * Set Group
     * @param group
     */
    public setGroup(group: {
        /**
         * Role in Group
         */
        role?: string,
        /**
         * Group ID
         */
        uuid?: string
        /**
         * Message ID
         */
        messageId?: string
    } | null): PolicyUser {
        if (group) {
            this.role = group.role;
            this.group = group.uuid || null;
            this.roleMessage = group.messageId || null;
            if (this.group) {
                this.id = `${this.group}:${this.did}`;
            } else {
                this.id = this.did;
            }
        }
        return this;
    }

    /**
     * Set Virtual DID
     * @param user
     */
    public setVirtualUser(user: any): PolicyUser {
        if (user) {
            this.did = user.did;
            this.virtual = true;
            this.username = user.username;
            if (this.group) {
                this.id = `${this.group}:${this.did}`;
            } else {
                this.id = this.did;
            }
        }
        return this;
    }

    /**
     * Create User by group object
     * @param group
     * @param virtual
     */
    public static create(group: PolicyRoles, virtual: boolean = false): PolicyUser {
        const user = new PolicyUser(group.did, virtual);
        return user.setGroup(group);
    }

    /**
     * Set username
     * @param username
     */
    public setUsername(username: string): PolicyUser {
        this.username = username;
        return this;
    }
}

/**
 * Hedera Account interface
 */
export class UserCredentials {
    /**
     * Is dry run mode
     */
    private _dryRun: boolean;
    /**
     * User DID
     */
    private _did: string;
    /**
     * Hedera account id
     */
    private _hederaAccountId: string;

    public get did(): string {
        return this._did;
    }

    public get hederaAccountId(): string {
        return this._hederaAccountId;
    }

    constructor(ref: AnyBlockType, userDid: string) {
        this._dryRun = !!ref.dryRun;
        this._did = userDid;
    }

    public async load(ref: AnyBlockType): Promise<UserCredentials> {
        let userFull: IAuthUser;
        if (this._dryRun) {
            userFull = await ref.databaseServer.getVirtualUser(this._did);
        } else {
            const users = new Users();
            userFull = await users.getUserById(this._did);
        }
        if (!userFull) {
            throw new Error('Virtual User not found');
        }
        this._hederaAccountId = userFull.hederaAccountId;
        this._did = userFull.did;
        if (!this._did || !this._hederaAccountId) {
            throw new Error('Hedera Account not found');
        }
        return this;
    }

    public async loadHederaKey(ref: AnyBlockType): Promise<any> {
        if (this._dryRun) {
            return await ref.databaseServer.getVirtualKey(this._did, this._did);
        } else {
            const wallet = new Wallet();
            return await wallet.getUserKey(this._did, KeyType.KEY, this._did);
        }
    }

    public async loadHederaCredentials(ref: AnyBlockType): Promise<IHederaCredentials> {
        const hederaKey = await this.loadHederaKey(ref);
        return {
            hederaAccountId: this._hederaAccountId,
            hederaAccountKey: hederaKey
        }
    }

    public async loadDidDocument(ref: AnyBlockType): Promise<HederaDidDocument> {
        return await this.loadSubDidDocument(ref, this._did);
    }

    public async loadSubDidDocument(ref: AnyBlockType, subDid: string): Promise<HederaDidDocument> {
        const row = await ref.databaseServer.getDidDocument(subDid);
        if (!row) {
            return null;
        }
        const document = HederaDidDocument.from(row.document);
        const keys = row.verificationMethods || {};
        const keyName1 = keys[SignatureType.Ed25519Signature2018];
        const keyName2 = keys[SignatureType.BbsBlsSignature2020];
        const walletToken = this._did;

        if (this._dryRun) {
            const hederaPrivateKey = await ref.databaseServer.getVirtualKey(walletToken, subDid);
            if (keyName1) {
                const keyValue1 = await ref.databaseServer.getVirtualKey(walletToken, keyName1);
                document.setPrivateKey(keyName1, keyValue1);
            } else {
                document.setPrivateKey(HederaEd25519Method.defaultId(subDid), hederaPrivateKey);
            }
            if (keyName2) {
                const keyValue2 = await ref.databaseServer.getVirtualKey(walletToken, keyName2);
                document.setPrivateKey(keyName2, keyValue2);
            } else {
                document.setPrivateKey(HederaBBSMethod.defaultId(subDid), hederaPrivateKey);
            }
        } else {
            const wallet = new Wallet();
            const hederaPrivateKey = await wallet.getUserKey(walletToken, KeyType.KEY, subDid);
            if (keyName1) {
                const keyValue1 = await wallet.getUserKey(walletToken, KeyType.DID_KEYS, keyName1);
                document.setPrivateKey(keyName1, keyValue1);
            } else {
                document.setPrivateKey(HederaEd25519Method.defaultId(subDid), hederaPrivateKey);
            }
            if (keyName2) {
                const keyValue2 = await wallet.getUserKey(walletToken, KeyType.DID_KEYS, keyName2);
                document.setPrivateKey(keyName2, keyValue2);
            } else {
                document.setPrivateKey(HederaBBSMethod.defaultId(subDid), hederaPrivateKey);
            }
        }
    }

    public async saveDidDocument(
        ref: AnyBlockType,
        row: IPolicyDocument,
        document: HederaDidDocument
    ): Promise<void> {
        await this.saveSubDidDocument(ref, row, document);
    }

    public async saveSubDidDocument(
        ref: AnyBlockType,
        row: any,
        document: HederaDidDocument
    ): Promise<void> {
        const walletToken = this._did;
        const keys = document.getPrivateKeys();
        row.verificationMethods = {};
        for (const item of keys) {
            const { id, type, key } = item;
            row.verificationMethods[type] = id;
            if (this._dryRun) {
                await ref.databaseServer.setVirtualKey(walletToken, id, key);
            } else {
                const wallet = new Wallet();
                await wallet.setUserKey(walletToken, KeyType.KEY, id, key);
            }
        }
        await ref.databaseServer.saveDid(row);
    }

    public static async create(ref: AnyBlockType, userDid: string): Promise<UserCredentials> {
        return await (new UserCredentials(ref, userDid)).load(ref);
    }
}