import { BooleanProperty } from './boolean-prop';

const SKIP_MOCK_PROMPT_PREFIX = 'DRY_RUN_SKIP_MOCK_PROMPT:';

export class DryRunSettings {
    public static skipMockPrompt(policyId: string): boolean {
        if (!policyId) {
            return false;
        }
        return new BooleanProperty(SKIP_MOCK_PROMPT_PREFIX + policyId, false).load();
    }

    public static muteMockPrompt(policyId: string): void {
        if (!policyId) {
            return;
        }
        new BooleanProperty(SKIP_MOCK_PROMPT_PREFIX + policyId, true).save();
    }
}
