import assert from 'node:assert/strict';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import {
    SearchBlocksDTO,
    SearchBlocksNodeDTO,
    SearchBlocksPairDTO,
    SearchBlocksChainDTO,
    ComparePoliciesItemDTO,
    ComparePoliciesColumnDTO,
    ComparePoliciesPropertyValueDTO,
    ComparePoliciesBlockSideDTO,
    ComparePoliciesRateEntryDTO,
    ComparePoliciesBlocksReportRowDTO,
    ComparePoliciesPropsReportRowDTO,
    ComparePoliciesBlocksSectionDTO,
    ComparePoliciesDTO,
    ComparePoliciesMultiDTO,
    CompareModulesItemDTO,
    CompareModulesSectionDTO,
    CompareModulesDTO,
    CompareSchemasItemDTO,
    CompareSchemasDTO,
    CompareDocumentItemDTO,
    CompareDocumentsDTO,
    CompareDocumentsMultiDTO,
    CompareDocumentsV2DTO,
    CompareToolItemDTO,
    CompareToolsDTO,
    CompareToolsMultiDTO
} from '../../dist/middlewares/validation/schemas/analytics.js';
import {
    CompareFileDTO,
    FilterPolicyDTO,
    FilterPoliciesDTO,
    CompareOriginalPolicyFilterDTO,
    FilterSchemaDTO,
    FilterSchemasDTO,
    CompareSchemasByIdsRequestDTO,
    CompareSchemasByListRequestDTO,
    FilterModulesDTO,
    FilterDocumentsDTO,
    CompareDocumentsByIdsRequestDTO,
    CompareDocumentsByListRequestDTO,
    FilterToolsDTO,
    CompareToolsByIdsRequestDTO,
    CompareToolsByListRequestDTO,
    FilterSearchPoliciesDTO,
    FilterSearchBlocksDTO,
    SearchPolicyDTO,
    SearchPoliciesDTO
} from '../../dist/middlewares/validation/schemas/analytics.dto.js';

const run = (Dto, input) => validate(plainToInstance(Dto, input));

const props = (errors) => errors.map((e) => e.property);

const keys = (errors, property) => {
    const found = errors.find((e) => e.property === property);
    return found && found.constraints ? Object.keys(found.constraints) : [];
};

const childProps = (errors, property) => {
    const found = errors.find((e) => e.property === property);
    return found && found.children ? found.children.map((c) => c.property) : [];
};

describe('analytics SearchBlocksNodeDTO @unit', () => {
    it('accepts a fully valid payload', async () => {
        const errors = await run(SearchBlocksNodeDTO, {
            id: 'node-1',
            tag: 'pp_grid_sr',
            blockType: 'interfaceDocumentsSourceBlock',
            config: { foo: 'bar' },
            path: [0, 1, 0, 0]
        });
        assert.equal(errors.length, 0);
    });

    it('reports all required fields when empty', async () => {
        const errors = await run(SearchBlocksNodeDTO, {});
        assert.deepEqual(props(errors).sort(), ['blockType', 'config', 'id', 'path', 'tag']);
        assert.deepEqual(keys(errors, 'id'), ['isString']);
        assert.deepEqual(keys(errors, 'config'), ['isObject']);
        assert.deepEqual(keys(errors, 'path').sort(), ['isArray', 'isNumber']);
    });

    it('rejects non-string id, tag, blockType', async () => {
        const errors = await run(SearchBlocksNodeDTO, {
            id: 1, tag: 2, blockType: 3, config: {}, path: []
        });
        assert.deepEqual(keys(errors, 'id'), ['isString']);
        assert.deepEqual(keys(errors, 'tag'), ['isString']);
        assert.deepEqual(keys(errors, 'blockType'), ['isString']);
    });

    it('rejects non-object config', async () => {
        const errors = await run(SearchBlocksNodeDTO, {
            id: 'a', tag: 't', blockType: 'b', config: 'notobj', path: []
        });
        assert.deepEqual(keys(errors, 'config'), ['isObject']);
    });

    it('rejects path elements that are not numbers', async () => {
        const errors = await run(SearchBlocksNodeDTO, {
            id: 'a', tag: 't', blockType: 'b', config: {}, path: ['x', 1]
        });
        assert.deepEqual(keys(errors, 'path'), ['isNumber']);
    });

    it('rejects path that is not an array with isArray only', async () => {
        const errors = await run(SearchBlocksNodeDTO, {
            id: 'a', tag: 't', blockType: 'b', config: {}, path: 5
        });
        assert.deepEqual(keys(errors, 'path'), ['isArray']);
    });

    it('accepts an empty path array', async () => {
        const errors = await run(SearchBlocksNodeDTO, {
            id: 'a', tag: 't', blockType: 'b', config: {}, path: []
        });
        assert.equal(errors.length, 0);
    });
});

describe('analytics SearchBlocksPairDTO @unit', () => {
    const node = { id: 'a', tag: 't', blockType: 'b', config: {}, path: [0] };

    it('accepts a fully valid payload', async () => {
        const errors = await run(SearchBlocksPairDTO, { hash: 100, source: node, filter: node });
        assert.equal(errors.length, 0);
    });

    it('rejects non-number hash', async () => {
        const errors = await run(SearchBlocksPairDTO, { hash: 'x', source: node, filter: node });
        assert.deepEqual(keys(errors, 'hash'), ['isNumber']);
    });

    it('nests errors of an invalid source node under children', async () => {
        const errors = await run(SearchBlocksPairDTO, { hash: 1, source: {}, filter: node });
        assert.ok(props(errors).includes('source'));
        assert.deepEqual(childProps(errors, 'source').sort(), ['blockType', 'config', 'id', 'path', 'tag']);
    });
});

describe('analytics SearchBlocksChainDTO @unit', () => {
    const node = { id: 'a', tag: 't', blockType: 'b', config: {}, path: [0] };

    it('accepts a fully valid payload', async () => {
        const errors = await run(SearchBlocksChainDTO, { hash: 1, target: node, pairs: [] });
        assert.equal(errors.length, 0);
    });

    it('flags non-number hash, nested target and non-array pairs', async () => {
        const errors = await run(SearchBlocksChainDTO, { hash: 'no', target: {}, pairs: 'x' });
        assert.deepEqual(keys(errors, 'hash'), ['isNumber']);
        assert.ok(childProps(errors, 'target').length > 0);
        assert.ok(keys(errors, 'pairs').includes('isArray'));
    });

    it('reports isArray and nestedValidation when pairs is a string', async () => {
        const errors = await run(SearchBlocksChainDTO, { hash: 1, target: node, pairs: 'x' });
        const k = keys(errors, 'pairs');
        assert.ok(k.includes('isArray'));
        assert.ok(k.includes('nestedValidation'));
    });
});

describe('analytics SearchBlocksDTO @unit', () => {
    const valid = {
        name: 'n', description: 'd', version: '1', owner: 'o',
        topicId: 't', messageId: 'm', hash: 1, chains: []
    };

    it('accepts a fully valid payload', async () => {
        const errors = await run(SearchBlocksDTO, valid);
        assert.equal(errors.length, 0);
    });

    it('reports every missing required field', async () => {
        const errors = await run(SearchBlocksDTO, {});
        assert.deepEqual(
            props(errors).sort(),
            ['chains', 'description', 'hash', 'messageId', 'name', 'owner', 'topicId', 'version']
        );
    });

    it('rejects non-number hash', async () => {
        const errors = await run(SearchBlocksDTO, { ...valid, hash: 'x' });
        assert.deepEqual(keys(errors, 'hash'), ['isNumber']);
    });

    it('rejects non-array chains', async () => {
        const errors = await run(SearchBlocksDTO, { ...valid, chains: {} });
        const k = keys(errors, 'chains');
        assert.ok(k.includes('isArray'));
    });

    it('nests errors of an invalid chain element under children', async () => {
        const errors = await run(SearchBlocksDTO, { ...valid, chains: [{}] });
        assert.ok(props(errors).includes('chains'));
        assert.deepEqual(childProps(errors, 'chains'), ['0']);
    });
});

describe('analytics ComparePoliciesItemDTO @unit', () => {
    const valid = { id: 'x', name: 'p', description: '', type: 'id' };

    it('accepts a fully valid payload', async () => {
        const errors = await run(ComparePoliciesItemDTO, valid);
        assert.equal(errors.length, 0);
    });

    it('accepts when optional fields omitted', async () => {
        const errors = await run(ComparePoliciesItemDTO, valid);
        assert.equal(errors.length, 0);
    });

    it('reports required fields when empty', async () => {
        const errors = await run(ComparePoliciesItemDTO, {});
        assert.deepEqual(props(errors).sort(), ['description', 'id', 'name', 'type']);
    });

    it('rejects non-string optional version when present', async () => {
        const errors = await run(ComparePoliciesItemDTO, { ...valid, version: 5 });
        assert.deepEqual(keys(errors, 'version'), ['isString']);
    });

    it('accepts null instanceTopicId only as a string check (null is skipped by IsOptional)', async () => {
        const errors = await run(ComparePoliciesItemDTO, { ...valid, instanceTopicId: null });
        assert.equal(errors.length, 0);
    });

    it('rejects numeric instanceTopicId', async () => {
        const errors = await run(ComparePoliciesItemDTO, { ...valid, instanceTopicId: 7 });
        assert.deepEqual(keys(errors, 'instanceTopicId'), ['isString']);
    });
});

describe('analytics ComparePoliciesColumnDTO @unit', () => {
    it('accepts a fully valid payload', async () => {
        const errors = await run(ComparePoliciesColumnDTO, { name: 'left_name', label: 'Name', type: 'string' });
        assert.equal(errors.length, 0);
    });

    it('accepts optional display omitted', async () => {
        const errors = await run(ComparePoliciesColumnDTO, { name: 'n', label: 'l', type: 't' });
        assert.equal(errors.length, 0);
    });

    it('reports required fields when empty', async () => {
        const errors = await run(ComparePoliciesColumnDTO, {});
        assert.deepEqual(props(errors).sort(), ['label', 'name', 'type']);
    });

    it('rejects non-string display when present', async () => {
        const errors = await run(ComparePoliciesColumnDTO, { name: 'n', label: 'l', type: 't', display: 9 });
        assert.deepEqual(keys(errors, 'display'), ['isString']);
    });
});

describe('analytics ComparePoliciesPropertyValueDTO @unit', () => {
    it('accepts a fully valid payload with arbitrary value', async () => {
        const errors = await run(ComparePoliciesPropertyValueDTO, {
            name: 'onErrorAction', lvl: 1, path: 'onErrorAction', type: 'property', value: { any: 1 }
        });
        assert.equal(errors.length, 0);
    });

    it('reports required fields and number lvl when empty', async () => {
        const errors = await run(ComparePoliciesPropertyValueDTO, {});
        assert.deepEqual(props(errors).sort(), ['lvl', 'name', 'path', 'type']);
        assert.deepEqual(keys(errors, 'lvl'), ['isNumber']);
    });

    it('does not validate the untyped value field', async () => {
        const errors = await run(ComparePoliciesPropertyValueDTO, {
            name: 'n', lvl: 0, path: 'p', type: 't', value: undefined
        });
        assert.equal(errors.length, 0);
    });
});

describe('analytics ComparePoliciesBlockSideDTO @unit', () => {
    it('accepts a fully valid payload', async () => {
        const errors = await run(ComparePoliciesBlockSideDTO, {
            index: 1, blockType: 'interfaceContainerBlock', tag: 'Block_1', properties: [], events: []
        });
        assert.equal(errors.length, 0);
    });

    it('reports required scalars and arrays when empty', async () => {
        const errors = await run(ComparePoliciesBlockSideDTO, {});
        assert.deepEqual(props(errors).sort(), ['blockType', 'events', 'index', 'properties', 'tag']);
        assert.deepEqual(keys(errors, 'index'), ['isNumber']);
        assert.ok(keys(errors, 'properties').includes('isArray'));
    });

    it('nests errors of an invalid property element', async () => {
        const errors = await run(ComparePoliciesBlockSideDTO, {
            index: 0, blockType: 'b', tag: 't', properties: [{}], events: []
        });
        assert.deepEqual(childProps(errors, 'properties'), ['0']);
    });
});

describe('analytics ComparePoliciesRateEntryDTO @unit', () => {
    it('accepts a fully valid payload', async () => {
        const errors = await run(ComparePoliciesRateEntryDTO, { type: 'FULL', totalRate: 100, items: [] });
        assert.equal(errors.length, 0);
    });

    it('accepts optional name, path, lvl omitted', async () => {
        const errors = await run(ComparePoliciesRateEntryDTO, { type: 'FULL', totalRate: 1, items: [1, null] });
        assert.equal(errors.length, 0);
    });

    it('reports required type, totalRate, items when empty', async () => {
        const errors = await run(ComparePoliciesRateEntryDTO, {});
        assert.deepEqual(props(errors).sort(), ['items', 'totalRate', 'type']);
        assert.deepEqual(keys(errors, 'totalRate'), ['isNumber']);
        assert.deepEqual(keys(errors, 'items'), ['isArray']);
    });

    it('rejects non-number optional lvl when present', async () => {
        const errors = await run(ComparePoliciesRateEntryDTO, { type: 'F', totalRate: 1, items: [], lvl: 'x' });
        assert.deepEqual(keys(errors, 'lvl'), ['isNumber']);
    });
});

describe('analytics ComparePoliciesBlocksReportRowDTO @unit', () => {
    it('accepts an empty payload because every field is optional', async () => {
        const errors = await run(ComparePoliciesBlocksReportRowDTO, {});
        assert.equal(errors.length, 0);
    });

    it('accepts a populated payload', async () => {
        const errors = await run(ComparePoliciesBlocksReportRowDTO, {
            lvl: 1, type: 'PARTLY', block_type: 'b', left_index: 1, total_rate: '80%', size: 3
        });
        assert.equal(errors.length, 0);
    });

    it('rejects wrong scalar types', async () => {
        const errors = await run(ComparePoliciesBlocksReportRowDTO, { lvl: 'x', type: 9, size: 'big' });
        assert.deepEqual(keys(errors, 'lvl'), ['isNumber']);
        assert.deepEqual(keys(errors, 'type'), ['isString']);
        assert.deepEqual(keys(errors, 'size'), ['isNumber']);
    });

    it('rejects a non-object left side', async () => {
        const errors = await run(ComparePoliciesBlocksReportRowDTO, { left: 'x' });
        assert.ok(keys(errors, 'left').includes('isObject'));
    });

    it('nests errors of an invalid properties rate entry', async () => {
        const errors = await run(ComparePoliciesBlocksReportRowDTO, { properties: [{}] });
        assert.deepEqual(childProps(errors, 'properties'), ['0']);
    });
});

describe('analytics ComparePoliciesPropsReportRowDTO @unit', () => {
    it('accepts an empty payload because every field is optional', async () => {
        const errors = await run(ComparePoliciesPropsReportRowDTO, {});
        assert.equal(errors.length, 0);
    });

    it('rejects non-string left_name and non-object left', async () => {
        const errors = await run(ComparePoliciesPropsReportRowDTO, { left_name: 5, left: 'x' });
        assert.deepEqual(keys(errors, 'left_name'), ['isString']);
        assert.deepEqual(keys(errors, 'left'), ['isObject']);
    });

    it('rejects non-number size', async () => {
        const errors = await run(ComparePoliciesPropsReportRowDTO, { size: 'x' });
        assert.deepEqual(keys(errors, 'size'), ['isNumber']);
    });
});

describe('analytics ComparePoliciesBlocksSectionDTO @unit', () => {
    it('accepts valid columns and report arrays', async () => {
        const errors = await run(ComparePoliciesBlocksSectionDTO, {
            columns: [{ name: 'n', label: 'l', type: 't' }],
            report: [{}]
        });
        assert.equal(errors.length, 0);
    });

    it('reports missing arrays when empty', async () => {
        const errors = await run(ComparePoliciesBlocksSectionDTO, {});
        assert.deepEqual(props(errors).sort(), ['columns', 'report']);
    });

    it('nests errors of an invalid column element', async () => {
        const errors = await run(ComparePoliciesBlocksSectionDTO, { columns: [{}], report: [] });
        assert.deepEqual(childProps(errors, 'columns'), ['0']);
    });
});

describe('analytics ComparePoliciesDTO @unit', () => {
    const item = { id: 'x', name: 'p', description: '', type: 'id' };
    const section = { columns: [], report: [] };
    const valid = {
        left: item, right: item, total: 66,
        blocks: section, roles: section, groups: section,
        topics: section, tokens: section, tools: section
    };

    it('accepts a fully valid payload', async () => {
        const errors = await run(ComparePoliciesDTO, valid);
        assert.equal(errors.length, 0);
    });

    it('reports all object fields and total when empty', async () => {
        const errors = await run(ComparePoliciesDTO, {});
        assert.deepEqual(
            props(errors).sort(),
            ['blocks', 'groups', 'left', 'right', 'roles', 'tokens', 'tools', 'topics', 'total']
        );
        assert.deepEqual(keys(errors, 'total'), ['isNumber']);
    });

    it('rejects a non-object left', async () => {
        const errors = await run(ComparePoliciesDTO, { ...valid, left: 'x' });
        assert.ok(keys(errors, 'left').includes('isObject'));
    });

    it('nests errors of an invalid nested left item', async () => {
        const errors = await run(ComparePoliciesDTO, { ...valid, left: {} });
        assert.ok(childProps(errors, 'left').length > 0);
    });
});

describe('analytics ComparePoliciesMultiDTO @unit', () => {
    const item = { id: 'x', name: 'p', description: '', type: 'id' };
    const section = { columns: [], report: [] };
    const valid = {
        size: 3, left: item, rights: [item], totals: [],
        blocks: section, roles: section, groups: section,
        topics: section, tokens: section, tools: section
    };

    it('accepts a fully valid payload', async () => {
        const errors = await run(ComparePoliciesMultiDTO, valid);
        assert.equal(errors.length, 0);
    });

    it('rejects non-number size and non-array rights', async () => {
        const errors = await run(ComparePoliciesMultiDTO, { ...valid, size: 'x', rights: {} });
        assert.deepEqual(keys(errors, 'size'), ['isNumber']);
        assert.ok(keys(errors, 'rights').includes('isArray'));
    });

    it('nests errors of an invalid rights element', async () => {
        const errors = await run(ComparePoliciesMultiDTO, { ...valid, rights: [{}] });
        assert.deepEqual(childProps(errors, 'rights'), ['0']);
    });
});

describe('analytics CompareModulesItemDTO @unit', () => {
    it('accepts a fully valid payload', async () => {
        const errors = await run(CompareModulesItemDTO, { id: 'x', name: 'Module_1', description: 'd' });
        assert.equal(errors.length, 0);
    });

    it('reports required fields when empty', async () => {
        const errors = await run(CompareModulesItemDTO, {});
        assert.deepEqual(props(errors).sort(), ['description', 'id', 'name']);
    });
});

describe('analytics CompareModulesSectionDTO @unit', () => {
    it('accepts valid columns and report', async () => {
        const errors = await run(CompareModulesSectionDTO, { columns: [], report: [] });
        assert.equal(errors.length, 0);
    });

    it('reports missing arrays when empty', async () => {
        const errors = await run(CompareModulesSectionDTO, {});
        assert.deepEqual(props(errors).sort(), ['columns', 'report']);
    });
});

describe('analytics CompareModulesDTO @unit', () => {
    const item = { id: 'x', name: 'M', description: 'd' };
    const section = { columns: [], report: [] };
    const valid = {
        left: item, right: item, total: 22,
        blocks: section, inputEvents: section, outputEvents: section, variables: section
    };

    it('accepts a fully valid payload', async () => {
        const errors = await run(CompareModulesDTO, valid);
        assert.equal(errors.length, 0);
    });

    it('reports all object fields and total when empty', async () => {
        const errors = await run(CompareModulesDTO, {});
        assert.deepEqual(
            props(errors).sort(),
            ['blocks', 'inputEvents', 'left', 'outputEvents', 'right', 'total', 'variables']
        );
    });

    it('rejects non-number total', async () => {
        const errors = await run(CompareModulesDTO, { ...valid, total: 'x' });
        assert.deepEqual(keys(errors, 'total'), ['isNumber']);
    });
});

describe('analytics CompareSchemasItemDTO @unit', () => {
    const valid = { id: 'x', name: 'S', description: 'd', uuid: 'u', version: '1', iri: 'i' };

    it('accepts a fully valid payload', async () => {
        const errors = await run(CompareSchemasItemDTO, valid);
        assert.equal(errors.length, 0);
    });

    it('reports required fields when empty', async () => {
        const errors = await run(CompareSchemasItemDTO, {});
        assert.deepEqual(props(errors).sort(), ['description', 'id', 'iri', 'name', 'uuid', 'version']);
    });

    it('accepts optional topicId null and policy omitted', async () => {
        const errors = await run(CompareSchemasItemDTO, { ...valid, topicId: null });
        assert.equal(errors.length, 0);
    });

    it('rejects non-object optional policy', async () => {
        const errors = await run(CompareSchemasItemDTO, { ...valid, policy: 'x' });
        assert.deepEqual(keys(errors, 'policy'), ['isObject']);
    });
});

describe('analytics CompareSchemasDTO @unit', () => {
    const item = { id: 'x', name: 'S', description: 'd', uuid: 'u', version: '1', iri: 'i' };
    const valid = { left: item, right: item, total: 44, fields: { columns: [], report: [] } };

    it('accepts a fully valid payload', async () => {
        const errors = await run(CompareSchemasDTO, valid);
        assert.equal(errors.length, 0);
    });

    it('reports object fields and total when empty', async () => {
        const errors = await run(CompareSchemasDTO, {});
        assert.deepEqual(props(errors).sort(), ['fields', 'left', 'right', 'total']);
    });
});

describe('analytics CompareDocumentItemDTO @unit', () => {
    const valid = { id: 'x', type: 'VerifiableCredential', owner: 'o' };

    it('accepts a fully valid payload', async () => {
        const errors = await run(CompareDocumentItemDTO, valid);
        assert.equal(errors.length, 0);
    });

    it('reports required fields when empty', async () => {
        const errors = await run(CompareDocumentItemDTO, {});
        assert.deepEqual(props(errors).sort(), ['id', 'owner', 'type']);
    });

    it('accepts optional policy null', async () => {
        const errors = await run(CompareDocumentItemDTO, { ...valid, policy: null });
        assert.equal(errors.length, 0);
    });

    it('rejects non-string optional policy', async () => {
        const errors = await run(CompareDocumentItemDTO, { ...valid, policy: 5 });
        assert.deepEqual(keys(errors, 'policy'), ['isString']);
    });
});

describe('analytics CompareDocumentsDTO @unit', () => {
    const item = { id: 'x', type: 't', owner: 'o' };
    const valid = { left: item, right: item, total: 68, documents: { columns: [], report: [] } };

    it('accepts a fully valid payload', async () => {
        const errors = await run(CompareDocumentsDTO, valid);
        assert.equal(errors.length, 0);
    });

    it('reports object fields and total when empty', async () => {
        const errors = await run(CompareDocumentsDTO, {});
        assert.deepEqual(props(errors).sort(), ['documents', 'left', 'right', 'total']);
    });

    it('does not run nested validation on left because there is no ValidateNested', async () => {
        const errors = await run(CompareDocumentsDTO, { ...valid, left: {} });
        assert.equal(keys(errors, 'left').length, 0);
        assert.equal(childProps(errors, 'left').length, 0);
    });
});

describe('analytics CompareDocumentsMultiDTO @unit', () => {
    const item = { id: 'x', type: 't', owner: 'o' };
    const valid = { size: 3, left: item, rights: [item], totals: [1], documents: { columns: [], report: [] } };

    it('accepts a fully valid payload', async () => {
        const errors = await run(CompareDocumentsMultiDTO, valid);
        assert.equal(errors.length, 0);
    });

    it('rejects non-number size and non-array rights', async () => {
        const errors = await run(CompareDocumentsMultiDTO, { ...valid, size: 'x', rights: {} });
        assert.deepEqual(keys(errors, 'size'), ['isNumber']);
        assert.ok(keys(errors, 'rights').includes('isArray'));
    });
});

describe('analytics CompareDocumentsV2DTO @unit', () => {
    it('accepts object projects and presentations', async () => {
        const errors = await run(CompareDocumentsV2DTO, { projects: {}, presentations: {} });
        assert.equal(errors.length, 0);
    });

    it('reports both object fields when empty', async () => {
        const errors = await run(CompareDocumentsV2DTO, {});
        assert.deepEqual(props(errors).sort(), ['presentations', 'projects']);
    });

    it('rejects non-object fields', async () => {
        const errors = await run(CompareDocumentsV2DTO, { projects: 'x', presentations: 1 });
        assert.deepEqual(keys(errors, 'projects'), ['isObject']);
        assert.deepEqual(keys(errors, 'presentations'), ['isObject']);
    });
});

describe('analytics CompareToolItemDTO @unit', () => {
    const valid = { id: 'x', name: 'Tool 30' };

    it('accepts a fully valid payload with optionals omitted', async () => {
        const errors = await run(CompareToolItemDTO, valid);
        assert.equal(errors.length, 0);
    });

    it('reports required id and name when empty', async () => {
        const errors = await run(CompareToolItemDTO, {});
        assert.deepEqual(props(errors).sort(), ['id', 'name']);
    });

    it('accepts null optionals', async () => {
        const errors = await run(CompareToolItemDTO, { ...valid, description: null, hash: null, messageId: null });
        assert.equal(errors.length, 0);
    });

    it('rejects numeric optional hash', async () => {
        const errors = await run(CompareToolItemDTO, { ...valid, hash: 5 });
        assert.deepEqual(keys(errors, 'hash'), ['isString']);
    });
});

describe('analytics CompareToolsDTO @unit', () => {
    const item = { id: 'x', name: 'T' };
    const section = { columns: [], report: [] };
    const valid = {
        left: item, right: item, total: 74,
        blocks: section, inputEvents: section, outputEvents: section, variables: section
    };

    it('accepts a fully valid payload', async () => {
        const errors = await run(CompareToolsDTO, valid);
        assert.equal(errors.length, 0);
    });

    it('reports object fields and total when empty', async () => {
        const errors = await run(CompareToolsDTO, {});
        assert.deepEqual(
            props(errors).sort(),
            ['blocks', 'inputEvents', 'left', 'outputEvents', 'right', 'total', 'variables']
        );
    });
});

describe('analytics CompareToolsMultiDTO @unit', () => {
    const item = { id: 'x', name: 'T' };
    const section = { columns: [], report: [] };
    const valid = {
        size: 3, left: item, rights: [item], totals: [1],
        blocks: section, inputEvents: section, outputEvents: section, variables: section
    };

    it('accepts a fully valid payload', async () => {
        const errors = await run(CompareToolsMultiDTO, valid);
        assert.equal(errors.length, 0);
    });

    it('rejects non-array totals', async () => {
        const errors = await run(CompareToolsMultiDTO, { ...valid, totals: 'x' });
        assert.deepEqual(keys(errors, 'totals'), ['isArray']);
    });
});

describe('analytics-dto CompareFileDTO @unit', () => {
    it('accepts a fully valid payload', async () => {
        const errors = await run(CompareFileDTO, { id: 'u', name: 'File', value: 'base64' });
        assert.equal(errors.length, 0);
    });

    it('reports required fields when empty', async () => {
        const errors = await run(CompareFileDTO, {});
        assert.deepEqual(props(errors).sort(), ['id', 'name', 'value']);
    });

    it('rejects non-string fields', async () => {
        const errors = await run(CompareFileDTO, { id: 1, name: 2, value: 3 });
        assert.deepEqual(keys(errors, 'id'), ['isString']);
        assert.deepEqual(keys(errors, 'name'), ['isString']);
        assert.deepEqual(keys(errors, 'value'), ['isString']);
    });
});

describe('analytics-dto FilterPolicyDTO @unit', () => {
    it('accepts string type and string value', async () => {
        const errors = await run(FilterPolicyDTO, { type: 'id', value: 'x' });
        assert.equal(errors.length, 0);
    });

    it('reports required type and value when empty', async () => {
        const errors = await run(FilterPolicyDTO, {});
        assert.deepEqual(props(errors).sort(), ['type', 'value']);
    });

    it('rejects an object value because value is guarded only by IsString', async () => {
        const errors = await run(FilterPolicyDTO, { type: 'file', value: {} });
        assert.deepEqual(keys(errors, 'value'), ['isString']);
    });
});

describe('analytics-dto Options via FilterPoliciesDTO @unit', () => {
    it('accepts a fully valid payload', async () => {
        const errors = await run(FilterPoliciesDTO, {
            idLvl: 0, eventsLvl: '1', propLvl: 2, childrenLvl: '0',
            policyId1: 'a', policyId2: 'b', policyIds: ['a'], policies: []
        });
        assert.equal(errors.length, 0);
    });

    it('accepts an empty payload because every field is optional', async () => {
        const errors = await run(FilterPoliciesDTO, {});
        assert.equal(errors.length, 0);
    });

    it('accepts numeric idLvl', async () => {
        const errors = await run(FilterPoliciesDTO, { idLvl: 1 });
        assert.equal(errors.length, 0);
    });

    it('accepts string idLvl', async () => {
        const errors = await run(FilterPoliciesDTO, { idLvl: '1' });
        assert.equal(errors.length, 0);
    });

    it('rejects boolean idLvl with string-or-number constraint', async () => {
        const errors = await run(FilterPoliciesDTO, { idLvl: true });
        assert.deepEqual(keys(errors, 'idLvl'), ['string-or-number']);
    });

    it('rejects object eventsLvl with string-or-number constraint', async () => {
        const errors = await run(FilterPoliciesDTO, { eventsLvl: {} });
        assert.deepEqual(keys(errors, 'eventsLvl'), ['string-or-number']);
    });

    it('rejects non-string policyId1', async () => {
        const errors = await run(FilterPoliciesDTO, { policyId1: 5 });
        assert.deepEqual(keys(errors, 'policyId1'), ['isString']);
    });

    it('rejects non-array policyIds', async () => {
        const errors = await run(FilterPoliciesDTO, { policyIds: 'x' });
        assert.deepEqual(keys(errors, 'policyIds'), ['isArray']);
    });

    it('does not deep-validate policies array elements (no ValidateNested)', async () => {
        const errors = await run(FilterPoliciesDTO, { policies: [{}] });
        assert.equal(errors.length, 0);
    });
});

describe('analytics-dto CompareOriginalPolicyFilterDTO @unit', () => {
    it('inherits Options and accepts an empty payload', async () => {
        const errors = await run(CompareOriginalPolicyFilterDTO, {});
        assert.equal(errors.length, 0);
    });

    it('rejects boolean idLvl inherited from Options', async () => {
        const errors = await run(CompareOriginalPolicyFilterDTO, { idLvl: true });
        assert.deepEqual(keys(errors, 'idLvl'), ['string-or-number']);
    });
});

describe('analytics-dto FilterSchemaDTO @unit', () => {
    it('accepts string type, value and string policy', async () => {
        const errors = await run(FilterSchemaDTO, { type: 'id', value: 'x', policy: 'p' });
        assert.equal(errors.length, 0);
    });

    it('reports required type and value when empty', async () => {
        const errors = await run(FilterSchemaDTO, {});
        assert.deepEqual(props(errors).sort(), ['type', 'value']);
    });

    it('accepts numeric policy is rejected by string-or-object', async () => {
        const errors = await run(FilterSchemaDTO, { type: 'id', value: 'x', policy: 5 });
        assert.deepEqual(keys(errors, 'policy'), ['string-or-object']);
    });

    it('accepts object policy via string-or-object', async () => {
        const errors = await run(FilterSchemaDTO, { type: 'id', value: 'x', policy: {} });
        assert.equal(errors.length, 0);
    });
});

describe('analytics-dto FilterSchemasDTO @unit', () => {
    it('accepts an empty payload because every field is optional', async () => {
        const errors = await run(FilterSchemasDTO, {});
        assert.equal(errors.length, 0);
    });

    it('rejects non-array schemas and boolean idLvl', async () => {
        const errors = await run(FilterSchemasDTO, { schemas: 'x', idLvl: true });
        assert.deepEqual(keys(errors, 'schemas'), ['isArray']);
        assert.deepEqual(keys(errors, 'idLvl'), ['string-or-number']);
    });

    it('rejects non-string schemaId1', async () => {
        const errors = await run(FilterSchemasDTO, { schemaId1: 5 });
        assert.deepEqual(keys(errors, 'schemaId1'), ['isString']);
    });
});

describe('analytics-dto CompareSchemasByIdsRequestDTO @unit', () => {
    it('accepts a fully valid payload', async () => {
        const errors = await run(CompareSchemasByIdsRequestDTO, { schemaId1: 'a', schemaId2: 'b', idLvl: '0' });
        assert.equal(errors.length, 0);
    });

    it('reports both required ids when empty', async () => {
        const errors = await run(CompareSchemasByIdsRequestDTO, {});
        assert.deepEqual(props(errors).sort(), ['schemaId1', 'schemaId2']);
    });

    it('rejects boolean idLvl', async () => {
        const errors = await run(CompareSchemasByIdsRequestDTO, { schemaId1: 'a', schemaId2: 'b', idLvl: true });
        assert.deepEqual(keys(errors, 'idLvl'), ['string-or-number']);
    });
});

describe('analytics-dto CompareSchemasByListRequestDTO @unit', () => {
    it('accepts a fully valid payload', async () => {
        const errors = await run(CompareSchemasByListRequestDTO, { schemas: [{ type: 'id', value: 'x' }], idLvl: '0' });
        assert.equal(errors.length, 0);
    });

    it('reports required schemas array when empty', async () => {
        const errors = await run(CompareSchemasByListRequestDTO, {});
        assert.deepEqual(keys(errors, 'schemas'), ['isArray']);
    });
});

describe('analytics-dto FilterModulesDTO @unit', () => {
    it('accepts a fully valid payload', async () => {
        const errors = await run(FilterModulesDTO, { moduleId1: 'a', moduleId2: 'b' });
        assert.equal(errors.length, 0);
    });

    it('reports required module ids when empty', async () => {
        const errors = await run(FilterModulesDTO, {});
        assert.deepEqual(props(errors).sort(), ['moduleId1', 'moduleId2']);
    });

    it('rejects boolean idLvl inherited from Options', async () => {
        const errors = await run(FilterModulesDTO, { moduleId1: 'a', moduleId2: 'b', idLvl: true });
        assert.deepEqual(keys(errors, 'idLvl'), ['string-or-number']);
    });
});

describe('analytics-dto FilterDocumentsDTO @unit', () => {
    it('accepts an empty payload because every field is optional', async () => {
        const errors = await run(FilterDocumentsDTO, {});
        assert.equal(errors.length, 0);
    });

    it('rejects non-string documentId1 and non-array documentIds', async () => {
        const errors = await run(FilterDocumentsDTO, { documentId1: 5, documentIds: 'x' });
        assert.deepEqual(keys(errors, 'documentId1'), ['isString']);
        assert.deepEqual(keys(errors, 'documentIds'), ['isArray']);
    });
});

describe('analytics-dto CompareDocumentsByIdsRequestDTO @unit', () => {
    it('accepts a fully valid payload', async () => {
        const errors = await run(CompareDocumentsByIdsRequestDTO, { documentId1: 'a', documentId2: 'b' });
        assert.equal(errors.length, 0);
    });

    it('reports required document ids when empty', async () => {
        const errors = await run(CompareDocumentsByIdsRequestDTO, {});
        assert.deepEqual(props(errors).sort(), ['documentId1', 'documentId2']);
    });
});

describe('analytics-dto CompareDocumentsByListRequestDTO @unit', () => {
    it('accepts an array of two ids', async () => {
        const errors = await run(CompareDocumentsByListRequestDTO, { documentIds: ['a', 'b'] });
        assert.equal(errors.length, 0);
    });

    it('rejects an array shorter than the minimum size', async () => {
        const errors = await run(CompareDocumentsByListRequestDTO, { documentIds: ['a'] });
        assert.deepEqual(keys(errors, 'documentIds'), ['arrayMinSize']);
    });

    it('reports arrayMinSize and isArray when not an array', async () => {
        const errors = await run(CompareDocumentsByListRequestDTO, { documentIds: 'a' });
        assert.deepEqual(keys(errors, 'documentIds').sort(), ['arrayMinSize', 'isArray']);
    });
});

describe('analytics-dto FilterToolsDTO @unit', () => {
    it('accepts an empty payload because every field is optional', async () => {
        const errors = await run(FilterToolsDTO, {});
        assert.equal(errors.length, 0);
    });

    it('rejects non-string toolId1 and non-array toolIds', async () => {
        const errors = await run(FilterToolsDTO, { toolId1: 5, toolIds: 'x' });
        assert.deepEqual(keys(errors, 'toolId1'), ['isString']);
        assert.deepEqual(keys(errors, 'toolIds'), ['isArray']);
    });
});

describe('analytics-dto CompareToolsByIdsRequestDTO @unit', () => {
    it('accepts a fully valid payload', async () => {
        const errors = await run(CompareToolsByIdsRequestDTO, { toolId1: 'a', toolId2: 'b' });
        assert.equal(errors.length, 0);
    });

    it('reports required tool ids when empty', async () => {
        const errors = await run(CompareToolsByIdsRequestDTO, {});
        assert.deepEqual(props(errors).sort(), ['toolId1', 'toolId2']);
    });
});

describe('analytics-dto CompareToolsByListRequestDTO @unit', () => {
    it('accepts an array of two ids', async () => {
        const errors = await run(CompareToolsByListRequestDTO, { toolIds: ['a', 'b'] });
        assert.equal(errors.length, 0);
    });

    it('rejects an array shorter than the minimum size', async () => {
        const errors = await run(CompareToolsByListRequestDTO, { toolIds: ['a'] });
        assert.deepEqual(keys(errors, 'toolIds'), ['arrayMinSize']);
    });
});

describe('analytics-dto FilterSearchPoliciesDTO @unit', () => {
    it('accepts an empty payload because every field is optional', async () => {
        const errors = await run(FilterSearchPoliciesDTO, {});
        assert.equal(errors.length, 0);
    });

    it('accepts a fully populated payload', async () => {
        const errors = await run(FilterSearchPoliciesDTO, {
            policyId: 'a', type: 'Local', owner: 'o', minVcCount: 0, minVpCount: 0,
            minTokensCount: 0, text: 't', threshold: 50, toolMessageIds: ['a'], toolName: 'n', toolVersion: '1'
        });
        assert.equal(errors.length, 0);
    });

    it('rejects non-number minVcCount and threshold', async () => {
        const errors = await run(FilterSearchPoliciesDTO, { minVcCount: 'x', threshold: 'y' });
        assert.deepEqual(keys(errors, 'minVcCount'), ['isNumber']);
        assert.deepEqual(keys(errors, 'threshold'), ['isNumber']);
    });

    it('does not enforce the documented min and max bounds on threshold', async () => {
        const errors = await run(FilterSearchPoliciesDTO, { threshold: 9999 });
        assert.equal(errors.length, 0);
    });

    it('rejects non-array toolMessageIds', async () => {
        const errors = await run(FilterSearchPoliciesDTO, { toolMessageIds: 'x' });
        assert.deepEqual(keys(errors, 'toolMessageIds'), ['isArray']);
    });
});

describe('analytics-dto FilterSearchBlocksDTO @unit', () => {
    it('accepts a valid id and config object', async () => {
        const errors = await run(FilterSearchBlocksDTO, { id: 'u', config: {} });
        assert.equal(errors.length, 0);
    });

    it('reports required id and config when empty', async () => {
        const errors = await run(FilterSearchBlocksDTO, {});
        assert.deepEqual(props(errors).sort(), ['config', 'id']);
        assert.deepEqual(keys(errors, 'config'), ['isObject']);
    });

    it('rejects non-string id and non-object config', async () => {
        const errors = await run(FilterSearchBlocksDTO, { id: 1, config: 'x' });
        assert.deepEqual(keys(errors, 'id'), ['isString']);
        assert.deepEqual(keys(errors, 'config'), ['isObject']);
    });
});

describe('analytics-dto SearchPolicyDTO @unit', () => {
    it('accepts an empty payload because every field is optional', async () => {
        const errors = await run(SearchPolicyDTO, {});
        assert.equal(errors.length, 0);
    });

    it('accepts a populated payload', async () => {
        const errors = await run(SearchPolicyDTO, {
            type: 'Local', id: 'a', topicId: 't', messageId: 'm', uuid: 'u', name: 'n',
            description: 'd', version: '1.0.0', status: 'DRAFT', owner: 'o', tags: [],
            vcCount: 0, vpCount: 0, tokensCount: 0, rate: 0
        });
        assert.equal(errors.length, 0);
    });

    it('rejects non-number vcCount and rate', async () => {
        const errors = await run(SearchPolicyDTO, { vcCount: 'x', rate: 'y' });
        assert.deepEqual(keys(errors, 'vcCount'), ['isNumber']);
        assert.deepEqual(keys(errors, 'rate'), ['isNumber']);
    });

    it('rejects non-array tags', async () => {
        const errors = await run(SearchPolicyDTO, { tags: 'x' });
        assert.deepEqual(keys(errors, 'tags'), ['isArray']);
    });
});

describe('analytics-dto SearchPoliciesDTO @unit', () => {
    it('accepts a valid result array and null target', async () => {
        const errors = await run(SearchPoliciesDTO, { target: null, result: [] });
        assert.equal(errors.length, 0);
    });

    it('reports required result array when empty', async () => {
        const errors = await run(SearchPoliciesDTO, {});
        assert.deepEqual(keys(errors, 'result'), ['isArray']);
    });

    it('rejects non-object target and non-array result', async () => {
        const errors = await run(SearchPoliciesDTO, { target: 'x', result: 'y' });
        assert.deepEqual(keys(errors, 'target'), ['isObject']);
        assert.deepEqual(keys(errors, 'result'), ['isArray']);
    });

    it('does not deep-validate result elements (no ValidateNested)', async () => {
        const errors = await run(SearchPoliciesDTO, { result: [{ vcCount: 'x' }] });
        assert.equal(errors.length, 0);
    });
});
