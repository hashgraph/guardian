import { readJSON, writeJSON, pathExists } from 'fs-extra';
import { IAddressBookConfig, MessageAPI, MessageResponse } from 'interfaces';
import path from 'path';
import { HederaHelper } from 'vc-modules';

/**
 * Create or read default address book.
 */
export const readConfig = async function (): Promise<any> {
    const fileName = path.join(process.cwd(), 'config.json');
    let fileContent: any = {};

    let regenerate = false;
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
            fileContent['OPERATOR_ID'] = process.env.OPERATOR_ID;
            fileContent['OPERATOR_KEY'] = process.env.OPERATOR_KEY;
            const net = await HederaHelper.newNetwork(
                fileContent['OPERATOR_ID'],
                fileContent['OPERATOR_KEY'],
                '', '', '', ''
            );
            fileContent['ADDRESS_BOOK'] = net.addressBookId;
            fileContent['VC_TOPIC_ID'] = net.vcTopicId;
            fileContent['DID_TOPIC_ID'] = net.didTopicId;
        } catch (error) {
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
    fileContent: any
): Promise<void> {
    /**
     * Return Root Address book
     * 
     * @returns {IAddressBookConfig} - Address book
     */
    channel.response(MessageAPI.GET_ROOT_ADDRESS_BOOK, async (msg, res) => {
        const config: IAddressBookConfig = {
            owner: null,
            addressBook: fileContent['ADDRESS_BOOK'],
            vcTopic: fileContent['VC_TOPIC_ID'],
            didTopic: fileContent['DID_TOPIC_ID']
        }
        res.send(new MessageResponse(config));
    });
}