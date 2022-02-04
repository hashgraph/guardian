import { DidDocument } from '@entity/did-document';
import { RootConfig } from '@entity/root-config';
import { VcDocument } from '@entity/vc-document';
import { IAddressBookConfig, IRootConfig, MessageAPI, MessageError, MessageResponse, SchemaEntity } from 'interfaces';
import { MongoRepository } from 'typeorm';

/**
 * Connect to the message broker methods of working with Address books.
 * 
 * @param channel - channel
 * @param configRepository - table with Address books
 * @param didDocumentRepository - table with DID Documents
 * @param vcDocumentRepository - table with VC Documents
 */
export const rootAuthorityAPI = async function (
    channel: any,
    configRepository: MongoRepository<RootConfig>
) {
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
     * Return Address book
     * 
     * @param {Object} payload - filters
     * @param {string} payload.owner - owner DID
     * 
     * @returns {IAddressBookConfig} - Address book
     */
    channel.response(MessageAPI.GET_ADDRESS_BOOK, async (msg, res) => {
        if(!msg.payload) {
            res.send(new MessageError('Address book not found'));
            return;
        }
        
        const rootConfig = await configRepository.findOne({ where: { did: { $eq: msg.payload.owner } } });
        if (!rootConfig) {
            res.send(new MessageResponse(null));
            return;
        }
        const config: IAddressBookConfig = {
            owner: rootConfig.did,
            addressBook: rootConfig.addressBook,
            vcTopic: rootConfig.vcTopic,
            didTopic: rootConfig.didTopic
        }
        res.send(new MessageResponse(config));
    });
}