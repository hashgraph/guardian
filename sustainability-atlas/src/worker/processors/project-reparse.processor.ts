import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_NAMES } from '@shared/config/bullmq.config';
import { ProjectMapperService } from '../services/project-mapper.service';

export interface ProjectReparseJobData {
    messageConsensusTimestamp: string;
}

@Processor(QUEUE_NAMES.PROJECT_REPARSE)
export class ProjectReparseProcessor extends WorkerHost {
    private readonly logger = new Logger(ProjectReparseProcessor.name);

    constructor(private readonly projectMapperService: ProjectMapperService) {
        super();
    }

    async process(job: Job<ProjectReparseJobData>): Promise<void> {
        const { messageConsensusTimestamp } = job.data;
        await this.projectMapperService.upsertProjectFromVc(messageConsensusTimestamp);
    }

    @OnWorkerEvent('failed')
    onFailed(job: Job<ProjectReparseJobData>, error: Error): void {
        this.logger.error(
            `Project reparse job ${job.id} failed for vc=${job.data.messageConsensusTimestamp}: ${error.message}`,
            error.stack,
        );
    }
}
