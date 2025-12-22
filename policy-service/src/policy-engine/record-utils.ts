import { Recording } from './record/recording.js';
import { Running } from './record/index.js';
import { PolicyComponentsUtils } from './policy-components-utils.js';
import { PolicyUser } from './policy-user.js';
import { AnyBlockType } from './policy-engine.interface.js';

/**
 * Record utils
 */
export class RecordUtils {
    /**
     * Get record controller
     * @param policyId
     * @public
     * @static
     */
    public static GetRecordingController(policyId: string): Recording | null {
        const components = PolicyComponentsUtils.GetPolicyComponents(policyId);
        if (components) {
            return components.recordingController;
        }
        return null;
    }

    /**
     * Get record controller
     * @param policyId
     * @public
     * @static
     */
    public static GetRunAndRecordController(policyId: string): Recording | Running | null {
        const components = PolicyComponentsUtils.GetPolicyComponents(policyId);
        if (components) {
            return components
                .runAndRecordController;
        }
        return null;
    }

    /**
     * Start recording
     * @param policyId
     * @public
     * @static
     */
    public static async StartRecording(policyId: string): Promise<boolean> {
        const components = PolicyComponentsUtils.GetPolicyComponents(policyId);
        if (!components) {
            return false;
        }
        return await components.startRecording();
    }

    /**
     * Stop recording
     * @param policyId
     * @public
     * @static
     */
    public static async StopRecording(policyId: string): Promise<boolean> {
        const components = PolicyComponentsUtils.GetPolicyComponents(policyId);
        if (!components) {
            return false;
        }
        return await components.stopRecording();
    }

    /**
     * Stop running
     * @param policyId
     * @public
     * @static
     */
    public static async StopRunning(policyId: string): Promise<boolean> {
        const components = PolicyComponentsUtils.GetPolicyComponents(policyId);
        if (!components) {
            return true;
        }
        return await components.stopRunning();
    }

    /**
     * Destroy recording
     * @param policyId
     * @public
     * @static
     */
    public static async DestroyRecording(policyId: string): Promise<boolean> {
        const components = PolicyComponentsUtils.GetPolicyComponents(policyId);
        if (!components) {
            return false;
        }
        return await components.destroyRecording();
    }

    /**
     * Destroy running
     * @param policyId
     * @public
     * @static
     */
    public static async DestroyRunning(policyId: string): Promise<boolean> {
        const components = PolicyComponentsUtils.GetPolicyComponents(policyId);
        if (!components) {
            return true;
        }
        return await components.destroyRunning();
    }

    /**
     * Fast Forward
     * @param policyId
     * @param options
     * @public
     * @static
     */
    public static async FastForward(policyId: string, options: any): Promise<boolean> {
        const components = PolicyComponentsUtils.GetPolicyComponents(policyId);
        if (!components) {
            return false;
        }
        return await components.fastForward(options);
    }

    /**
     * Retry Step
     * @param policyId
     * @param options
     * @public
     * @static
     */
    public static async RetryStep(policyId: string, options: any): Promise<boolean> {
        const components = PolicyComponentsUtils.GetPolicyComponents(policyId);
        if (!components) {
            return false;
        }
        return await components.retryStep(options);
    }

    /**
     * Skip Step
     * @param policyId
     * @param options
     * @public
     * @static
     */
    public static async SkipStep(policyId: string, options: any): Promise<boolean> {
        const components = PolicyComponentsUtils.GetPolicyComponents(policyId);
        if (!components) {
            return false;
        }
        return await components.skipStep(options);
    }

    /**
     * Get recording or running status
     * @param policyId
     * @public
     * @static
     */
    public static GetRecordStatus(policyId: string): any {
        const record = RecordUtils.GetRunAndRecordController(policyId);
        if (record) {
            return record.getStatus();
        } else {
            return { policyId };
        }
    }

    /**
     * Get recorded actions
     * @param policyId
     * @public
     * @static
     */
    public static async GetRecordedActions(policyId: string): Promise<any[] | null> {
        const record = RecordUtils.GetRunAndRecordController(policyId);
        if (record) {
            return await record.getActions();
        } else {
            return null;
        }
    }

    /**
     * Get recorded actions
     * @param policyId
     * @public
     * @static
     */
    public static async GetRecordResults(policyId: string): Promise<any[] | null> {
        const record = RecordUtils.GetRunAndRecordController(policyId);
        if (record) {
            return await record.getResults();
        } else {
            return null;
        }
    }

    /**
     * Record policy
     * @param policyId
     * @param actions
     * @param results
     * @param options
     * @public
     * @static
     */
    public static async RunRecord(
        policyId: string,
        actions: any[],
        results: any[],
        options: any
    ): Promise<string> {
        const components = PolicyComponentsUtils.GetPolicyComponents(policyId);
        if (!components) {
            return null;
        }
        return await components.runRecord(actions, results, options);
    }

    /**
     * Record SelectGroup
     * @param policyId
     * @param user
     * @param uuid
     * @public
     * @static
     */
    public static async RecordSelectGroup(
        policyId: string,
        user: PolicyUser,
        uuid: string
    ): Promise<void> {
        const record = RecordUtils.GetRecordingController(policyId);
        if (record) {
            await record.selectGroup(user, uuid);
        }
    }

    /**
     * Record SetBlockData
     * @param policyId
     * @param user
     * @param block
     * @param data
     * @public
     * @static
     */
    public static async RecordSetBlockData(
        policyId: string,
        user: PolicyUser,
        block: AnyBlockType,
        data: any,
        recordActionId?: string,
        actionTimestemp?: number
    ): Promise<void> {
        const record = RecordUtils.GetRecordingController(policyId);
        if (record) {
            await record.setBlockData(user, block, data, recordActionId, actionTimestemp);
        }
    }

    /**
     * Record ExternalData
     * @param policyId
     * @param data
     * @public
     * @static
     */
    public static async RecordExternalData(
        policyId: string,
        data: any
    ): Promise<void> {
        const record = RecordUtils.GetRecordingController(policyId);
        if (record) {
            await record.externalData(data);
        }
    }

    /**
     * Record CreateUser
     * @param policyId
     * @param did
     * @param data
     * @public
     * @static
     */
    public static async RecordCreateUser(
        policyId: string,
        did: string,
        data: any
    ): Promise<void> {
        const record = RecordUtils.GetRecordingController(policyId);
        if (record) {
            await record.createUser(did, data);
        }
    }

    /**
     * Record SetUser
     * @param policyId
     * @param did
     * @public
     * @static
     */
    public static async RecordSetUser(
        policyId: string,
        did: string,
    ): Promise<void> {
        const record = RecordUtils.GetRecordingController(policyId);
        if (record) {
            await record.setUser(did);
        }
    }
}
