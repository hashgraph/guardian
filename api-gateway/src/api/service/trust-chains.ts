import { Guardians } from '../../helpers/guardians.js';
import { Users } from '../../helpers/users.js';
import { IAuthUser, Logger } from '@guardian/common';
import { Controller, Get, HttpCode, HttpStatus, Req, Response } from '@nestjs/common';
import { UserRole } from '@guardian/interfaces';
import { ApiTags } from '@nestjs/swagger';
import { UseCache } from '../../helpers/decorators/cache.js';
import { Auth } from '../../auth/auth.decorator.js';

@Controller('trust-chains')
@ApiTags('trust-chains')
export class TrustChainsApi {
    @Get('/')
    @HttpCode(HttpStatus.OK)
    @Auth(UserRole.AUDITOR)
    async getTrustChains(@Req() req, @Response() res): Promise<any> {
        try {
            const guardians = new Guardians();
            let pageIndex: any;
            let pageSize: any;
            let filters: any;
            if (req.query) {
                if (req.query.pageIndex && req.query.pageSize) {
                    pageIndex = req.query.pageIndex;
                    pageSize = req.query.pageSize;
                }
                if (req.query.policyId) {
                    filters = {
                        policyId: req.query.policyId
                    }
                } else if (req.query.policyOwner) {
                    filters = {
                        policyOwner: req.query.policyOwner
                    }
                }
            }
            const { items, count } = await guardians.getVpDocuments({
                filters,
                pageIndex,
                pageSize
            });
            return res.header('X-Total-Count', count).send(items);
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw error;
        }
    }

    /**
     * @param req
     */
    @Get('/:hash')
    @HttpCode(HttpStatus.OK)
    @UseCache()
    @Auth(UserRole.AUDITOR)
    async getTrustChainByHash(@Req() req): Promise<any> {
        try {
            const guardians = new Guardians();
            const hash = req.params.hash;
            const chain = await guardians.getChain(hash);
            const DIDs = chain.map((item) => {
                if (item.type === 'VC' && item.document) {
                    if (typeof item.document.issuer === 'string') {
                        return item.document.issuer;
                    } else {
                        return item.document.issuer.id;
                    }
                }
                if (item.type === 'DID') {
                    return item.id;
                }
                return null;
            }).filter(did => !!did);

            const users = new Users();
            const allUsers = (await users.getUsersByIds(DIDs)) || [];
            const userMap = allUsers.map((user: IAuthUser) => {
                return { username: user.username, did: user.did }
            })

            return { chain, userMap };
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw error
        }
    }
}
