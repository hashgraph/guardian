import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { By } from '@angular/platform-browser';
import { RichTextEditorComponent } from './rich-text-editor.component';

describe('RichTextEditorComponent', () => {
    let component: RichTextEditorComponent;
    let fixture: ComponentFixture<RichTextEditorComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [RichTextEditorComponent],
            imports: [FormsModule, ReactiveFormsModule],
        }).compileComponents();

        fixture = TestBed.createComponent(RichTextEditorComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should render toolbar buttons when not readonly', () => {
        component.readonly = false;
        component.isDisabled = false;
        fixture.detectChanges();
        const toolbar = fixture.debugElement.query(By.css('.rte-toolbar'));
        expect(toolbar).toBeTruthy();
    });

    it('should hide toolbar in readonly mode', () => {
        fixture.componentRef.setInput('readonly', true);
        fixture.detectChanges();
        const toolbar = fixture.debugElement.query(By.css('.rte-toolbar'));
        expect(toolbar).toBeNull();
    });

    it('should implement ControlValueAccessor: writeValue sets editor content', () => {
        component.writeValue('<b>Hello</b>');
        fixture.detectChanges();
        const editor = fixture.debugElement.query(By.css('.rte-editor'));
        expect(editor.nativeElement.innerHTML).toBe('<b>Hello</b>');
    });

    it('should treat null writeValue as empty string', () => {
        component.writeValue(null as any);
        fixture.detectChanges();
        expect((component as any)._value).toBe('');
    });

    it('should call onChange when onInput is triggered', () => {
        const changeSpy = jasmine.createSpy('onChange');
        component.registerOnChange(changeSpy);
        const editor = fixture.debugElement.query(By.css('.rte-editor'));
        editor.nativeElement.innerHTML = '<b>Test</b>';
        editor.nativeElement.dispatchEvent(new Event('input'));
        expect(changeSpy).toHaveBeenCalledWith('<b>Test</b>');
    });

    it('should call onTouched when editor blurs', () => {
        const touchedSpy = jasmine.createSpy('onTouched');
        component.registerOnTouched(touchedSpy);
        const editor = fixture.debugElement.query(By.css('.rte-editor'));
        editor.nativeElement.dispatchEvent(new Event('blur'));
        expect(touchedSpy).toHaveBeenCalled();
    });

    it('should report isEmpty=true for blank content', () => {
        component.writeValue('');
        expect(component.isEmpty).toBeTrue();
    });

    it('should report isEmpty=true for whitespace-only HTML', () => {
        component.writeValue('<p>   </p>');
        expect(component.isEmpty).toBeTrue();
    });

    it('should report isEmpty=false for content with text', () => {
        component.writeValue('<p>Hello</p>');
        expect(component.isEmpty).toBeFalse();
    });

    it('setDisabledState should update isDisabled flag', () => {
        component.setDisabledState(true);
        expect(component.isDisabled).toBeTrue();
        component.setDisabledState(false);
        expect(component.isDisabled).toBeFalse();
    });

    it('should show link dialog when link command is executed', () => {
        component.readonly = false;
        fixture.detectChanges();
        const event = new MouseEvent('mousedown');
        spyOn(event, 'preventDefault');
        component.execCommand('link', event);
        expect(component.showLinkDialog).toBeTrue();
    });

    it('should populate the link dialog when the caret is inside a link', () => {
        const editor = fixture.debugElement.query(By.css('.rte-editor')).nativeElement;
        editor.innerHTML = '<a href="https://example.com">Example</a>';
        selectContents(editor.querySelector('a'));
        component.execCommand('link', new MouseEvent('mousedown'));
        expect(component.isEditingLink).toBeTrue();
        expect(component.linkUrl).toBe('https://example.com');
    });

    it('should position the link dialog below the link when the editor has room', () => {
        const editor = fixture.debugElement.query(By.css('.rte-editor')).nativeElement;
        editor.innerHTML = '<a href="https://example.com">Example</a>';
        const link = editor.querySelector('a');
        const wrapper = editor.parentElement;
        spyOn(wrapper, 'getBoundingClientRect').and.returnValue(new DOMRect(20, 10, 500, 300));
        spyOn(link, 'getBoundingClientRect').and.returnValue(new DOMRect(50, 40, 80, 20));
        selectContents(link);

        component.execCommand('link', new MouseEvent('mousedown'));

        expect(component.linkDialogPosition).toEqual({ left: 30, top: 58 });
    });

    it('should render a titled link dialog with separate actions', () => {
        component.execCommand('link', new MouseEvent('mousedown'));
        fixture.detectChanges();

        expect(fixture.debugElement.query(By.css('.rte-link-dialog-title')).nativeElement.textContent.trim())
            .toBe('Insert link');
        expect(fixture.debugElement.query(By.css('.rte-link-submit')).nativeElement.textContent.trim())
            .toBe('Insert');
    });

    it('should close link dialog on cancelLink()', () => {
        component.showLinkDialog = true;
        component.linkUrl = 'https://example.com';
        component.cancelLink();
        expect(component.showLinkDialog).toBeFalse();
        expect(component.linkUrl).toBe('');
    });

    it('should not insert link when URL is empty', () => {
        component.showLinkDialog = true;
        component.linkUrl = '';
        component.insertLink();
        expect(component.showLinkDialog).toBeFalse();
    });

    it('should prepend https:// when URL lacks protocol', () => {
        const execSpy = spyOn(document, 'execCommand');
        component.showLinkDialog = true;
        component.linkUrl = 'example.com';
        component.insertLink();
        expect(execSpy).toHaveBeenCalledWith('createLink', false, 'https://example.com');
    });

    it('should make a newly created link open in a new tab', () => {
        const editor = fixture.debugElement.query(By.css('.rte-editor')).nativeElement;
        editor.textContent = 'Example';
        selectContents(editor);
        spyOn(document, 'execCommand').and.callFake(() => {
            const link = document.createElement('a');
            link.textContent = 'Example';
            editor.replaceChildren(link);
            selectContents(link);
            return true;
        });
        component.linkUrl = 'example.com';
        component.insertLink();
        const link = editor.querySelector('a');
        expect(link.getAttribute('href')).toBe('https://example.com');
        expect(link.getAttribute('target')).toBe('_blank');
        expect(link.getAttribute('rel')).toBe('noopener noreferrer');
    });

    it('should update the link containing the caret', () => {
        const editor = fixture.debugElement.query(By.css('.rte-editor')).nativeElement;
        editor.innerHTML = '<a href="https://old.example">Example</a>';
        const link = editor.querySelector('a');
        selectContents(link);
        component.execCommand('link', new MouseEvent('mousedown'));
        component.linkUrl = 'new.example';
        component.insertLink();
        expect(link.getAttribute('href')).toBe('https://new.example');
        expect(link.getAttribute('target')).toBe('_blank');
        expect(link.getAttribute('rel')).toBe('noopener noreferrer');
    });

    it('should remove the link containing the caret without removing its text', () => {
        const editor = fixture.debugElement.query(By.css('.rte-editor')).nativeElement;
        editor.innerHTML = '<a href="https://example.com">Example</a>';
        selectContents(editor.querySelector('a'));
        component.execCommand('link', new MouseEvent('mousedown'));
        component.removeLink();
        expect(editor.innerHTML).toBe('Example');
        expect(component.showLinkDialog).toBeFalse();
    });

    it('should open a link in a new tab on ctrl-click', () => {
        const editor = fixture.debugElement.query(By.css('.rte-editor')).nativeElement;
        editor.innerHTML = '<a href="https://example.com">Example</a>';
        const openSpy = spyOn(window, 'open');
        const event = new MouseEvent('click', { bubbles: true, cancelable: true, ctrlKey: true });
        editor.querySelector('a').dispatchEvent(event);
        expect(openSpy).toHaveBeenCalledWith(
            'https://example.com',
            '_blank',
            'noopener,noreferrer'
        );
        expect(event.defaultPrevented).toBeTrue();
    });

    it('should open a link in a new tab on a normal click when readonly', () => {
        fixture.componentRef.setInput('readonly', true);
        fixture.detectChanges();
        const editor = fixture.debugElement.query(By.css('.rte-editor')).nativeElement;
        editor.innerHTML = '<a href="https://example.com">Example</a>';
        const openSpy = spyOn(window, 'open');
        const event = new MouseEvent('click', { bubbles: true, cancelable: true });
        editor.querySelector('a').dispatchEvent(event);
        expect(openSpy).toHaveBeenCalledWith(
            'https://example.com',
            '_blank',
            'noopener,noreferrer'
        );
        expect(event.defaultPrevented).toBeTrue();
    });

    it('should not prepend https:// when URL already has protocol', () => {
        const execSpy = spyOn(document, 'execCommand');
        component.showLinkDialog = true;
        component.linkUrl = 'https://example.com';
        component.insertLink();
        expect(execSpy).toHaveBeenCalledWith('createLink', false, 'https://example.com');
    });

    it('should have all required toolbar actions', () => {
        const commands = component.toolbarItems
            .filter(t => !t.separator)
            .map(t => t.command);
        expect(commands).toContain('bold');
        expect(commands).toContain('italic');
        expect(commands).toContain('underline');
        expect(commands).toContain('insertUnorderedList');
        expect(commands).toContain('insertOrderedList');
        expect(commands).toContain('h1');
        expect(commands).toContain('h2');
        expect(commands).toContain('h3');
        expect(commands).toContain('link');
    });

    it('should show visible labels for bold, italic and underline', () => {
        const labels = fixture.debugElement.queryAll(By.css('.rte-label'))
            .map(item => item.nativeElement.textContent.trim());
        expect(labels).toEqual(['B', 'I', 'U', 'H1', 'H2', 'H3']);
    });

    it('should apply a heading to a plain block', () => {
        spyOn(document, 'queryCommandValue').and.returnValue('p');
        const execSpy = spyOn(document, 'execCommand');
        component.execCommand('h1', new MouseEvent('mousedown'));
        expect(execSpy).toHaveBeenCalledWith('formatBlock', false, 'h1');
    });

    it('should turn the active heading back into a paragraph', () => {
        spyOn(document, 'queryCommandValue').and.returnValue('h1');
        const execSpy = spyOn(document, 'execCommand');
        component.execCommand('h1', new MouseEvent('mousedown'));
        expect(execSpy).toHaveBeenCalledWith('formatBlock', false, 'p');
    });

    it('should replace the active heading with a different heading', () => {
        spyOn(document, 'queryCommandValue').and.returnValue('h1');
        const execSpy = spyOn(document, 'execCommand');
        component.execCommand('h2', new MouseEvent('mousedown'));
        expect(execSpy).toHaveBeenCalledWith('formatBlock', false, 'h2');
    });

    it('should compare the active heading case-insensitively', () => {
        spyOn(document, 'queryCommandValue').and.returnValue('H1');
        const execSpy = spyOn(document, 'execCommand');
        component.execCommand('h1', new MouseEvent('mousedown'));
        expect(execSpy).toHaveBeenCalledWith('formatBlock', false, 'p');
    });

    it('should apply the heading when the active block cannot be read', () => {
        spyOn(document, 'queryCommandValue').and.throwError('not supported');
        const execSpy = spyOn(document, 'execCommand');
        component.execCommand('h3', new MouseEvent('mousedown'));
        expect(execSpy).toHaveBeenCalledWith('formatBlock', false, 'h3');
    });

    it('should not format a heading when the caret is inside a list item', () => {
        const editor = fixture.debugElement.query(By.css('.rte-editor')).nativeElement;
        editor.innerHTML = '<ul><li>one</li></ul>';
        selectContents(editor.querySelector('li'));
        const execSpy = spyOn(document, 'execCommand');
        component.execCommand('h1', new MouseEvent('mousedown'));
        expect(execSpy).not.toHaveBeenCalled();
    });

    it('should still format a heading outside a list', () => {
        const editor = fixture.debugElement.query(By.css('.rte-editor')).nativeElement;
        editor.innerHTML = '<p>one</p><ul><li>two</li></ul>';
        selectContents(editor.querySelector('p'));
        spyOn(document, 'queryCommandValue').and.returnValue('p');
        const execSpy = spyOn(document, 'execCommand');
        component.execCommand('h1', new MouseEvent('mousedown'));
        expect(execSpy).toHaveBeenCalledWith('formatBlock', false, 'h1');
    });

    it('should disable only the heading buttons while the caret is in a list item', () => {
        const editor = fixture.debugElement.query(By.css('.rte-editor')).nativeElement;
        editor.innerHTML = '<ul><li>one</li></ul>';
        selectContents(editor.querySelector('li'));
        document.dispatchEvent(new Event('selectionchange'));
        fixture.detectChanges();

        const buttons = fixture.debugElement.queryAll(By.css('.rte-btn'))
            .map(item => item.nativeElement as HTMLButtonElement);
        const disabled = buttons.filter(item => item.disabled).map(item => item.title);

        expect(component.headingDisabled).toBeTrue();
        expect(disabled.length).toBe(3);
        expect(disabled.every(title => title === 'Headings are not available inside a list')).toBeTrue();
    });

    it('should enable the heading buttons again outside a list item', () => {
        const editor = fixture.debugElement.query(By.css('.rte-editor')).nativeElement;
        editor.innerHTML = '<ul><li>one</li></ul><p>two</p>';
        selectContents(editor.querySelector('li'));
        document.dispatchEvent(new Event('selectionchange'));
        fixture.detectChanges();
        expect(component.headingDisabled).toBeTrue();

        selectContents(editor.querySelector('p'));
        document.dispatchEvent(new Event('selectionchange'));
        fixture.detectChanges();

        expect(component.headingDisabled).toBeFalse();
        expect(fixture.debugElement.queryAll(By.css('.rte-btn'))
            .filter(item => item.nativeElement.disabled).length).toBe(0);
    });

    it('should refuse a link with an unsupported protocol', () => {
        const execSpy = spyOn(document, 'execCommand');
        component.showLinkDialog = true;
        component.linkUrl = 'javascript:alert(1)';
        component.insertLink();
        expect(execSpy).not.toHaveBeenCalled();
        expect(component.showLinkDialog).toBeFalse();
    });

    it('should keep a mailto link as typed', () => {
        const execSpy = spyOn(document, 'execCommand');
        component.showLinkDialog = true;
        component.linkUrl = 'mailto:user@example.com';
        component.insertLink();
        expect(execSpy).toHaveBeenCalledWith('createLink', false, 'mailto:user@example.com');
    });

    it('should report an empty control value for visually empty markup', () => {
        const changeSpy = jasmine.createSpy('onChange');
        component.registerOnChange(changeSpy);
        const editor = fixture.debugElement.query(By.css('.rte-editor'));
        editor.nativeElement.innerHTML = '<p><br></p>';
        editor.nativeElement.dispatchEvent(new Event('input'));
        expect(changeSpy).toHaveBeenCalledWith('');
        expect(component.isEmpty).toBeTrue();
    });

    it('should insert sanitized markup on paste', () => {
        const execSpy = spyOn(document, 'execCommand');
        const event = new Event('paste') as any;
        event.clipboardData = {
            getData: (type: string) =>
                type === 'text/html' ? '<b>Bold</b><img src="x" onerror="steal()">' : ''
        };
        spyOn(event, 'preventDefault');
        component.onPaste(event);
        expect(event.preventDefault).toHaveBeenCalled();
        expect(execSpy).toHaveBeenCalledWith('insertHTML', false, '<b>Bold</b>');
    });

    it('should escape plain text pasted without markup', () => {
        const execSpy = spyOn(document, 'execCommand');
        const event = new Event('paste') as any;
        event.clipboardData = {
            getData: (type: string) => (type === 'text/html' ? '' : '5 < 6 & 7')
        };
        component.onPaste(event);
        expect(execSpy).toHaveBeenCalledWith('insertHTML', false, '5 &lt; 6 &amp; 7');
    });

    it('should not change the value when a paste carries no text', () => {
        const execSpy = spyOn(document, 'execCommand');
        const changes: string[] = [];
        component.registerOnChange((value: string) => changes.push(value));
        const event = new Event('paste') as any;
        event.clipboardData = { getData: () => '' };
        spyOn(event, 'preventDefault');
        component.onPaste(event);
        expect(event.preventDefault).toHaveBeenCalled();
        expect(execSpy).not.toHaveBeenCalled();
        expect(changes).toEqual([]);
    });

    function dropEvent(html: string, text: string): any {
        const event = new Event('drop') as any;
        event.clientX = 0;
        event.clientY = 0;
        event.dataTransfer = {
            getData: (type: string) => (type === 'text/html' ? html : text)
        };
        return event;
    }

    it('should sanitize markup dropped into the editor', () => {
        const execSpy = spyOn(document, 'execCommand');
        const event = dropEvent(
            '<table><tr><td><b>Bold</b></td></tr></table><img src="x"><p style="color:red">Red</p>',
            ''
        );
        spyOn(event, 'preventDefault');
        component.onDrop(event);
        expect(event.preventDefault).toHaveBeenCalled();
        expect(execSpy).toHaveBeenCalledWith('insertHTML', false, '<b>Bold</b><p>Red</p>');
    });

    it('should escape plain text dropped without markup', () => {
        const execSpy = spyOn(document, 'execCommand');
        component.onDrop(dropEvent('', '5 < 6 & 7'));
        expect(execSpy).toHaveBeenCalledWith('insertHTML', false, '5 &lt; 6 &amp; 7');
    });

    it('should ignore a drop when readonly', () => {
        const execSpy = spyOn(document, 'execCommand');
        fixture.componentRef.setInput('readonly', true);
        fixture.detectChanges();
        const event = dropEvent('<b>Bold</b>', '');
        spyOn(event, 'preventDefault');
        component.onDrop(event);
        expect(event.preventDefault).not.toHaveBeenCalled();
        expect(execSpy).not.toHaveBeenCalled();
    });

    it('should accept the editor as a drop target only when editable', () => {
        const first = new Event('dragover') as any;
        spyOn(first, 'preventDefault');
        component.onDragOver(first);
        expect(first.preventDefault).toHaveBeenCalled();

        fixture.componentRef.setInput('readonly', true);
        fixture.detectChanges();
        const second = new Event('dragover') as any;
        spyOn(second, 'preventDefault');
        component.onDragOver(second);
        expect(second.preventDefault).not.toHaveBeenCalled();
    });

    it('should let the browser move text dragged inside the editor', () => {
        const execSpy = spyOn(document, 'execCommand');
        component.onDragStart();

        const over = new Event('dragover') as any;
        spyOn(over, 'preventDefault');
        component.onDragOver(over);
        expect(over.preventDefault).not.toHaveBeenCalled();

        const drop = dropEvent('<b>Bold</b>', '');
        spyOn(drop, 'preventDefault');
        component.onDrop(drop);
        expect(drop.preventDefault).not.toHaveBeenCalled();
        expect(execSpy).not.toHaveBeenCalled();
    });

    it('should filter an external drop again once the internal drag has ended', () => {
        const execSpy = spyOn(document, 'execCommand');
        component.onDragStart();
        component.onDragEnd();
        component.onDrop(dropEvent('<b>Bold</b><img src="x">', ''));
        expect(execSpy).toHaveBeenCalledWith('insertHTML', false, '<b>Bold</b>');
    });

    it('should not change the value when a drop carries no text', () => {
        const execSpy = spyOn(document, 'execCommand');
        const changes: string[] = [];
        component.registerOnChange((value: string) => changes.push(value));
        const event = dropEvent('', '');
        spyOn(event, 'preventDefault');
        component.onDrop(event);
        expect(event.preventDefault).toHaveBeenCalled();
        expect(execSpy).not.toHaveBeenCalled();
        expect(changes).toEqual([]);
    });

    it('should focus the URL field when the link dialog opens', () => {
        spyOn(document, 'execCommand');
        const event = new MouseEvent('mousedown');
        component.execCommand('link', event);
        const input = fixture.debugElement.query(By.css('.rte-link-input'));
        expect(input).toBeTruthy();
        expect(document.activeElement).toBe(input.nativeElement);
    });

    function selectContents(element: Element): void {
        const range = document.createRange();
        range.selectNodeContents(element);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
    }
});
