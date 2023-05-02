import { Logger, KeyType, Wallet } from '@guardian/common';
import { MongoEntityManager } from '@mikro-orm/mongodb';

/**
 * Migration function
 * @constructor
 */
export async function sendKeysToVault(em: MongoEntityManager): Promise<void> {
    const logger = new Logger();
    const wallet = new Wallet();
    try {
        logger.info('Start send keys to vault', ['GUARDIAN_SERVICE']);

        const tokenCollection = em.getCollection('Token');
        const tokens = tokenCollection.find();
        let updatedTokens = 0;
        while (await tokens.hasNext()) {
            const token = await tokens.next();
            if (
                !token.supplyKey &&
                !token.adminKey &&
                !token.freezeKey &&
                !token.kycKey &&
                !token.wipeKey
            ) {
                continue;
            }
            await Promise.all([
                wallet.setKey(
                    token.owner,
                    KeyType.TOKEN_TREASURY_KEY,
                    token.tokenId,
                    token.adminKey
                ),
                wallet.setKey(
                    token.owner,
                    KeyType.TOKEN_ADMIN_KEY,
                    token.tokenId,
                    token.adminKey
                ),
                wallet.setKey(
                    token.owner,
                    KeyType.TOKEN_FREEZE_KEY,
                    token.tokenId,
                    token.freezeKey
                ),
                wallet.setKey(
                    token.owner,
                    KeyType.TOKEN_KYC_KEY,
                    token.tokenId,
                    token.kycKey
                ),
                wallet.setKey(
                    token.owner,
                    KeyType.TOKEN_SUPPLY_KEY,
                    token.tokenId,
                    token.supplyKey
                ),
                wallet.setKey(
                    token.owner,
                    KeyType.TOKEN_WIPE_KEY,
                    token.tokenId,
                    token.wipeKey
                )
            ]);
            const enableAdmin = token.adminKey ? true : false;
            const enableFreeze = token.freezeKey ? true : false;
            const enableKYC = token.kycKey ? true : false;
            const changeSupply = token.supplyKey ? true : false;
            const enableWipe = token.wipeKey ? true : false;

            await tokenCollection.updateOne(
                {
                    _id: token._id,
                },
                {
                    $set: {
                        enableAdmin,
                        enableFreeze,
                        enableKYC,
                        changeSupply,
                        enableWipe,
                    },
                    $unset: {
                        adminKey: '',
                        freezeKey: '',
                        kycKey: '',
                        supplyKey: '',
                        wipeKey: '',
                    },
                },
                {
                    upsert: false,
                }
            );
            updatedTokens++;
        }
        logger.info(`Updated ${updatedTokens} tokens`, ['GUARDIAN_SERVICE']);

        const topicCollection = em.getCollection('Topic');
        const topics = topicCollection.find();
        let updatedTopics = 0;
        while (await topics.hasNext()) {
            const topic = await topics.next();
            if (!topic.key) {
                continue;
            }
            await Promise.all([
                wallet.setKey(
                    topic.owner,
                    KeyType.TOPIC_ADMIN_KEY,
                    topic.topicId,
                    topic.key
                ),
                wallet.setKey(
                    topic.owner,
                    KeyType.TOPIC_SUBMIT_KEY,
                    topic.topicId,
                    topic.key
                ),
            ]);

            await topicCollection.updateOne(
                {
                    _id: topic._id,
                },
                {
                    $unset: {
                        key: '',
                    },
                },
                {
                    upsert: false,
                }
            );
            updatedTopics++;
        }

        logger.info(`Updated ${updatedTopics} topics`, ['GUARDIAN_SERVICE']);
    } catch (e) {
        logger.error(`Send keys to vault error: ${e.message}`, [
            'GUARDIAN_SERVICE',
        ]);
    }
}
