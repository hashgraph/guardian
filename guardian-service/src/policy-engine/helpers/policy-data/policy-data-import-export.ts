import JSZip from 'jszip';
import {
    BlockStateLoader,
    PolicyDataLoader,
    RolesLoader,
    VcDocumentLoader,
    VpDocumentLoader,
    DidLoader,
    MultiSignDocumentLoader,
    MintRequestLoader,
    MintTransactionLoader,
    AggregateVCLoader,
    SplitDocumentLoader,
    DocumentStateLoader,
} from './loaders/index.js';
import { GuardiansService } from '../../../helpers/guardians.js';
import { PolicyEvents, PolicyType, TopicType } from '@guardian/interfaces';
import {
    DatabaseServer,
    DidDocument,
    Policy,
    Users,
    findAllEntities,
} from '@guardian/common';
import { SchemasLoader } from './loaders/schemas.loader.js';
import { ObjectId } from 'bson';
import { TokensLoader } from './loaders/tokens.loader.js';
import { RetirePoolLoader } from './loaders/retire-pool.loader.js';

/**
 * Static loaders
 */
type StaticLoaders =
    | typeof SchemasLoader
    | typeof VcDocumentLoader
    | typeof VpDocumentLoader
    | typeof BlockStateLoader
    | typeof RolesLoader
    | typeof AggregateVCLoader
    | typeof DidLoader
    | typeof MultiSignDocumentLoader
    | typeof MintRequestLoader
    | typeof MintTransactionLoader
    | typeof DocumentStateLoader;
/**
 * Policy data import export
 */
export class PolicyDataImportExport {
    /**
     * Static loaders
     */
    private static readonly _loaders = new Map<string, StaticLoaders>([
        ['vcs', VcDocumentLoader],
        ['vps', VpDocumentLoader],
        ['states', BlockStateLoader],
        ['schemas', SchemasLoader],
        ['roles', RolesLoader],
        ['dids', DidLoader],
        ['aggregateVCs', AggregateVCLoader],
        ['splitDocuments', SplitDocumentLoader],
        ['multiDocuments', MultiSignDocumentLoader],
        ['mintRequests', MintRequestLoader],
        ['mintTransactions', MintTransactionLoader],
        ['documentStates', DocumentStateLoader],
        ['tokens', TokensLoader],
        ['retirePools', RetirePoolLoader],
    ]);

    /**
     * Is dry run
     */
    private readonly _isDryRun!: boolean;
    /**
     * Loader instances
     */
    private readonly _loaderInstances = new Map<string, PolicyDataLoader>();

    constructor(private readonly _policy: Policy) {
        this._isDryRun = _policy.status === PolicyType.DRY_RUN;
        for (const [name, Loader] of PolicyDataImportExport._loaders) {
            if (
                ![
                    'multiDocuments',
                    'mintRequests',
                    'mintTransactions',
                    'documentStates',
                    'retirePools',
                ].includes(name)
            ) {
                this._loaderInstances.set(
                    name,
                    new Loader(
                        _policy.id,
                        _policy.topicId,
                        _policy.instanceTopicId,
                        this._isDryRun
                    )
                );
            }
        }
    }

    /**
     * Export data
     * @returns Data
     */
    async exportData() {
        const zip = new JSZip();
        zip.file('policy.json', JSON.stringify(this._policy));

        for (const [loaderName, loader] of this._loaderInstances) {
            zip.folder(loaderName);
            const files = await loader.get();
            for (const file of files) {
                zip.file(`${loaderName}/${file.id}.json`, JSON.stringify(file));
            }
            if (loaderName === 'vcs') {
                const vcIds = files.map((item) => item.id);
                const multiSignDocuments = await new MultiSignDocumentLoader(
                    this._policy.id,
                    this._policy.topicId,
                    this._policy.instanceTopicId,
                    this._isDryRun
                ).get(vcIds);
                zip.folder('multiDocuments');
                for (const multiSignDocument of multiSignDocuments) {
                    zip.file(
                        `multiDocuments/${multiSignDocument.id}.json`,
                        JSON.stringify(multiSignDocument)
                    );
                }

                const documentStates = await new DocumentStateLoader(
                    this._policy.id,
                    this._policy.topicId,
                    this._policy.instanceTopicId,
                    this._isDryRun
                ).get(vcIds);
                zip.folder('documentStates');
                for (const documentState of documentStates) {
                    delete documentState?.document?.document;
                    zip.file(
                        `documentStates/${documentState.id}.json`,
                        JSON.stringify(documentState)
                    );
                }
            }

            if (loaderName === 'vps') {
                const mintRequests = await new MintRequestLoader(
                    this._policy.id,
                    this._policy.topicId,
                    this._policy.instanceTopicId,
                    this._isDryRun
                ).get(files.map((item) => item.messageId));
                zip.folder('mintRequests');
                for (const mintRequest of mintRequests) {
                    zip.file(
                        `mintRequests/${mintRequest.id}.json`,
                        JSON.stringify(mintRequest)
                    );
                }

                const mintTransactions = await new MintTransactionLoader(
                    this._policy.id,
                    this._policy.topicId,
                    this._policy.instanceTopicId,
                    this._isDryRun
                ).get(mintRequests.map((item) => item.id));
                zip.folder('mintTransactions');
                for (const mintTransaction of mintTransactions) {
                    zip.file(
                        `mintTransactions/${mintTransaction.id}.json`,
                        JSON.stringify(mintTransaction)
                    );
                }
            }

            if (loaderName === 'tokens') {
                const policyTokens = findAllEntities(this._policy.config, [
                    'tokenId',
                ]);
                const retirePools = await new RetirePoolLoader(
                    this._policy.id,
                    this._policy.topicId,
                    this._policy.instanceTopicId,
                    this._isDryRun
                ).get(policyTokens.concat(files.map((item) => item.tokenId)));
                zip.folder('retirePools');
                for (const retirePool of retirePools) {
                    zip.file(
                        `retirePools/${retirePool.id}.json`,
                        JSON.stringify(retirePool)
                    );
                }
            }
        }

        const blocks = await new GuardiansService().sendPolicyMessage(
            PolicyEvents.GET_TAG_BLOCK_MAP,
            this._policy.id,
            null
        );
        zip.file('blocks.json', JSON.stringify(blocks));

        const users = this._isDryRun
            ? await DatabaseServer.getVirtualUsers(this._policy.id)
            : await new Users().getUsersBySrId(this._policy.owner);
        zip.file(
            'users.json',
            JSON.stringify(
                users.map((item) => {
                    return {
                        username: item.username,
                        did: item.did,
                        hederaAccountId: item.hederaAccountId,
                        hederaAccountKey: this._isDryRun
                            ? item.hederaAccountKey
                            : undefined,
                    };
                })
            )
        );

        const userTopic = await DatabaseServer.getTopicByType(
            this._policy.owner,
            TopicType.UserTopic
        );
        zip.file('userTopic.json', JSON.stringify(userTopic));

        return zip;
    }

    /**
     * Export virtual keys
     * @param owner Owner
     * @param dryRunId Dry run identifier
     * @returns Virtual keys
     */
    static async exportVirtualKeys(owner: string, dryRunId: string) {
        const zip = new JSZip();
        const virtualKeys = await new DatabaseServer(dryRunId).getVirtualKeys({
            did: { $ne: owner },
        });
        zip.folder('virtualKeys');
        for (const virtualKey of virtualKeys) {
            zip.file(
                `virtualKeys/${virtualKey.id}.json`,
                JSON.stringify(virtualKey)
            );
        }
        const dids = (await new DatabaseServer(dryRunId).getDidDocuments(
            {}
        )) as DidDocument[];
        zip.folder('dids');
        for (const did of dids) {
            zip.file(`dids/${did.id}.json`, JSON.stringify(did));
        }
        return zip;
    }

    static async importVirtualKeys(data: Buffer, dryRunId: string) {
        const zip = new JSZip();
        const content = await zip.loadAsync(data);
        const keysStringArray = await Promise.all(
            Object.entries(content.files)
                .filter((file) => !file[1].dir)
                .filter((file) => new RegExp(`^virtualKeys/.+`).test(file[0]))
                .map((file) => file[1].async('string'))
        );
        const keys = keysStringArray.map((item) => JSON.parse(item));
        for (const key of keys) {
            const existingDid = await new DatabaseServer(
                dryRunId
            ).getVirtualKey(key.did, key.type);
            if (existingDid) {
                continue;
            }
            await new DatabaseServer(dryRunId).setVirtualKey(
                key.did,
                key.type,
                key.hederaAccountKey
            );
        }

        const didsStringArray = await Promise.all(
            Object.entries(content.files)
                .filter((file) => !file[1].dir)
                .filter((file) => new RegExp(`^dids/.+`).test(file[0]))
                .map((file) => file[1].async('string'))
        );
        const dids = didsStringArray.map((item) => JSON.parse(item));
        for (const did of dids) {
            const existingDid = await new DatabaseServer(
                dryRunId
            ).getDidDocument(did.did);
            if (existingDid) {
                continue;
            }
            delete did.id;
            delete did._id;
            await new DatabaseServer(dryRunId).saveDid(did);
        }
    }

    /**
     * Import data
     * @param userId Owner
     * @param data Data
     * @returns Imported policy
     */
    static async importData(userId: string, data: Buffer) {
        await DatabaseServer.clearPolicyCaches({
            userId,
        });

        const zip = new JSZip();
        const content = await zip.loadAsync(data);

        const blocksString = await Object.entries(content.files)
            .filter((file) => !file[1].dir)
            .find((file) => /^blocks.json$/.test(file[0]))[1]
            .async('string');
        const usersString = await Object.entries(content.files)
            .filter((file) => !file[1].dir)
            .find((file) => /^users.json$/.test(file[0]))[1]
            .async('string');
        const policyConfigString = await Object.entries(content.files)
            .filter((file) => !file[1].dir)
            .find((file) => /^policy.json$/.test(file[0]))[1]
            .async('string');
        const userTopicString = await Object.entries(content.files)
            .filter((file) => !file[1].dir)
            .find((file) => /^userTopic.json$/.test(file[0]))[1]
            .async('string');

        const generatedId = new ObjectId(ObjectId.generate());
        const policy = JSON.parse(policyConfigString);
        policy.id = generatedId.toString();
        policy._id = policy.id;
        const blocks = JSON.parse(blocksString);
        const users = JSON.parse(usersString);
        const userTopic = JSON.parse(userTopicString);

        const result: any = {
            _id: generatedId,
            id: generatedId.toString(),
            userId,
            policy,
            blocks,
            users,
            userTopic,
        };
        const policyCache = await DatabaseServer.savePolicyCache(result);
        for (const [name, Loader] of PolicyDataImportExport._loaders) {
            const collection = await Loader.getFromFile(content, name);
            for (const item of collection) {
                item.cacheCollection = name;
                item.cachePolicyId = policyCache.id;
                item.oldId = item.id;
                delete item._id;
                delete item.id;
                await DatabaseServer.savePolicyCacheData(item);
            }
        }

        return policy;
    }
}
