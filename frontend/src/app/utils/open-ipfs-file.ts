import type { IPFSService } from '../services/ipfs.service';
import type { ToastService } from '../services/toast.service';
import { ipfsCid } from './ipfs-file';

export function openIpfsFile(ipfs: IPFSService, toast: ToastService, value: string, dryRun = false): void {
    const tab = window.open('', '_blank');
    if (!tab) {
        toast.warn('Allow pop-ups for this site to open the file.');
        return;
    }
    tab.opener = null;
    tab.document.body.textContent = 'Loading file…';
    const cid = ipfsCid(value);
    const file = dryRun && !cid ? ipfs.getDryRunFile(value) : ipfs.getFileBlob(cid);
    file.subscribe({
        next: (blob) => {
            if (tab.closed) {
                return;
            }
            const objectUrl = URL.createObjectURL(blob);
            tab.location.href = objectUrl;
            setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
        },
        error: () => {
            tab.close();
            toast.error('File not found');
        },
    });
}
