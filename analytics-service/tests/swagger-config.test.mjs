import assert from 'node:assert/strict';
import { SwaggerConfig } from '../dist/helpers/swagger-config.js';

describe('@unit SwaggerConfig', () => {
    it('is a built DocumentBuilder object (info + servers + … fields)', () => {
        assert.equal(typeof SwaggerConfig, 'object');
        assert.ok(SwaggerConfig.info, 'expected info block');
    });

    it('title is "Guardian"', () => {
        assert.equal(SwaggerConfig.info.title, 'Guardian');
    });

    it('description references Policy Workflow Engine (the product term, not just "guardian")', () => {
        assert.match(SwaggerConfig.info.description, /Policy Workflow Engine/);
    });

    it('contact email and url are envisionblockchain.com (until a rebrand updates this)', () => {
        assert.equal(SwaggerConfig.info.contact.email, 'info@envisionblockchain.com');
        assert.equal(SwaggerConfig.info.contact.url, 'https://envisionblockchain.com');
    });

    it('license is Apache 2.0 with the canonical URL', () => {
        assert.equal(SwaggerConfig.info.license.name, 'Apache 2.0');
        assert.match(SwaggerConfig.info.license.url, /apache\.org\/licenses\/LICENSE-2\.0/);
    });

    it('declares at least one server with url "/" and version label', () => {
        assert.ok(Array.isArray(SwaggerConfig.servers));
        assert.ok(SwaggerConfig.servers.length >= 1);
        const root = SwaggerConfig.servers.find((s) => s.url === '/');
        assert.ok(root);
        assert.match(root.description, /version/i);
    });

    it('does not bake in API keys or secrets in any field', () => {
        const json = JSON.stringify(SwaggerConfig);
        for (const re of [/api[_-]?key/i, /password/i, /token=/, /secret/i]) {
            assert.equal(re.test(json), false, `Swagger config leaks ${re}`);
        }
    });
});
