import {
    RegistryUser,
    RegistryUserActivity,
    RegistryUserAnalytics,
    RegistryUserDetails,
    RegistryUserOptions,
} from '@indexer/interfaces';
import { ApiProperty } from '@nestjs/swagger';
import { MessageDTO } from '../message.dto.js';
import { DetailsActivityDTO } from './details.interface.js';
import { RawMessageDTO } from '../raw-message.dto.js';

export class RegistryUserOptionsDTO implements RegistryUserOptions {
    @ApiProperty({
        description: 'DID',
        example:
            'did:hedera:testnet:8Go53QCUXZ4nzSQMyoWovWCxseogGTMLDiHg14Fkz4VN_0.0.4481265',
    })
    did: string;
}

export class RegistryUserAnalyticsDTO implements RegistryUserAnalytics {
    @ApiProperty({
        description: 'Text search',
    })
    textSearch: string;
}

export class RegistryUserActivityDTO implements RegistryUserActivity {
    @ApiProperty({
        description: 'VCs',
        example: 10,
    })
    vcs: number;
    @ApiProperty({
        description: 'VPs',
        example: 10,
    })
    vps: number;
    @ApiProperty({
        description: 'Roles',
        example: 10,
    })
    roles: number;
}

export class RegistryUserDTO
    extends MessageDTO<RegistryUserOptionsDTO, RegistryUserAnalyticsDTO>
    implements RegistryUser
{
    @ApiProperty({
        type: RegistryUserOptionsDTO,
    })
    declare options: RegistryUserOptionsDTO;
    @ApiProperty({
        type: RegistryUserAnalyticsDTO,
    })
    declare analytics: RegistryUserAnalyticsDTO;
}

export class RegistryUserDetailsDTO
    extends DetailsActivityDTO<RegistryUserDTO, RegistryUserActivityDTO>
    implements RegistryUserDetails
{
    @ApiProperty({
        type: RegistryUserDTO,
    })
    declare item?: RegistryUserDTO;
    @ApiProperty({
        type: RawMessageDTO,
    })
    declare row?: RawMessageDTO;
    @ApiProperty({
        type: RegistryUserActivityDTO,
    })
    declare activity?: RegistryUserActivityDTO;
}
