import { DatabaseServer, DidDocument, HederaBBSMethod, HederaDidDocument, HederaEd25519Method, IAuthUser, KeyType, PolicyRoles, Users, Wallet } from '@guardian/common';
import { ISignOptions, LocationType, Permissions, PolicyRole, PolicyStatus, SignType } from '@guardian/interfaces';
import { AnyBlockType, IPolicyDocument, IPolicyInstance } from './policy-engine.interface.js';

/**
 * Hedera Account interface
 */
export interface IHederaCredentials {
    /**
     * User id
     */
    readonly id?: string;
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
 * User relayer account
 */
export interface IRelayerAccount {
    /**
     * User id
     */
    readonly id?: string;
    /**
     * Hedera account id
     */
    readonly hederaAccountId: string;
    /**
     * Hedera account key
     */
    readonly hederaAccountKey: string;
    /**
     * Hedera sign options
     */
    readonly signOptions: ISignOptions;
}

/**
 * User in policy
 */
export class PolicyUser {
    /**
     * User DID
     */
    private _id: string;
    /**
     * User DID
     */
    private _did: string;
    /**
     * username
     */
    private _username: string;
    /**
     * User DID
     */
    private readonly _hederaAccountId: string;
    /**
     * User Role
     */
    private _role: PolicyRole | null;
    /**
     * User Role
     */
    private _group: string;
    /**
     * Role message
     */
    private _roleMessage: string | null;
    /**
     * Policy id
     */
    public readonly policyId: string | null;
    /**
     * Policy owner
     */
    public readonly policyOwner: string | null;
    /**
     * Policy status
     */
    public readonly policyStatus: PolicyStatus | null;
    /**
     * Permissions
     */
    public readonly permissions: string[];
    /**
     * Location
     */
    public readonly location: LocationType;
    /**
     * Location
     */
    public readonly policyLocation: LocationType;

    /**
     * User id
     */
    private readonly _userId: string;

    public get userId(): string {
        return this._userId;
    }

    constructor(
        arg: IAuthUser | string,
        instance: IPolicyInstance | AnyBlockType
    ) {
        if (typeof arg === 'string') {
            this.did = arg;
            this.username = null;
            this.permissions = [];
            this.location = LocationType.LOCAL;
            this._userId = null;
            this._hederaAccountId = null;
        } else {
            this.did = arg.did;
            this.username = arg.username;
            this.permissions = arg.permissions || [];
            this.location = arg.location || LocationType.LOCAL;
            this._userId = arg.id;
            this._hederaAccountId = arg.hederaAccountId;
        }
        this.role = null;
        this.group = null;
        this.roleMessage = null;
        this.policyId = instance.policyId;
        this.policyOwner = instance.policyOwner;
        this.policyStatus = instance.policyStatus;
        this.policyLocation = instance.locationType;
    }

    public get id(): string {
        return this._id;
    }

    public get hederaAccountId(): string {
        return this._hederaAccountId;
    }

    public get did(): string {
        return this._did;
    }

    protected set did(did: string) {
        this._did = did;
        if (this._group) {
            this._id = `${this._group}:${this._did}`;
        } else {
            this._id = this._did;
        }
    }

    public get username(): string {
        return this._username;
    }

    protected set username(username: string) {
        this._username = username;
    }

    public get role(): PolicyRole | null {
        return this._role;
    }

    protected set role(role: PolicyRole | null) {
        this._role = role;
    }

    public get group(): string | null {
        return this._group;
    }

    protected set group(uuid: string) {
        this._group = uuid;
        if (this._group) {
            this._id = `${this._group}:${this._did}`;
        } else {
            this._id = this._did;
        }
    }

    public get roleMessage(): string | null {
        return this._roleMessage;
    }

    protected set roleMessage(messageId: string | null) {
        this._roleMessage = messageId;
    }

    public get virtual(): boolean {
        return false;
    }

    public get isAdmin(): boolean {
        return (
            this.policyLocation !== LocationType.REMOTE && (
                this._did === this.policyOwner ||
                this.permissions.includes(Permissions.POLICIES_POLICY_MANAGE)
            )
        );
    }

    /**
     * Set Group
     * @param group
     */
    public setCurrentGroup(group: PolicyRoles): PolicyUser {
        this.role = group?.role || null;
        this.group = group?.uuid || null;
        this.roleMessage = group?.messageId || null;
        return this;
    }

    public equal(did: string, uuid: string): boolean {
        if (this._group || uuid) {
            return this._did === did && this._group === uuid;
        } else {
            return this._did === did;
        }
    }

    public toJson() {
        return {
            id: this.id,
            did: this.did,
            username: this.username,
            role: this.role,
            group: this.group,
            roleMessage: this.roleMessage,
            virtual: this.virtual,
            isAdmin: this.isAdmin,
            policyId: this.policyId
        }
    }
}

/**
 * User in policy
 */
export class VirtualUser extends PolicyUser {
    constructor(
        virtualUser: any,
        instance: IPolicyInstance | AnyBlockType
    ) {
        super(virtualUser || {}, instance);
    }

    public override get virtual(): boolean {
        return true;
    }
}

/**
 * Hedera Account interface
 */
export class UserCredentials {
    /**
     * Is dry run mode
     */
    private readonly _dryRun: boolean;
    /**
     * Policy Owner
     */
    private readonly _owner: string;
    /**
     * User ID
     */
    private _id: string;
    /**
     * User DID
     */
    private _did: string;
    /**
     * Hedera account id
     */
    private _hederaAccountId: string;
    /**
     * User location
     */
    private _location: LocationType;

    /**
     * User id
     */
    private _userId: string;

    public get userId(): string {
        return this._userId;
    }

    public get id(): string {
        return this._id;
    }

    public get did(): string {
        return this._did;
    }

    public get hederaAccountId(): string {
        return this._hederaAccountId;
    }

    public get location(): LocationType {
        return this._location;
    }

    private constructor(ref: AnyBlockType, userDid: string) {
        this._dryRun = !!ref.dryRun;
        this._did = userDid;
        this._owner = ref.policyOwner;
        this._location = LocationType.LOCAL;
    }

    private async load(ref: AnyBlockType, userId: string | null): Promise<UserCredentials> {
        let userFull: IAuthUser;
        if (this._dryRun) {
            userFull = await ref.components.getVirtualUser(this._did);
        } else {
            const users = new Users();
            userFull = await users.getUserById(this._did, userId);
        }
        if (!userFull) {
            throw new Error('Virtual User not found');
        }
        this._location = userFull.location || LocationType.LOCAL;
        this._hederaAccountId = userFull.hederaAccountId;
        this._did = userFull.did;
        this._id = userFull.id;
        if (!this._did || !this._hederaAccountId) {
            throw new Error('Hedera Account not found.');
        }
        return this;
    }

    private async loadByAccount(ref: AnyBlockType, accountId: string, userId: string | null): Promise<UserCredentials> {
        let userFull: IAuthUser;
        if (this._dryRun) {
            userFull = await ref.databaseServer.getVirtualUserByAccount(accountId);
        } else {
            const users = new Users();
            userFull = await users.getUserByAccount(accountId, userId);
        }
        if (!userFull) {
            throw new Error('Virtual User not found');
        }
        this._location = userFull.location || LocationType.LOCAL;
        this._hederaAccountId = userFull.hederaAccountId;
        this._did = userFull.did;
        this._id = userFull.id;
        if (!this._did || !this._hederaAccountId) {
            throw new Error('Hedera Account not found.');
        }

        this._userId = userFull.id;

        return this;
    }

    public async loadHederaKey(ref: AnyBlockType, userId: string | null): Promise<string | null> {
        if (this._dryRun) {
            return await ref.databaseServer.getVirtualKey(this._did, this._did);
        } else {
            return await (new Wallet()).getUserKey(this._did, KeyType.KEY, this._did, userId);
        }
    }

    public async loadSignOptions(ref: AnyBlockType, userId: string | null): Promise<ISignOptions> {
        if (this._dryRun) {
            return {
                signType: SignType.INTERNAL
            }
        } else {
            const users = new Users()
            const userFull = await users.getUserById(this._did, userId);
            return await (new Wallet()).getUserSignOptions(userFull)
        }
    }

    public async loadRelayerAccountKey(ref: AnyBlockType, relayerAccount: string, userId: string | null): Promise<string | null> {
        if (this._dryRun) {
            return await ref.databaseServer.getVirtualKey(this._did, `${this._did}/${relayerAccount}`);
        } else {
            return await (new Wallet()).getUserKey(this._did, KeyType.RELAYER_ACCOUNT, `${this._did}/${relayerAccount}`, userId);
        }
    }

    public async loadHederaCredentials(ref: AnyBlockType, userId: string | null): Promise<IHederaCredentials> {
        const hederaKey = await this.loadHederaKey(ref, userId);
        return {
            id: this._id,
            hederaAccountId: this._hederaAccountId,
            hederaAccountKey: hederaKey
        }
    }

    private async isRelayerAccount(relayerAccount: string, userId: string | null): Promise<boolean> {
        if (relayerAccount && relayerAccount !== this._hederaAccountId) {
            return true;
        }
        return (new Users()).relayerAccountExist(this._did, relayerAccount, userId);
    }

    public async loadRelayerAccount(ref: AnyBlockType, relayerAccount: string, userId: string | null): Promise<IRelayerAccount> {
        if (await this.isRelayerAccount(relayerAccount, userId)) {
            const relayerAccountKey = await this.loadRelayerAccountKey(ref, relayerAccount, userId);
            return {
                id: this._id,
                hederaAccountId: relayerAccount,
                hederaAccountKey: relayerAccountKey,
                signOptions: {
                    signType: SignType.INTERNAL
                }
            }
        } else {
            const hederaKey = await this.loadHederaKey(ref, userId);
            const userSignOptions = await this.loadSignOptions(ref, userId);
            return {
                id: this._id,
                hederaAccountId: this._hederaAccountId,
                hederaAccountKey: hederaKey,
                signOptions: userSignOptions,
            }
        }
    }

    public async loadMessageKey(ref: AnyBlockType, userId: string | null): Promise<string | null> {
        if (this._dryRun) {
            return await ref.databaseServer.getVirtualKey(this._did, ref.messageId);
        } else {
            return await (new Wallet()).getUserKey(this._did, KeyType.MESSAGE_KEY, `${this._did}#${ref.messageId}`, userId);
        }
    }

    public async loadDidDocument(ref: AnyBlockType, userId: string | null): Promise<HederaDidDocument> {
        return await this.loadSubDidDocument(ref, this._did, userId);
    }

    public async loadSubDidDocument(ref: AnyBlockType, subDid: string, userId: string | null): Promise<HederaDidDocument> {
        const virtualUser = this._dryRun && subDid !== this._owner;

        let row: DidDocument;
        if (virtualUser) {
            row = await ref.databaseServer.getDidDocument(subDid);
        } else {
            row = await DatabaseServer.getDidDocument(subDid);
        }
        if (!row) {
            throw new Error('DID Document not found.');
        }

        const document = HederaDidDocument.from(row.document);
        const keys = row.verificationMethods || {};
        const Ed25519Signature2018 = keys[HederaEd25519Method.TYPE];
        const BbsBlsSignature2020 = keys[HederaBBSMethod.TYPE];
        const walletToken = this._did;

        if (virtualUser) {
            //Default key
            const hederaPrivateKey = await ref.databaseServer.getVirtualKey(walletToken, subDid);
            //Ed25519Signature2018
            if (Ed25519Signature2018) {
                const privateKey = await ref.databaseServer.getVirtualKey(walletToken, Ed25519Signature2018);
                document.setPrivateKey(Ed25519Signature2018, privateKey);
            } else {
                const { id, privateKey } = await HederaEd25519Method.generateKeyPair(subDid, hederaPrivateKey);
                document.setPrivateKey(id, privateKey);
            }
            //BbsBlsSignature2020
            if (BbsBlsSignature2020) {
                const privateKey = await ref.databaseServer.getVirtualKey(walletToken, BbsBlsSignature2020);
                document.setPrivateKey(BbsBlsSignature2020, privateKey);
            } else {
                const { id, privateKey } = await HederaBBSMethod.generateKeyPair(subDid, hederaPrivateKey);
                document.setPrivateKey(id, privateKey);
            }
        } else {
            const wallet = new Wallet();
            //Default key
            const hederaPrivateKey = await wallet.getUserKey(walletToken, KeyType.KEY, subDid, userId);
            //Ed25519Signature2018
            if (Ed25519Signature2018) {
                const privateKey = await wallet.getUserKey(walletToken, KeyType.DID_KEYS, Ed25519Signature2018, userId);
                document.setPrivateKey(Ed25519Signature2018, privateKey);
            } else {
                const { id, privateKey } = await HederaEd25519Method.generateKeyPair(subDid, hederaPrivateKey);
                document.setPrivateKey(id, privateKey);
            }
            //BbsBlsSignature2020
            if (BbsBlsSignature2020) {
                const privateKey = await wallet.getUserKey(walletToken, KeyType.DID_KEYS, BbsBlsSignature2020, userId);
                document.setPrivateKey(BbsBlsSignature2020, privateKey);
            } else {
                const { id, privateKey } = await HederaBBSMethod.generateKeyPair(subDid, hederaPrivateKey);
                document.setPrivateKey(id, privateKey);
            }
        }

        return document;
    }

    public async saveDidDocument(
        ref: AnyBlockType,
        row: IPolicyDocument,
        document: HederaDidDocument,
        userId: string | null
    ): Promise<void> {
        await this.saveSubDidDocument(ref, row, document, userId);
    }

    public async saveSubDidDocument(
        ref: AnyBlockType,
        row: any,
        document: HederaDidDocument,
        userId: string | null
    ): Promise<void> {
        const walletToken = this._did;
        const keys = document.getPrivateKeys();
        row.policyId = ref.policyId;
        row.verificationMethods = {};
        for (const item of keys) {
            const { id, type, key } = item;
            row.verificationMethods[type] = id;
            if (this._dryRun) {
                await ref.databaseServer.setVirtualKey(walletToken, id, key);
            } else {
                await (new Wallet()).setUserKey(walletToken, KeyType.DID_KEYS, id, key, userId);
            }
        }
        await ref.databaseServer.saveDid(row);
    }

    public static async create(ref: AnyBlockType, userDid: string, userId: string | null): Promise<UserCredentials> {
        return await (new UserCredentials(ref, userDid)).load(ref, userId);
    }

    public static async createByAccount(ref: AnyBlockType, accountId: string, userId: string | null): Promise<UserCredentials> {
        return await (new UserCredentials(ref, null)).loadByAccount(ref, accountId, userId);
    }

    public static async loadMessageKey(
        messageId: string,
        did: string,
        userId: string | null
    ): Promise<string | null> {
        return await (new Wallet()).getUserKey(did, KeyType.MESSAGE_KEY, `${did}#${messageId}`, userId);
    }

    public static async loadMessageKeyByAccount(
        messageId: string,
        accountId: string,
        userId: string | null
    ): Promise<string | null> {
        const users = new Users();
        const userFull = await users.getUserByAccount(accountId, userId);
        return await (new Wallet()).getUserKey(userFull.did, KeyType.MESSAGE_KEY, `${userFull.did}#${messageId}`, userId);
    }

    public static async loadMessageKeyOrPrivateKey(
        ref: AnyBlockType,
        did: string,
        userId: string | null
    ): Promise<string | null> {
        if (!ref.dryRun) {
            const messageKey = await (new Wallet()).getUserKey(did, KeyType.MESSAGE_KEY, `${did}#${ref.messageId}`, userId);

            if (messageKey) {
                return messageKey;
            }
        }

        const user = await UserCredentials.create(ref, did, userId);
        if (user.location === LocationType.LOCAL) {
            const hederaKey = await user.loadHederaKey(ref, userId);
            return hederaKey;
        }

        return null;
    }
}