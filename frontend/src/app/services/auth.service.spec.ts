import { HttpClientTestingModule } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';

/**
 * Built from the payload generateAccessToken actually signs
 * (auth-service/src/utils/user-access-token.ts): { username, did, role, expireAt }.
 */
function signedLikeTheServer(payload: object): string {
    const base64url = (value: string) => btoa(value)
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const body = new TextEncoder().encode(JSON.stringify(payload));
    const binary = Array.from(body, (byte) => String.fromCharCode(byte)).join('');
    return `${base64url('{"alg":"RS256"}')}.${base64url(binary)}.signature`;
}

describe('AuthService', () => {
    let service: AuthService;

    beforeEach(() => {
        localStorage.removeItem('accessToken');
        TestBed.configureTestingModule({
            imports: [HttpClientTestingModule],
            providers: [AuthService],
        });
        service = TestBed.inject(AuthService);
    });

    afterEach(() => localStorage.removeItem('accessToken'));

    describe('getUserKey', () => {
        it('reads the username from a real access token', () => {
            localStorage.setItem('accessToken', signedLikeTheServer({
                username: 'standard_registry',
                did: 'did:hedera:testnet:abc',
                role: 'STANDARD_REGISTRY',
                expireAt: 1893456000000,
            }));

            expect(service.getUserKey()).toBe('standard_registry');
        });

        it('survives a non-ASCII username', () => {
            localStorage.setItem('accessToken', signedLikeTheServer({
                username: 'Ünïcødé',
                did: 'did:hedera:testnet:abc',
                role: 'USER',
                expireAt: 1893456000000,
            }));

            expect(service.getUserKey()).toBe('Ünïcødé');
        });

        it('returns null with no token', () => {
            expect(service.getUserKey()).toBeNull();
        });

        it('returns null for a malformed token instead of throwing', () => {
            localStorage.setItem('accessToken', 'not.a.jwt');

            expect(service.getUserKey()).toBeNull();
        });
    });
});
