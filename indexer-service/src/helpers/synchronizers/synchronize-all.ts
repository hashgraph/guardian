import { SynchronizationTask } from '../synchronization-task.js';
import { SynchronizationAnalytics } from './synchronize-analytics.js';
import { SynchronizationContracts } from './synchronize-contracts.js';
import { SynchronizationDid } from './synchronize-dids.js';
import { SynchronizationModules } from './synchronize-module.js';
import { SynchronizationPolicy } from './synchronize-policy.js';
import { SynchronizationProjects } from './synchronize-projects.js';
import { SynchronizationRegistries } from './synchronize-registry.js';
import { SynchronizationRoles } from './synchronize-role.js';
import { SynchronizationSchemas } from './synchronize-schema.js';
import { SynchronizationTools } from './synchronize-tool.js';
import { SynchronizationTopics } from './synchronize-topic.js';
import { SynchronizationVCs } from './synchronize-vcs.js';
import { SynchronizationVPs } from './synchronize-vp.js';

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
    private readonly synchronizationDid: SynchronizationDid;
    private readonly synchronizationVCs: SynchronizationVCs;
    private readonly synchronizationVPs: SynchronizationVPs;
    private readonly synchronizationPolicy: SynchronizationPolicy;
    private readonly synchronizationContracts: SynchronizationContracts;

    constructor(mask: string) {
        super('all', mask);

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
    }

    public override async sync(): Promise<void> {
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
}