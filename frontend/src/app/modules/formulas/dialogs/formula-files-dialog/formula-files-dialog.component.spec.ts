import { Clipboard } from '@angular/cdk/clipboard';
import { CommonModule } from '@angular/common';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { DialogService, DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { IPFSService } from 'src/app/services/ipfs.service';
import { ToastService } from 'src/app/services/toast.service';
import { CopyButtonComponent } from '../../../common/copy-button/copy-button.component';
import { IPFSLinkComponent } from '../../../common/ipfs-link/ipfs-link.component';
import { FormulasViewDialog } from '../formulas-view-dialog/formulas-view-dialog.component';
import { FormulaFilesDialog } from './formula-files-dialog.component';

for (const dialog of [FormulaFilesDialog, FormulasViewDialog]) {
    describe(`${dialog.name} file actions`, () => {
        const cid = 'bafybeiavprz5ld3ktizv4gsqos3dg7nbexcrhvtswzvoatgmea5ncvr3di';
        const build = (files: { name: string; type: string; url: string }[]) => {
            TestBed.configureTestingModule({
                declarations: [dialog, IPFSLinkComponent, CopyButtonComponent],
                imports: [CommonModule],
                providers: [
                    { provide: DynamicDialogConfig, useValue: { data: { config: { files }, tree: { get: () => [], getFiles: () => files } } } },
                    { provide: DynamicDialogRef, useValue: {} },
                    { provide: DialogService, useValue: {} },
                    { provide: IPFSService, useValue: {} },
                    { provide: ToastService, useValue: {} },
                    { provide: Clipboard, useValue: { copy: () => true } },
                ],
                schemas: [NO_ERRORS_SCHEMA],
            });
            if (dialog === FormulasViewDialog) {
                const fixture = TestBed.createComponent(FormulasViewDialog);
                fixture.componentInstance.activeTab = 'files';
                fixture.detectChanges();
                const root: HTMLElement = fixture.nativeElement;
                return root;
            }
            const fixture = TestBed.createComponent(FormulaFilesDialog);
            fixture.detectChanges();
            const root: HTMLElement = fixture.nativeElement;
            return root;
        };

        it('shows the unchanged URL text and shared actions for each file', () => {
            const urls = [`ipfs://${cid}`, 'https://example.com/doc.pdf'];
            const root = build(urls.map((url) => ({ name: 'Document', type: 'pdf', url })));
            const links = Array.from(root.querySelectorAll<HTMLAnchorElement>('ipfs-link a'));
            expect(links.map((link) => link.textContent?.trim())).toEqual(['Open', 'Open']);
            expect(links.map((link) => link.getAttribute('href'))).toEqual([`https://ipfs.io/ipfs/${cid}`, urls[1]]);
            expect(links.every((link) => link.target === '_blank')).toBeTrue();
            expect(root.textContent).toContain(urls[0]);
            expect(root.textContent).not.toContain('Ipfs://Bafy');
            expect(Array.from(root.querySelectorAll<HTMLButtonElement>('button[aria-label="Copy CID"]')).map((button) => button.disabled)).toEqual([false, true]);
        });

        if (dialog === FormulasViewDialog) {
            it('keeps a long URL inside its field and exposes the full address on hover', () => {
                const url = `https://example.com/${'long-document-path/'.repeat(50)}document.pdf`;
                const root = build([{ name: 'Long URL', type: 'pdf', url }]);
                root.style.display = 'block';
                root.style.width = '360px';
                const box = root.querySelector<HTMLElement>('.file-link')!;
                box.style.width = '240px';
                const text = box.querySelector<HTMLElement>('.file-url')!;
                const style = getComputedStyle(text);
                expect(text.textContent).toBe(url);
                expect(text.title).toBe(url);
                expect(style.whiteSpace).toBe('nowrap');
                expect(style.overflow).toBe('hidden');
                expect(style.textOverflow).toBe('ellipsis');
                expect(text.scrollWidth).toBeGreaterThan(text.clientWidth);
                expect(text.getBoundingClientRect().height).toBeLessThanOrEqual(box.clientHeight);
            });
        }

        it('keeps the empty-files message', () => {
            const root = build([]);
            expect(root.textContent).toContain('There were no files attached');
            expect(root.querySelector('ipfs-link')).toBeNull();
        });
    });
}
