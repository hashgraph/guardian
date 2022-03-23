import { RootConfig } from '@entity/root-config';
import { Settings } from '@entity/settings';
import { Topic } from '@entity/topic';
import { CommonSettings, IRootConfig, MessageAPI, MessageError, MessageResponse } from 'interfaces';
import { Logger } from 'logger-helper';
import { MongoRepository } from 'typeorm';


/**
 * Connecting to the message broker methods of working with root address book.
 * 
 * @param channel - channel
 * @param approvalDocumentRepository - table with approve documents
 */
export const configAPI = async function (
    channel: any,
    configRepository: MongoRepository<RootConfig>,
    settingsRepository: MongoRepository<Settings>,
    topicRepository: MongoRepository<Topic>,
): Promise<void> {
    channel.response(MessageAPI.GET_TOPIC, async (msg, res) => {
        const { type, owner } = msg.payload;
        const topic = await topicRepository.findOne({
            owner: owner,
            type: type
        });
        if (!topic) {
            res.send(new MessageError('Topic not found'));
            return;
        }
        res.send(new MessageResponse(topic));
    });

    /**
     * Return Address books, VC Document and DID Document
     * 
     * @param {string} payload - DID
     * 
     * @returns {IFullConfig} - approve documents
     */
    channel.response(MessageAPI.GET_ROOT_CONFIG, async (msg, res) => {
        const rootConfig = await configRepository.findOne({ where: { did: { $eq: msg.payload } } });
        if (!rootConfig) {
            res.send(new MessageResponse(null));
            return;
        }
        res.send(new MessageResponse(rootConfig));
    })

    /**
     * Create Address book
     * 
     * @param {Object} payload - Address book config
     * 
     * @returns {IRootConfig} - Address book config
     */
    channel.response(MessageAPI.SET_ROOT_CONFIG, async (msg, res) => {
        const rootObject = configRepository.create(msg.payload as RootConfig);
        const result: IRootConfig = await configRepository.save(rootObject);
        res.send(new MessageResponse(result));
    });

    /**
     * Update settings
     * 
     */
    channel.response(MessageAPI.UPDATE_SETTINGS, async (msg, res) => {
        try {
            const settings = msg.payload as CommonSettings;
            const oldSchemaTopicId = await settingsRepository.findOne({
                name: 'SCHEMA_TOPIC_ID'
            });
            if (oldSchemaTopicId) {
                await settingsRepository.update({
                    name: 'SCHEMA_TOPIC_ID'
                }, {
                    value: settings.schemaTopicId
                });
            }
            else {
                await settingsRepository.save({
                    name: 'SCHEMA_TOPIC_ID',
                    value: settings.schemaTopicId
                });
            }

            const oldOperatorId = await settingsRepository.findOne({
                name: 'OPERATOR_ID'
            });
            if (oldOperatorId) {
                await settingsRepository.update({
                    name: 'OPERATOR_ID'
                }, {
                    value: settings.operatorId
                });
            }
            else {
                await settingsRepository.save({
                    name: 'OPERATOR_ID',
                    value: settings.operatorId
                });
            }

            const oldOperatorKey = await settingsRepository.findOne({
                name: 'OPERATOR_KEY'
            });
            if (oldOperatorKey) {
                await settingsRepository.update({
                    name: 'OPERATOR_KEY'
                }, {
                    value: settings.operatorKey
                });
            }
            else {
                await settingsRepository.save({
                    name: 'OPERATOR_KEY',
                    value: settings.operatorKey
                });
            }
            res.send(new MessageResponse(null));
        }
        catch (e) {
            new Logger().error(e.toString(), ['GUARDIAN_SERVICE']);
            res.send(new MessageError(e))
        }
    });

    /**
     * Get settings
     * 
     */
    channel.response(MessageAPI.GET_SETTINGS, async (msg, res) => {
        try {
            const operatorId = await settingsRepository.findOne({
                name: 'OPERATOR_ID'
            });
            const operatorKey = await settingsRepository.findOne({
                name: 'OPERATOR_KEY'
            });
            const schemaTopicId = await settingsRepository.findOne({
                name: 'SCHEMA_TOPIC_ID'
            });

            res.send(new MessageResponse({
                operatorId: operatorId?.value || process.env.OPERATOR_ID,
                operatorKey: operatorKey?.value || process.env.OPERATOR_KEY,
                schemaTopicId: schemaTopicId?.value || process.env.SCHEMA_TOPIC_ID
            }));
        }
        catch (e) {
            new Logger().error(e.toString(), ['GUARDIAN_SERVICE']);
            res.send(new MessageError(e))
        }
    });
}