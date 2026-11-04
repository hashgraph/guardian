import { AsyncLocalStorage } from 'node:async_hooks';

interface IPreviewBranch {
    saved: string | null;
    failed: boolean;
}

export class PreviewBranches {
    private readonly storage = new AsyncLocalStorage<IPreviewBranch>();
    private readonly root: IPreviewBranch = { saved: null, failed: false };
    private readonly ends: { branch: IPreviewBranch; saved: string }[] = [];

    public async run<T>(callback: () => T | Promise<T>): Promise<T> {
        const parent = this.storage.getStore() ?? this.root;
        const branch: IPreviewBranch = { saved: parent.saved, failed: false };
        return this.storage.run(branch, async () => {
            try {
                return await callback();
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
        if (branch.saved !== null) {
            this.ends.push({ branch, saved: branch.saved });
        }
    }

    public getFinalIds(): Set<string> {
        return new Set(this.ends.filter(({ branch }) => !branch.failed).map(({ saved }) => saved));
    }
}
