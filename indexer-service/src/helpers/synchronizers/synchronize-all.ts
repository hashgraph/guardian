import { SynchronizationTask } from '../synchronization-task.js';
import { SynchronizationAnalytics } from './synchronize-analytics.js';
import { SynchronizationContracts } from './synchronize-contracts.js';
import { SynchronizationDid } from './synchronize-dids.js';
import { SynchronizationFormulas } from './synchronize-formula.js';
import { SynchronizationLabels } from './synchronize-labels.js';
import { SynchronizationModules } from './synchronize-module.js';
import { SynchronizationPolicy } from './synchronize-policy.js';
import { SynchronizationProjects } from './synchronize-projects.js';
import { SynchronizationRegistries } from './synchronize-registry.js';
import { SynchronizationRoles } from './synchronize-role.js';
import { SynchronizationSchemaPackage } from './synchronize-schema-package.js';
import { SynchronizationSchemas } from './synchronize-schema.js';
import { SynchronizationTools } from './synchronize-tool.js';
import { SynchronizationTopics } from './synchronize-topic.js';
import { SynchronizationVCs } from './synchronize-vcs.js';
import { SynchronizationVPs } from './synchronize-vp.js';

function getMask(mask: string | undefined): string {
    return (mask || '0 * * * *');
}

function getBoolean(flag: string | undefined): boolean {
    return (flag?.toLowerCase() === 'true');
}

export class SynchronizationAll extends SynchronizationTask {
    public readonly name: string = 'all';

    private readonly synchronizationAnalytics: SynchronizationAnalytics;
    private readonly synchronizationProjects: SynchronizationProjects;
    private readonly synchronizationModules: SynchronizationModules;
    private readonly synchronizationRegistries: SynchronizationRegistries;
    private readonly synchronizationRoles: SynchronizationRoles;
    private readonly synchronizationTools: SynchronizationTools;
    private readonly synchronizationTopics: SynchronizationTopics;
    private readonly synchronizationSchemas: SynchronizationSchemas;
    private readonly synchronizationSchemaPackage: SynchronizationSchemaPackage;
    private readonly synchronizationDid: SynchronizationDid;
    private readonly synchronizationVCs: SynchronizationVCs;
    private readonly synchronizationVPs: SynchronizationVPs;
    private readonly synchronizationPolicy: SynchronizationPolicy;
    private readonly synchronizationContracts: SynchronizationContracts;
    private readonly synchronizationLabels: SynchronizationLabels;
    private readonly synchronizationFormulas: SynchronizationFormulas;

    constructor(mask: string) {
        super('all', mask);

        this.synchronizationSchemaPackage = (new SynchronizationSchemaPackage(this.getMask(process.env.SYNC_ANALYTICS_MASK)));
        this.synchronizationAnalytics = (new SynchronizationAnalytics(this.getMask(process.env.SYNC_ANALYTICS_MASK)));
        this.synchronizationProjects = (new SynchronizationProjects(this.getMask(process.env.SYNC_ANALYTICS_MASK)));
        this.synchronizationModules = (new SynchronizationModules(this.getMask(process.env.SYNC_MODULES_MASK)));
        this.synchronizationRegistries = (new SynchronizationRegistries(this.getMask(process.env.SYNC_REGISTRIES_MASK)));
        this.synchronizationRoles = (new SynchronizationRoles(this.getMask(process.env.SYNC_ROLES_MASK)));
        this.synchronizationTools = (new SynchronizationTools(this.getMask(process.env.SYNC_TOOLS_MASK)));
        this.synchronizationTopics = (new SynchronizationTopics(this.getMask(process.env.SYNC_TOPICS_MASK)));
        this.synchronizationSchemas = (new SynchronizationSchemas(this.getMask(process.env.SYNC_SCHEMAS_MASK)));
        this.synchronizationDid = (new SynchronizationDid(this.getMask(process.env.SYNC_DID_DOCUMENTS_MASK)));
        this.synchronizationVCs = (new SynchronizationVCs(this.getMask(process.env.SYNC_VC_DOCUMENTS_MASK)));
        this.synchronizationVPs = (new SynchronizationVPs(this.getMask(process.env.SYNC_VP_DOCUMENTS_MASK)));
        this.synchronizationPolicy = (new SynchronizationPolicy(this.getMask(process.env.SYNC_POLICIES_MASK)));
        this.synchronizationContracts = (new SynchronizationContracts(this.getMask(process.env.SYNC_CONTRACTS_MASK)));
        this.synchronizationLabels = (new SynchronizationLabels(this.getMask(process.env.SYNC_LABELS_MASK)));
        this.synchronizationFormulas = (new SynchronizationFormulas(this.getMask(process.env.SYNC_FORMULAS_MASK)));
    }

    public override async sync(): Promise<void> {
        await this.runTask(this.synchronizationSchemaPackage);
        await this.runTask(this.synchronizationAnalytics);
        await this.runTask(this.synchronizationProjects);
        await this.runTask(this.synchronizationModules);
        await this.runTask(this.synchronizationRegistries);
        await this.runTask(this.synchronizationRoles);
        await this.runTask(this.synchronizationTools);
        await this.runTask(this.synchronizationTopics);
        await this.runTask(this.synchronizationSchemas);
        await this.runTask(this.synchronizationDid);
        await this.runTask(this.synchronizationVCs);
        await this.runTask(this.synchronizationVPs);
        await this.runTask(this.synchronizationPolicy);
        await this.runTask(this.synchronizationContracts);
        await this.runTask(this.synchronizationLabels);
        await this.runTask(this.synchronizationFormulas);
    }

    private async runTask(task: SynchronizationTask) {
        console.log(`${task.taskName} task is started`);
        try {
            console.time(`----- sync ${task.taskName} -----`);
            await task.sync();
            console.timeEnd(`----- sync ${task.taskName} -----`);
        } catch (error) {
            console.log(error);
        }
        console.log(`${task.taskName} task is finished`);
    }

    private getMask(mask: string | undefined): string {
        return (mask || '0 * * * *');
    }

    public static createAllTasks() {
        if (process.env.SYNC_ALL_MASK) {
            SynchronizationAll.createSyncTasks();
        } else {
            SynchronizationAll.createAsyncTasks();
        }
    }

    public static createSyncTasks() {
        (new SynchronizationAll(getMask(process.env.SYNC_ALL_MASK)))
            .start(getBoolean(process.env.START_SYNC_ALL));
    }

    public static createAsyncTasks() {
        (new SynchronizationSchemaPackage(getMask(process.env.SYNC_SCHEMAS_MASK)))
            .start(getBoolean(process.env.START_SYNC_SCHEMAS));

        (new SynchronizationAnalytics(getMask(process.env.SYNC_ANALYTICS_MASK)))
            .start(getBoolean(process.env.START_SYNC_ANALYTICS));

        (new SynchronizationProjects(getMask(process.env.SYNC_ANALYTICS_MASK)))
            .start(getBoolean(process.env.START_SYNC_ANALYTICS));

        (new SynchronizationModules(getMask(process.env.SYNC_MODULES_MASK)))
            .start(getBoolean(process.env.START_SYNC_MODULES));

        (new SynchronizationRegistries(getMask(process.env.SYNC_REGISTRIES_MASK)))
            .start(getBoolean(process.env.START_SYNC_REGISTRIES));

        (new SynchronizationRoles(getMask(process.env.SYNC_ROLES_MASK)))
            .start(getBoolean(process.env.START_SYNC_ROLES));

        (new SynchronizationTools(getMask(process.env.SYNC_TOOLS_MASK)))
            .start(getBoolean(process.env.START_SYNC_TOOLS));

        (new SynchronizationTopics(getMask(process.env.SYNC_TOPICS_MASK)))
            .start(getBoolean(process.env.START_SYNC_TOPICS));

        (new SynchronizationSchemas(getMask(process.env.SYNC_SCHEMAS_MASK)))
            .start(getBoolean(process.env.START_SYNC_SCHEMAS));

        (new SynchronizationDid(getMask(process.env.SYNC_DID_DOCUMENTS_MASK)))
            .start(getBoolean(process.env.START_SYNC_DID_DOCUMENTS));

        (new SynchronizationVCs(getMask(process.env.SYNC_VC_DOCUMENTS_MASK)))
            .start(getBoolean(process.env.START_SYNC_VC_DOCUMENTS));

        (new SynchronizationVPs(getMask(process.env.SYNC_VP_DOCUMENTS_MASK)))
            .start(getBoolean(process.env.START_SYNC_VP_DOCUMENTS));

        (new SynchronizationPolicy(getMask(process.env.SYNC_POLICIES_MASK)))
            .start(getBoolean(process.env.START_SYNC_POLICIES));

        (new SynchronizationContracts(getMask(process.env.SYNC_CONTRACTS_MASK)))
            .start(getBoolean(process.env.START_SYNC_CONTRACTS));

        (new SynchronizationLabels(getMask(process.env.SYNC_LABELS_MASK)))
            .start(getBoolean(process.env.START_SYNC_LABELS));

        (new SynchronizationFormulas(getMask(process.env.SYNC_FORMULAS_MASK)))
            .start(getBoolean(process.env.START_SYNC_FORMULAS));
    }
}