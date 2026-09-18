import { describe, expect, it } from '@jest/globals';
import { iwaFieldPaths, mapIwaPathV1ToV3 } from '@shared/config/iwa-version';
import { PROJECT_EXTRACT_FIELDS } from '@worker/project-mapper/project-fields';

/**
 * Every `iwaField` in PROJECT_EXTRACT_FIELDS must already be canonical IWA v3:
 * feeding it through the v1→v3 mapper must return it unchanged. This guards
 * against a v1 path being pasted into the source list.
 */
describe('PROJECT_EXTRACT_FIELDS iwaField values are canonical IWA v3', () => {
    for (const field of PROJECT_EXTRACT_FIELDS) {
        if (!field.iwaField) continue;
        for (const path of iwaFieldPaths(field.iwaField)) {
            it(`${field.key}: ${path}`, () => {
                expect(mapIwaPathV1ToV3(path)).toBe(path);
            });
        }
    }
});
