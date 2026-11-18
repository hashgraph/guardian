import assert from 'node:assert/strict';
import { getCacheKey } from '../../dist/helpers/interceptors/utils/cache.js';
import { PREFIXES } from '../../dist/constants/index.js';
import {
    makeUser, makeReq, makeCacheService, makeLogger,
    internalExceptionRethrow, loadController, guardiansInterfaces, FakeEntityOwner
} from './_controller-harness.mjs';

const DIST = '../../dist/api/service/artifact.js';

class FakeGuardians {
    async uploadArtifact(artifact, owner, parentId) { return { id: `artifact-of-${parentId}` }; }
    async deleteArtifact() { return true; }
}

async function load() {
    return loadController(DIST, {
        '#helpers': {
            Guardians: FakeGuardians, InternalException: internalExceptionRethrow, EntityOwner: FakeEntityOwner,
            CacheService: class {}, UseCache: () => () => undefined, getCacheKey,
            AnyFilesInterceptor: () => class {}, UploadedFiles: () => () => undefined, FilenameSanitizer: class {}
        },
        '#auth': { Auth: () => () => undefined, AuthUser: () => () => undefined },
        '#constants': { PREFIXES, ARTIFACT_REQUIRED_PROPS: {} },
        '#middlewares': new Proxy({}, { get: () => class {} }),
        '@guardian/common/helpers/pino-logger': { PinoLogger: class {} },
        '@guardian/interfaces': guardiansInterfaces
    });
}

// The cache interceptor tags a cached GET with its path as the gateway received it.
const listTagsOf = (user) => ({
    apiClients: getCacheKey(['/artifacts/'], user)[0],
    frontend: getCacheKey(['/artifacts?type=policy&pageIndex=0&pageSize=10'], user)[0],
});

describe('ArtifactApi cache invalidation', function () {
    this.timeout(60000);
    let ArtifactApi;
    before(async () => { ({ ArtifactApi } = await load()); });

    it('drops the cached artifact lists, as API clients and the frontend request them, after an upload', async () => {
        const cache = makeCacheService();
        const user = makeUser();
        await new ArtifactApi(cache, makeLogger()).uploadArtifacts(user, 'policy-1', [{ name: 'a.json' }], makeReq({ url: '/artifacts/policy-1' }));
        const invalidated = cache.calls.invalidate.flat();
        const { apiClients, frontend } = listTagsOf(user);
        assert.ok(invalidated.includes(apiClients), `${apiClients} not in ${invalidated}`);
        assert.ok(invalidated.includes(frontend), `${frontend} not in ${invalidated}`);
    });

    it('drops the cached artifact lists, as API clients and the frontend request them, after a delete', async () => {
        const cache = makeCacheService();
        const user = makeUser();
        await new ArtifactApi(cache, makeLogger()).deleteArtifact(user, 'artifact-1', makeReq({ url: '/artifacts/artifact-1' }));
        const invalidated = cache.calls.invalidate.flat();
        const { apiClients, frontend } = listTagsOf(user);
        assert.ok(invalidated.includes(apiClients), `${apiClients} not in ${invalidated}`);
        assert.ok(invalidated.includes(frontend), `${frontend} not in ${invalidated}`);
    });
});
