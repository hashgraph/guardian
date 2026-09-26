import {
    BadRequestException,
    Controller,
    Get,
    NotFoundException,
    Param,
    ServiceUnavailableException,
    StreamableFile,
    UseGuards,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiParam, ApiProduces, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { IpfsService } from '@worker/services/ipfs.service';
import { sniffMime } from '@shared/utils/mime-sniff';

/**
 * Authenticated, on-demand IPFS content fetch. Route: /api/v1/ipfs/* (NO
 * :network segment — IPFS content isn't tied to a Hedera network), mirroring
 * AccountController's cross-network convention.
 */
@ApiTags('IPFS files')
@ApiCookieAuth()
@Controller('api/v1/ipfs')
@UseGuards(JwtAuthGuard)
export class IpfsController {
    constructor(private readonly ipfsService: IpfsService) {}

    @Get(':cid')
    @ApiOperation({
        summary: 'Download a file from IPFS',
        description:
            'Fetches content for the given CID via the configured IPFS gateways (with local ' +
            'zip-cache reuse) and streams it back as a downloadable file. The response Content-Type ' +
            'is a best-guess based on the file\'s bytes (magic-byte detection for binary formats, ' +
            'content sniffing for JSON/HTML/CSV/text); falls back to application/octet-stream. The ' +
            'attachment filename is the CID plus the matching extension, where one could be determined.',
    })
    @ApiParam({ name: 'cid', description: 'IPFS content identifier (CIDv0 or CIDv1)' })
    @ApiProduces('application/octet-stream')
    @ApiResponse({ status: 200, description: 'The IPFS content' })
    @ApiResponse({ status: 400, description: 'Malformed CID' })
    @ApiResponse({ status: 401, description: 'Authentication required' })
    @ApiResponse({ status: 404, description: 'CID not found on any configured gateway' })
    @ApiResponse({ status: 503, description: 'Gateways temporarily unreachable. Try again.' })
    async fetch(@Param('cid') cid: string): Promise<StreamableFile> {
        const parsedCid = this.ipfsService.parseCID(cid);
        if (!parsedCid) {
            throw new BadRequestException(`"${cid}" is not a valid IPFS CID`);
        }

        let buffer: Buffer;
        try {
            buffer = await this.ipfsService.fetchContent(parsedCid);
        } catch (error) {
            const classification = IpfsService.classifyError(error as Error);
            if (classification === 'permanent') {
                throw new NotFoundException(`CID "${parsedCid}" could not be found on any configured IPFS gateway`);
            }
            throw new ServiceUnavailableException(
                `CID "${parsedCid}" is temporarily unreachable on all configured IPFS gateways — please try again`,
            );
        }

        const { mime, ext } = await sniffMime(buffer);
        const filename = ext ? `${parsedCid}.${ext}` : parsedCid;
        return new StreamableFile(buffer, {
            type: mime,
            disposition: `attachment; filename="${filename}"`,
            length: buffer.length,
        });
    }
}
