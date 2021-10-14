import { Token } from '@entity/token';
import { IToken, MessageAPI } from 'interfaces';
import { MongoRepository } from 'typeorm';

export const tokenAPI = async function (
    channel: any,
    tokenRepository: MongoRepository<Token>
): Promise<void> {
    channel.response(MessageAPI.SET_TOKEN, async (msg, res) => {
        const tokenObject = tokenRepository.create(msg.payload);
        const result = await tokenRepository.save(tokenObject);
        const tokens = await tokenRepository.find();
        res.send(tokens);
    })

    channel.response(MessageAPI.GET_TOKENS, async (msg, res) => {
        if (msg.payload && msg.payload.tokenId) {
            const reqObj: any = { where: {} };
            reqObj.where['tokenId'] = { $eq: msg.payload.tokenId }
            const tokens: IToken[] = await tokenRepository.find(reqObj);
            res.send(tokens);
        } else {
            const tokens: IToken[] = await tokenRepository.find();
            res.send(tokens);
        }
    })
}