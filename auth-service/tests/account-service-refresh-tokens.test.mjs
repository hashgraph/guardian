import assert from 'node:assert/strict';
import { loadService, capturedHandlers } from './_handler-harness.mjs';

const USERNAME = 'alice';
const PASSWORD = 'correct-horse-battery-staple';

// In-memory users collection: every read returns its own copy and every save
// stores the copy it is given, as two requests with separate ORM contexts do.
// Filters and updates follow MongoDB for the operators the auth service uses.
class InMemoryUsers {
    static docs = [];

    static fieldMatches(value, expected) {
        if (expected !== null && typeof expected === 'object' && '$ne' in expected) {
            return value !== expected.$ne;
        }
        if (expected === null) {
            return value === null || value === undefined;
        }
        return Array.isArray(value) ? value.includes(expected) : value === expected;
    }

    static matches(doc, filters) {
        return Object.entries(filters).every(([field, expected]) => InMemoryUsers.fieldMatches(doc[field], expected));
    }

    async findOne(_entity, filters) {
        const doc = InMemoryUsers.docs.find((item) => InMemoryUsers.matches(item, filters));
        return doc ? structuredClone(doc) : null;
    }

    async save(_entity, user) {
        const index = InMemoryUsers.docs.findIndex((item) => item.id === user.id);
        InMemoryUsers.docs[index] = structuredClone(user);
        return user;
    }

    async updateEntity(_entity, update, filters) {
        const docs = InMemoryUsers.docs.filter((item) => InMemoryUsers.matches(item, filters));
        for (const doc of docs) {
            Object.assign(doc, structuredClone(update.$set || {}));
            for (const [field, value] of Object.entries(update.$push || {})) {
                if (doc[field] === null) {
                    throw new Error(`The field '${field}' must be an array but is of type null`);
                }
                doc[field] = [...(doc[field] || []), value];
            }
        }
        return docs.length;
    }
}

class NoOtpSecrets {
    async findOne() { return null; }
}

let refreshTokenCounter = 0;
const fakeUserAccessTokenService = {
    generateRefreshToken() {
        refreshTokenCounter++;
        return { id: `refresh-${refreshTokenCounter}`, token: `refresh-${refreshTokenCounter}` };
    },
    verifyRefreshToken(token) {
        return { id: token, name: USERNAME, expireAt: Date.now() + 60_000 };
    },
    generateAccessToken(user) { return `access-for-${user.username}`; },
};

describe('@unit account-service refresh tokens issued at login', function () {
    this.timeout(20000);

    let login;
    let generateAccessToken;
    let passwordDigest;

    const seedUser = (refreshToken) => {
        InMemoryUsers.docs = [{ _id: 'object-id-1', id: 'user-1', username: USERNAME, role: 'STANDARD_REGISTRY', refreshToken, ...passwordDigest }];
    };

    const assertRefreshAccepted = async (refreshToken) => {
        const refreshed = await generateAccessToken({ refreshToken });
        assert.equal(refreshed.body.accessToken, `access-for-${USERNAME}`, `refresh token ${refreshToken} was refused`);
    };

    before(async () => {
        const commonOverrides = { '@guardian/common': { DatabaseServer: InMemoryUsers, DataBaseHelper: NoOtpSecrets } };
        const utils = await loadService('../dist/utils/index.js', commonOverrides);
        utils.UserAccessTokenService.New = async () => fakeUserAccessTokenService;
        const { AccountService } = await loadService('../dist/api/account-service.js', { ...commonOverrides, '#utils': utils });

        passwordDigest = await utils.UserPassword.generatePasswordV2(PASSWORD);

        const firstHandler = capturedHandlers.length;
        const logger = { async error() {}, async info() {}, async warn() {}, async debug() {} };
        new AccountService().registerListeners(logger);
        const handlers = capturedHandlers.slice(firstHandler);
        const handlerFor = (event) => handlers.find((handler) => handler.event === `Enum.${event}`).cb;
        login = handlerFor('GENERATE_NEW_TOKEN');
        generateAccessToken = handlerFor('GENERATE_NEW_ACCESS_TOKEN');
    });

    it('accepts the refresh token of every login when the same user logs in twice at once', async () => {
        seedUser([]);
        const logins = await Promise.all([
            login({ username: USERNAME, password: PASSWORD }),
            login({ username: USERNAME, password: PASSWORD }),
        ]);

        for (const { body } of logins) {
            await assertRefreshAccepted(body.refreshToken);
        }
    });

    it('accepts the refresh token of a user whose stored token list is null', async () => {
        seedUser(null);
        const { body } = await login({ username: USERNAME, password: PASSWORD });

        await assertRefreshAccepted(body.refreshToken);
    });
});
