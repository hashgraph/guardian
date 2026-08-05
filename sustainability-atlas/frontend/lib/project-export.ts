import type { Project } from '~/types/models';

export type ExportFormat = 'iwa' | 'cadtrust' | 'cdop';

const FORMAT_LABELS: Record<ExportFormat, string> = {
    iwa: 'iwa-dmrv',
    cadtrust: 'cadtrust-v2',
    cdop: 'cdop',
};

function slugify(name: string): string {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 60);
}

function downloadJson(data: Record<string, any>, filename: string): void {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

export async function exportProject(project: Project, format: ExportFormat, network: string): Promise<void> {
    const config = useRuntimeConfig();
    const baseURL = config.public.apiBaseUrl as string;
    const id = project.sourceTimestamp ?? project.id;

    const data = await $fetch<Record<string, any>>(
        `/api/v1/${network}/projects/${id}/export/${format}`,
        { baseURL },
    );

    const slug = slugify(project.name || 'project');
    downloadJson(data, `${slug}-${FORMAT_LABELS[format]}.json`);
}
