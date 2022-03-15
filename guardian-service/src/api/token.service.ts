import { Token } from '@entity/token';
import { IToken, MessageAPI, MessageError, MessageResponse } from 'interfaces';
import { Logger } from 'logger-helper';
import { MongoRepository } from 'typeorm';

/**
 * Connect to the message broker methods of working with tokens.
 * 
 * @param channel - channel
 * @param tokenRepository - table with tokens
 */
export const tokenAPI = async function (
    channel: any,
    tokenRepository: MongoRepository<Token>
): Promise<void> {
    /**
     * Create new token
     * 
     * @param {IToken} payload - token
     * 
     * @returns {IToken[]} - all tokens
     */
    channel.response(MessageAPI.SET_TOKEN, async (msg, res) => {
        const tokenObject = tokenRepository.create(msg.payload);
        const result = await tokenRepository.save(tokenObject);
        const tokens = await tokenRepository.find();
        res.send(new MessageResponse(tokens));
    })

    /**
     * Return tokens
     * 
     * @param {Object} [payload] - filters
     * @param {string} [payload.tokenId] - token id 
     * 
     * @returns {IToken[]} - tokens
     */
    channel.response(MessageAPI.GET_TOKENS, async (msg, res) => {
        if (msg.payload) {
            if (msg.payload.tokenId) {
                const reqObj: any = { where: {} };
                reqObj.where['tokenId'] = { $eq: msg.payload.tokenId }
                const tokens: IToken[] = await tokenRepository.find(reqObj);
                res.send(new MessageResponse(tokens));
                return;
            }
            if (msg.payload.ids) {
                const reqObj: any = { where: {} };
                reqObj.where['tokenId'] = { $in: msg.payload.ids }
                const tokens: IToken[] = await tokenRepository.find(reqObj);
                res.send(new MessageResponse(tokens));
                return;
            }
        }
        const tokens: IToken[] = await tokenRepository.find();
        res.send(new MessageResponse(tokens));
    })

    /**
     * Import tokens
     * 
     * @param {IToken[]} payload - tokens
     * 
     * @returns {IToken[]} - all tokens
     */
    channel.response(MessageAPI.IMPORT_TOKENS, async (msg, res) => {
        try {
            let items: IToken[] = msg.payload;
            if (!Array.isArray(items)) {
                items = [items];
            }
            const existingTokens = await tokenRepository.find();
            const existingTokensMap = {};
            for (let i = 0; i < existingTokens.length; i++) {
                existingTokensMap[existingTokens[i].tokenId] = true;
            }
            items = items.filter((token: any) => !existingTokensMap[token.tokenId]);
            const tokenObject = tokenRepository.create(items);
            const result = await tokenRepository.save(tokenObject);
            const tokens = await tokenRepository.find();
            res.send(new MessageResponse(tokens));
        } catch (error) {
            new Logger().error(error.toString(), ['GUARDIAN_SERVICE']);
            console.error(error);
            res.send(new MessageError(error.message));
        }
    })
}