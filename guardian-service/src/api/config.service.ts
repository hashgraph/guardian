import { Settings } from '@entity/settings';
import { readJSON, writeJSON, pathExists } from 'fs-extra';
import { CommonSettings, IAddressBookConfig, MessageAPI, MessageError, MessageResponse } from 'interfaces';
import { Logger } from 'logger-helper';
import path from 'path';
import { MongoRepository } from 'typeorm';
import { HederaHelper } from 'vc-modules';

/**
 * Create or read default address book.
 */
export const readConfig = async function (settingsRepository: MongoRepository<Settings>, forceRegenerate: boolean = false): Promise<any> {
    const fileName = path.join(process.cwd(), 'config.json');
    let fileContent: any = {};

    let regenerate = forceRegenerate;
    try {
        const exists = await pathExists(fileName);
        if (exists) {
            fileContent = await readJSON(fileName);
        } else {
            regenerate = true;
        }
    } catch (error) {
        regenerate = true;
    }
    if (!fileContent.hasOwnProperty('OPERATOR_ID')) {
        regenerate = true;
    }
    if (!fileContent.hasOwnProperty('OPERATOR_KEY')) {
        regenerate = true;
    }
    if (!fileContent.hasOwnProperty('ADDRESS_BOOK')) {
        regenerate = true;
    }
    if (!fileContent.hasOwnProperty('VC_TOPIC_ID')) {
        regenerate = true;
    }
    if (!fileContent.hasOwnProperty('DID_TOPIC_ID')) {
        regenerate = true;
    }

    if (regenerate) {
        try {
            const operatorId = await settingsRepository.findOne({
                name: 'OPERATOR_ID'
            });
            const operatorKey = await settingsRepository.findOne({
                name: 'OPERATOR_KEY'
            });
            fileContent['OPERATOR_ID'] = operatorId?.value || process.env.OPERATOR_ID;
            fileContent['OPERATOR_KEY'] = operatorKey?.value || process.env.OPERATOR_KEY;
            const net = await HederaHelper.newNetwork(
                fileContent['OPERATOR_ID'],
                fileContent['OPERATOR_KEY'],
                '', '', '', ''
            );
            fileContent['ADDRESS_BOOK'] = net.addressBookId;
            fileContent['VC_TOPIC_ID'] = net.vcTopicId;
            fileContent['DID_TOPIC_ID'] = net.didTopicId;
        } catch (error) {
            await writeJSON(fileName, {});
            throw ('Failed to create Address Book: \n' + error);
        }
        console.log('Regenerate config.json')
        await writeJSON(fileName, fileContent);
    }
    return fileContent;
}

/**
 * Connecting to the message broker methods of working with root address book.
 * 
 * @param channel - channel
 * @param approvalDocumentRepository - table with approve documents
 */
export const configAPI = async function (
    channel: any,
    fileContent: any,
    settingsRepository: MongoRepository<Settings>
): Promise<void> {
    /**
     * Return Root Address book
     * 
     * @returns {IAddressBookConfig} - Address book
     */
    channel.response(MessageAPI.GET_ROOT_ADDRESS_BOOK, async (msg, res) => {
        try {
            if (!fileContent) {
                throw new Error("Invalid Address Book settings");
            }

            const config: IAddressBookConfig = {
                owner: null,
                addressBook: fileContent['ADDRESS_BOOK'],
                vcTopic: fileContent['VC_TOPIC_ID'],
                didTopic: fileContent['DID_TOPIC_ID']
            }

            res.send(new MessageResponse(config));
        }
        catch (e) {
            new Logger().error(e.toString(), ['GUARDIAN_SERVICE']);
            res.send(new MessageError(e));
        }
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
                    name: 'SCHEMA_TOPIC_ID' }, {
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
                    name: 'OPERATOR_ID' }, {
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
                    name: 'OPERATOR_KEY' }, {
                    value: settings.operatorKey
                });
            }
            else {
                await settingsRepository.save({
                    name: 'OPERATOR_KEY',
                    value: settings.operatorKey
                });
            }

            fileContent = await readConfig(settingsRepository, true);
            res.send(new MessageResponse(null));
        }
        catch (e) {
            fileContent = null;
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