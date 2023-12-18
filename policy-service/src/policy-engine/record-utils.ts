import { Recording } from './record/recording';
import { Running } from './record';
import { PolicyComponentsUtils } from './policy-components-utils';
import { IPolicyUser } from './policy-user';
import { AnyBlockType } from './policy-engine.interface';

/**
 * Record utils
 */
export class RecordUtils {

    /**
     * Get record controller
     * @param policyId
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
     */
    public static async StopRunning(policyId: string): Promise<boolean> {
        const components = PolicyComponentsUtils.GetPolicyComponents(policyId);
        if (!components) {
            return false;
        }
        return await components.stopRunning();
    }

    /**
     * Fast Forward
     * @param policyId
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
     */
    public static async RetryStep(policyId: string, options: any): Promise<any[]> {
        const components = PolicyComponentsUtils.GetPolicyComponents(policyId);
        if (!components) {
            return null;
        }
        return await components.retryStep(options);
    }

    /**
     * Skip Step
     * @param policyId
     */
    public static async SkipStep(policyId: string, options: any): Promise<any[]> {
        const components = PolicyComponentsUtils.GetPolicyComponents(policyId);
        if (!components) {
            return null;
        }
        return await components.skipStep(options);
    }

    /**
     * Get recording or running status
     * @param policyId
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
     * @param data
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
     * @param data
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
     * @param options
     */
    public static async RunRecord(
        policyId: string,
        actions: any[],
        results: any[],
        options: any
    ): Promise<boolean> {
        const components = PolicyComponentsUtils.GetPolicyComponents(policyId);
        if (!components) {
            return false;
        }
        return await components.runRecord(actions, results, options);
    }

    /**
     * Record SelectGroup
     * @param policyId
     * @param user
     * @param uuid
     */
    public static async RecordSelectGroup(
        policyId: string,
        user: IPolicyUser,
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
     * @param uuid
     */
    public static async RecordSetBlockData(
        policyId: string,
        user: IPolicyUser,
        block: AnyBlockType,
        data: any
    ): Promise<void> {
        const record = RecordUtils.GetRecordingController(policyId);
        if (record) {
            await record.setBlockData(user, block, data);
        }
    }

    /**
     * Record ExternalData
     * @param policyId
     * @param data
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
     * @param data
     * @param data
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