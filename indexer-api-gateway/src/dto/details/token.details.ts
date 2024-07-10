import {
    Token,
    TokenDetails,
} from '@indexer/interfaces';
import {
    DetailsDTO,
} from './details.interface.js';
import { RawTokenDTO } from '../raw-token.dto.js';

export class TokenDTO
    extends RawTokenDTO
    implements Token {}

export class TokenDetailsDTO
    extends DetailsDTO<TokenDTO, TokenDTO>
    implements TokenDetails {}
