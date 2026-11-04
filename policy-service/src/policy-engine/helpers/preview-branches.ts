import { AsyncLocalStorage } from 'node:async_hooks';

interface IPreviewBranch {
    saved: string | null;
    failed: boolean;
    ended: boolean;
    next: boolean;
    display: boolean;
}

export class PreviewBranches {
    private readonly storage = new AsyncLocalStorage<IPreviewBranch>();
    private readonly root: IPreviewBranch = { saved: null, failed: false, ended: false, next: false, display: false };
    private readonly ends: { branch: IPreviewBranch; saved: string }[] = [];

    public async run<T>(
        callback: () => T | Promise<T>,
        step: boolean = false,
        display: boolean = false,
        error: boolean = false
    ): Promise<T> {
        const parent = this.storage.getStore() ?? this.root;
        if (step) {
            parent.next = true;
        }
        const branch: IPreviewBranch = {
            saved: error ? null : parent.saved,
            failed: false,
            ended: false,
            next: false,
            display: parent.display || display
        };
        return this.storage.run(branch, async () => {
            try {
                const result = await callback();
                if (step && !branch.next && !branch.ended) {
                    this.finish();
                }
                return result;
            } catch (error) {
                branch.failed = true;
                throw error;
            }
        });
    }

    public save(id: string): void {
        const branch = this.storage.getStore() ?? this.root;
        branch.saved = id;
    }

    public fail(): void {
        const branch = this.storage.getStore() ?? this.root;
        branch.failed = true;
    }

    public finish(): void {
        const branch = this.storage.getStore() ?? this.root;
        branch.ended = true;
        if (branch.saved !== null && !branch.display) {
            this.ends.push({ branch, saved: branch.saved });
        }
    }

    public getFinalIds(): Set<string> {
        return new Set(this.ends.filter(({ branch }) => !branch.failed).map(({ saved }) => saved));
    }
}
