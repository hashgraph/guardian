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
        component.writeValue('**Hello**');
        fixture.detectChanges();
        const editor = fixture.debugElement.query(By.css('.rte-editor'));
        expect(editor.nativeElement.innerHTML).toBe('<p><b>Hello</b></p>');
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
        expect(changeSpy).toHaveBeenCalledWith('**Test**');
    });

    it('should clear an emptied block after a deletion', () => {
        const changeSpy = jasmine.createSpy('onChange');
        component.registerOnChange(changeSpy);
        const editor = fixture.debugElement.query(By.css('.rte-editor'));
        editor.nativeElement.innerHTML = '<h1><br></h1>';
        editor.nativeElement.dispatchEvent(new InputEvent('input', { inputType: 'deleteContentBackward' }));
        expect(editor.nativeElement.innerHTML).toBe('');
        expect(changeSpy).toHaveBeenCalledWith('');
    });

    it('should clear an emptied block after a cut', () => {
        const editor = fixture.debugElement.query(By.css('.rte-editor'));
        editor.nativeElement.innerHTML = '<ul><li><br></li></ul>';
        editor.nativeElement.dispatchEvent(new InputEvent('input', { inputType: 'deleteByCut' }));
        expect(editor.nativeElement.innerHTML).toBe('');
    });

    it('should place the caret inside the editor after clearing', () => {
        const editor = fixture.debugElement.query(By.css('.rte-editor'));
        editor.nativeElement.innerHTML = '<h1><br></h1>';
        editor.nativeElement.dispatchEvent(new InputEvent('input', { inputType: 'deleteContentBackward' }));
        const selection = window.getSelection();
        expect(selection?.anchorNode).toBe(editor.nativeElement);
    });

    it('should keep an empty block when the input event is not a deletion', () => {
        const editor = fixture.debugElement.query(By.css('.rte-editor'));
        editor.nativeElement.innerHTML = '<h1><br></h1>';
        editor.nativeElement.dispatchEvent(new InputEvent('input', { inputType: 'insertParagraph' }));
        expect(editor.nativeElement.innerHTML).toBe('<h1><br></h1>');
    });

    it('should keep an empty block when onInput is called without an event', () => {
        const editor = fixture.debugElement.query(By.css('.rte-editor'));
        editor.nativeElement.innerHTML = '<h2><br></h2>';
        component.onInput();
        expect(editor.nativeElement.innerHTML).toBe('<h2><br></h2>');
    });

    it('should leave the content alone when a deletion leaves text behind', () => {
        const changeSpy = jasmine.createSpy('onChange');
        component.registerOnChange(changeSpy);
        const editor = fixture.debugElement.query(By.css('.rte-editor'));
        editor.nativeElement.innerHTML = '<h1>Kept</h1>';
        editor.nativeElement.dispatchEvent(new InputEvent('input', { inputType: 'deleteContentBackward' }));
        expect(editor.nativeElement.innerHTML).toBe('<h1>Kept</h1>');
        expect(changeSpy).toHaveBeenCalledWith('# Kept');
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

    it('should render the stored markdown as html in the editor', () => {
        component.writeValue('# Title\n\n- one\n- two');
        fixture.detectChanges();

        const editor = fixture.debugElement.query(By.css('.rte-editor')).nativeElement;
        expect(editor.innerHTML).toBe('<h1>Title</h1><ul><li>one</li><li>two</li></ul>');
    });

    it('should report markdown through onChange', () => {
        const editor = fixture.debugElement.query(By.css('.rte-editor')).nativeElement;
        const onChange = jasmine.createSpy('onChange');
        component.registerOnChange(onChange);

        editor.innerHTML = '<h1>Title</h1><p>a <b>bold</b> line</p>';
        component.onInput();

        expect(onChange).toHaveBeenCalledWith('# Title\n\na **bold** line');
    });

    it('should never report html through onChange', () => {
        const editor = fixture.debugElement.query(By.css('.rte-editor')).nativeElement;
        const onChange = jasmine.createSpy('onChange');
        component.registerOnChange(onChange);

        editor.innerHTML = '<p>text</p>';
        component.onInput();

        expect(onChange).toHaveBeenCalledWith('text');
    });

    it('should report an empty value for visually empty markup', () => {
        const editor = fixture.debugElement.query(By.css('.rte-editor')).nativeElement;
        const onChange = jasmine.createSpy('onChange');
        component.registerOnChange(onChange);

        editor.innerHTML = '<p><br></p>';
        component.onInput();

        expect(onChange).toHaveBeenCalledWith('');
    });

    it('should not offer an underline button', () => {
        const titles = fixture.debugElement
            .queryAll(By.css('.rte-btn'))
            .map((item) => item.nativeElement.getAttribute('title'));

        expect(titles).not.toContain('Underline (Ctrl+U)');
        expect(titles).toContain('Bold (Ctrl+B)');
    });

    it('should close the link dialog on a mousedown outside the editor', () => {
        spyOn(document, 'execCommand');
        component.execCommand('link', new MouseEvent('mousedown'));
        component.linkUrl = 'https://example.com';
        fixture.detectChanges();
        expect(component.showLinkDialog).toBeTrue();

        const outside = document.createElement('button');
        document.body.appendChild(outside);
        outside.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
        fixture.detectChanges();

        expect(component.showLinkDialog).toBeFalse();
        expect(component.linkUrl).toBe('');
        expect(fixture.debugElement.query(By.css('.rte-link-input'))).toBeNull();
        outside.remove();
    });

    it('should keep the link dialog open on a mousedown inside the editor', () => {
        spyOn(document, 'execCommand');
        component.execCommand('link', new MouseEvent('mousedown'));
        component.linkUrl = 'https://example.com';
        fixture.detectChanges();

        const input = fixture.debugElement.query(By.css('.rte-link-input')).nativeElement;
        input.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
        fixture.detectChanges();

        expect(component.showLinkDialog).toBeTrue();
        expect(component.linkUrl).toBe('https://example.com');
    });

    it('should ignore a mousedown outside while the link dialog is closed', () => {
        const outside = document.createElement('button');
        document.body.appendChild(outside);
        outside.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
        fixture.detectChanges();

        expect(component.showLinkDialog).toBeFalse();
        outside.remove();
    });

    it('should remove the link when its URL is cleared and the dialog is submitted', () => {
        const editor = fixture.debugElement.query(By.css('.rte-editor')).nativeElement;
        editor.innerHTML = '<a href="https://example.com">Example</a>';
        selectContents(editor.querySelector('a'));
        component.execCommand('link', new MouseEvent('mousedown'));
        component.linkUrl = '';
        component.insertLink();
        expect(editor.innerHTML).toBe('Example');
        expect(component.showLinkDialog).toBeFalse();
    });

    it('should remove the link when its URL is left as whitespace', () => {
        const editor = fixture.debugElement.query(By.css('.rte-editor')).nativeElement;
        editor.innerHTML = '<a href="https://example.com">Example</a>';
        selectContents(editor.querySelector('a'));
        component.execCommand('link', new MouseEvent('mousedown'));
        component.linkUrl = '   ';
        component.insertLink();
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
        expect(commands).not.toContain('underline');
        expect(commands).toContain('insertUnorderedList');
        expect(commands).toContain('insertOrderedList');
        expect(commands).toContain('h1');
        expect(commands).toContain('h2');
        expect(commands).toContain('h3');
        expect(commands).toContain('link');
    });

    it('should show visible labels for bold and italic', () => {
        const labels = fixture.debugElement.queryAll(By.css('.rte-label'))
            .map(item => item.nativeElement.textContent.trim());
        expect(labels).toEqual(['B', 'I', 'H1', 'H2', 'H3']);
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
        const disabled = buttons.filter(item => item.disabled).map(item => item.title)
            .filter(title => !title.startsWith('Nothing to'));

        expect(component.headingDisabled).toBeTrue();
        expect(disabled.filter(title => title === 'Headings are not available inside a list').length)
            .toBe(3);
        expect(disabled.filter(title => title === 'This item is already at the top level').length)
            .toBe(1);
        expect(disabled.length).toBe(4);
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
            .filter(item => item.nativeElement.disabled)
            .map(item => item.nativeElement.title)
            .filter((title: string) => !title.startsWith('Nothing to')))
            .toEqual([
                'List levels are only available inside a list',
                'List levels are only available inside a list'
            ]);
    });

    it('should disable the decrease-level arrow on a top-level list item', () => {
        const editor = fixture.debugElement.query(By.css('.rte-editor')).nativeElement;
        editor.innerHTML = '<ul><li>one</li></ul>';
        selectContents(editor.querySelector('li'));
        document.dispatchEvent(new Event('selectionchange'));
        fixture.detectChanges();

        expect(component.listOutdentDisabled).toBeTrue();
        expect(component.isCommandDisabled('outdent')).toBeTrue();
        expect(component.isCommandDisabled('indent')).toBeFalse();
        expect(component.commandTitle('outdent', 'Decrease list level'))
            .toBe('This item is already at the top level');
    });

    it('should enable the decrease-level arrow on a nested list item', () => {
        const editor = fixture.debugElement.query(By.css('.rte-editor')).nativeElement;
        editor.innerHTML = '<ul><li>one<ul><li>two</li></ul></li></ul>';
        selectContents(editor.querySelectorAll('li')[1]);
        document.dispatchEvent(new Event('selectionchange'));
        fixture.detectChanges();

        expect(component.listOutdentDisabled).toBeFalse();
        expect(component.isCommandDisabled('outdent')).toBeFalse();
        expect(component.commandTitle('outdent', 'Decrease list level')).toBe('Decrease list level');
    });

    it('should not run outdent on a top-level list item', () => {
        const editor = fixture.debugElement.query(By.css('.rte-editor')).nativeElement;
        editor.innerHTML = '<ul><li>one</li></ul>';
        selectContents(editor.querySelector('li'));
        const execSpy = spyOn(document, 'execCommand').and.returnValue(true);

        component.execCommand('outdent', new MouseEvent('mousedown'));

        expect(execSpy).not.toHaveBeenCalled();
        expect(editor.querySelector('ul')).toBeTruthy();
    });

    it('should leave a nested list in one press of the list button', () => {
        const editor = fixture.debugElement.query(By.css('.rte-editor')).nativeElement;
        editor.innerHTML = '<ul><li>one<ul><li>two<ul><li>three</li></ul></li></ul></li></ul>';
        const deepest = editor.querySelectorAll('li')[2];
        selectContents(deepest);
        const execSpy = spyOn(document, 'execCommand').and.returnValue(true);

        component.execCommand('insertUnorderedList', new MouseEvent('mousedown'));

        expect(execSpy.calls.allArgs().filter(args => args[0] === 'insertUnorderedList').length)
            .toBe(3);
    });

    it('should make a list from a paragraph in one call', () => {
        const editor = fixture.debugElement.query(By.css('.rte-editor')).nativeElement;
        editor.innerHTML = '<p>one</p>';
        selectContents(editor.querySelector('p'));
        const execSpy = spyOn(document, 'execCommand').and.returnValue(true);

        component.execCommand('insertUnorderedList', new MouseEvent('mousedown'));

        expect(execSpy.calls.allArgs().filter(args => args[0] === 'insertUnorderedList').length)
            .toBe(1);
    });

    it('should convert a nested bullet list to a numbered one in one call', () => {
        const editor = fixture.debugElement.query(By.css('.rte-editor')).nativeElement;
        editor.innerHTML = '<ul><li>one<ul><li>two</li></ul></li></ul>';
        selectContents(editor.querySelectorAll('li')[1]);
        const execSpy = spyOn(document, 'execCommand').and.returnValue(true);

        component.execCommand('insertOrderedList', new MouseEvent('mousedown'));

        expect(execSpy.calls.allArgs().filter(args => args[0] === 'insertOrderedList').length)
            .toBe(1);
    });

    it('should leave undo and redo enabled while the field is not focused', () => {
        const editor = fixture.debugElement.query(By.css('.rte-editor')).nativeElement;
        editor.blur();
        document.dispatchEvent(new Event('selectionchange'));
        fixture.detectChanges();

        expect(component.undoDisabled).toBeFalse();
        expect(component.redoDisabled).toBeFalse();
        expect(component.isCommandDisabled('undo')).toBeFalse();
    });

    it('should disable undo and redo when the browser has nothing in its history', () => {
        const editor = fixture.debugElement.query(By.css('.rte-editor')).nativeElement;
        editor.focus();
        spyOn(document, 'queryCommandEnabled').and.returnValue(false);

        document.dispatchEvent(new Event('selectionchange'));
        fixture.detectChanges();

        expect(component.undoDisabled).toBeTrue();
        expect(component.redoDisabled).toBeTrue();
        expect(component.commandTitle('undo', 'Undo (Ctrl+Z)')).toBe('Nothing to undo');
        expect(component.commandTitle('redo', 'Redo (Ctrl+Shift+Z)')).toBe('Nothing to redo');
    });

    it('should keep undo enabled while a wiped value can still be restored', () => {
        const editor = fixture.debugElement.query(By.css('.rte-editor')).nativeElement;
        editor.focus();
        editor.innerHTML = '<h1>text</h1>';
        editor.dispatchEvent(new InputEvent('beforeinput', { inputType: 'deleteContentBackward' }));
        editor.innerHTML = '<h1><br></h1>';
        editor.dispatchEvent(new InputEvent('input', { inputType: 'deleteContentBackward' }));
        spyOn(document, 'queryCommandEnabled').and.returnValue(false);

        document.dispatchEvent(new Event('selectionchange'));
        fixture.detectChanges();

        expect(component.undoDisabled).toBeFalse();
        expect(component.redoDisabled).toBeTrue();
    });

    it('should enable both while the browser reports history', () => {
        const editor = fixture.debugElement.query(By.css('.rte-editor')).nativeElement;
        editor.focus();
        spyOn(document, 'queryCommandEnabled').and.returnValue(true);

        document.dispatchEvent(new Event('selectionchange'));
        fixture.detectChanges();

        expect(component.undoDisabled).toBeFalse();
        expect(component.redoDisabled).toBeFalse();
    });

    it('should merge a list the browser split when changing a list level', () => {
        const editor = fixture.debugElement.query(By.css('.rte-editor')).nativeElement;
        editor.innerHTML = '<ul><li>one</li></ul><ul><li>two</li><li>three</li></ul>';
        selectContents(editor.querySelector('li'));
        spyOn(document, 'execCommand').and.returnValue(true);

        component.execCommand('indent', new MouseEvent('mousedown'));

        expect(editor.querySelectorAll('ul').length).toBe(1);
        expect(Array.from(editor.querySelectorAll('li')).map((item: any) => item.textContent))
            .toEqual(['one', 'two', 'three']);
    });

    it('should merge split numbered lists so the numbering keeps running', () => {
        const editor = fixture.debugElement.query(By.css('.rte-editor')).nativeElement;
        editor.innerHTML = '<ol><li>one</li></ol><ol><li>two</li></ol>';
        selectContents(editor.querySelector('li'));
        spyOn(document, 'execCommand').and.returnValue(true);

        component.execCommand('indent', new MouseEvent('mousedown'));

        expect(editor.querySelectorAll('ol').length).toBe(1);
    });

    it('should not merge a bullet list into a numbered one', () => {
        const editor = fixture.debugElement.query(By.css('.rte-editor')).nativeElement;
        editor.innerHTML = '<ul><li>one</li></ul><ol><li>two</li></ol>';
        selectContents(editor.querySelector('li'));
        spyOn(document, 'execCommand').and.returnValue(true);

        component.execCommand('indent', new MouseEvent('mousedown'));

        expect(editor.querySelectorAll('ul').length).toBe(1);
        expect(editor.querySelectorAll('ol').length).toBe(1);
    });

    it('should offer undo, redo and the two list level buttons', () => {
        const commands = component.toolbarItems.map((item: any) => item.command);

        expect(commands).toContain('undo');
        expect(commands).toContain('redo');
        expect(commands).toContain('outdent');
        expect(commands).toContain('indent');
    });

    it('should pass undo and redo straight to the browser', () => {
        const execSpy = spyOn(document, 'execCommand');

        component.execCommand('undo', new MouseEvent('mousedown'));
        component.execCommand('redo', new MouseEvent('mousedown'));

        expect(execSpy).toHaveBeenCalledWith('undo', false, undefined);
        expect(execSpy).toHaveBeenCalledWith('redo', false, undefined);
    });

    it('should change the list level while the caret is inside a list item', () => {
        const editor = fixture.debugElement.query(By.css('.rte-editor')).nativeElement;
        editor.innerHTML = '<ul><li>one<ul><li>two</li></ul></li></ul>';
        selectContents(editor.querySelectorAll('li')[1]);
        document.dispatchEvent(new Event('selectionchange'));
        fixture.detectChanges();
        const execSpy = spyOn(document, 'execCommand');

        component.execCommand('indent', new MouseEvent('mousedown'));
        component.execCommand('outdent', new MouseEvent('mousedown'));

        expect(component.listLevelDisabled).toBeFalse();
        expect(component.isCommandDisabled('indent')).toBeFalse();
        expect(component.isCommandDisabled('outdent')).toBeFalse();
        expect(execSpy).toHaveBeenCalledWith('indent', false, undefined);
        expect(execSpy).toHaveBeenCalledWith('outdent', false, undefined);
    });

    it('should refuse to change the list level outside a list item', () => {
        const editor = fixture.debugElement.query(By.css('.rte-editor')).nativeElement;
        editor.innerHTML = '<p>one</p>';
        selectContents(editor.querySelector('p'));
        document.dispatchEvent(new Event('selectionchange'));
        fixture.detectChanges();
        const execSpy = spyOn(document, 'execCommand');

        component.execCommand('indent', new MouseEvent('mousedown'));
        component.execCommand('outdent', new MouseEvent('mousedown'));

        expect(component.listLevelDisabled).toBeTrue();
        expect(execSpy).not.toHaveBeenCalled();
    });

    it('should restore the text when undo follows a deletion that emptied the field', () => {
        const editor = fixture.debugElement.query(By.css('.rte-editor')).nativeElement;
        const emitted: string[] = [];
        component.registerOnChange((value: string) => { emitted.push(value); });

        editor.innerHTML = '<p>one</p>';
        component.onBeforeInput();
        editor.innerHTML = '<p><br></p>';
        component.onInput(new InputEvent('input', { inputType: 'deleteContentBackward' }));
        expect(editor.innerHTML).toBe('');
        expect(emitted[emitted.length - 1]).toBe('');

        const execSpy = spyOn(document, 'execCommand');
        component.execCommand('undo', new MouseEvent('mousedown'));

        expect(editor.innerHTML).toBe('<p>one</p>');
        expect(emitted[emitted.length - 1]).toBe('one');
        expect(execSpy).not.toHaveBeenCalled();
    });

    it('should hand undo back to the browser once a later edit has happened', () => {
        const editor = fixture.debugElement.query(By.css('.rte-editor')).nativeElement;

        editor.innerHTML = '<p>one</p>';
        component.onBeforeInput();
        editor.innerHTML = '<p><br></p>';
        component.onInput(new InputEvent('input', { inputType: 'deleteContentBackward' }));

        editor.innerHTML = '<p>two</p>';
        component.onInput(new InputEvent('input', { inputType: 'insertText' }));

        const execSpy = spyOn(document, 'execCommand');
        component.execCommand('undo', new MouseEvent('mousedown'));

        expect(execSpy).toHaveBeenCalledWith('undo', false, undefined);
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

    it('should keep the line breaks of plain text pasted without markup', () => {
        const execSpy = spyOn(document, 'execCommand');
        const event = new Event('paste') as any;
        event.clipboardData = {
            getData: (type: string) => (type === 'text/html' ? '' : 'one\ntwo\r\nthree\rfour')
        };
        component.onPaste(event);
        expect(execSpy).toHaveBeenCalledWith('insertHTML', false, 'one<br>two<br>three<br>four');
    });

    it('should still escape each line of a multi-line plain text paste', () => {
        const execSpy = spyOn(document, 'execCommand');
        const event = new Event('paste') as any;
        event.clipboardData = {
            getData: (type: string) => (type === 'text/html' ? '' : '5 < 6\n<b>not bold</b>')
        };
        component.onPaste(event);
        expect(execSpy)
            .toHaveBeenCalledWith('insertHTML', false, '5 &lt; 6<br>&lt;b&gt;not bold&lt;/b&gt;');
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
        expect(execSpy).toHaveBeenCalledWith(
            'insertHTML',
            false,
            '<table><tbody><tr><td><b>Bold</b></td></tr></tbody></table><p>Red</p>'
        );
    });

    it('should escape plain text dropped without markup', () => {
        const execSpy = spyOn(document, 'execCommand');
        component.onDrop(dropEvent('', '5 < 6 & 7'));
        expect(execSpy).toHaveBeenCalledWith('insertHTML', false, '5 &lt; 6 &amp; 7');
    });

    it('should keep the line breaks of plain text dropped without markup', () => {
        const execSpy = spyOn(document, 'execCommand');
        component.onDrop(dropEvent('', 'one\ntwo'));
        expect(execSpy).toHaveBeenCalledWith('insertHTML', false, 'one<br>two');
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

    it('should close an open link dialog when a new value is written', () => {
        spyOn(document, 'execCommand');
        component.execCommand('link', new MouseEvent('mousedown'));
        component.linkUrl = 'https://example.com';
        expect(component.showLinkDialog).toBeTrue();

        component.writeValue('<p>Another preset</p>');
        fixture.detectChanges();

        expect(component.showLinkDialog).toBeFalse();
        expect(component.linkUrl).toBe('');
        expect(component.isEditingLink).toBeFalse();
        expect(fixture.debugElement.query(By.css('.rte-link-input'))).toBeNull();
    });

    it('should leave a closed link dialog closed when a value is written', () => {
        component.writeValue('Text');
        fixture.detectChanges();

        expect(component.showLinkDialog).toBeFalse();
        expect(fixture.debugElement.query(By.css('.rte-editor')).nativeElement.innerHTML)
            .toBe('<p>Text</p>');
    });

    function selectContents(element: Element): void {
        const range = document.createRange();
        range.selectNodeContents(element);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
    }

    describe('toolbar active state', () => {

        function selectInsideEditor(html: string, selector?: string): void {
            const editor: HTMLElement = component.editorRef.nativeElement;
            editor.innerHTML = html;
            const target = selector ? editor.querySelector(selector)! : editor.firstChild!;
            const range = document.createRange();
            range.selectNodeContents(target);
            const selection = window.getSelection()!;
            selection.removeAllRanges();
            selection.addRange(range);
        }

        function refresh(): void {
            document.dispatchEvent(new Event('selectionchange'));
            fixture.detectChanges();
        }

        it('should mark a command the browser reports as on', () => {
            spyOn(document, 'queryCommandState').and.callFake((c: string) => c === 'bold');
            selectInsideEditor('<p>text</p>');
            refresh();
            expect(component.isCommandActive('bold')).toBeTrue();
            expect(component.isCommandActive('italic')).toBeFalse();
        });

        it('should mark only the heading level the caret is in', () => {
            spyOn(document, 'queryCommandState').and.returnValue(false);
            spyOn(document, 'queryCommandValue').and.returnValue('h2');
            selectInsideEditor('<h2>title</h2>');
            refresh();
            expect(component.isCommandActive('h2')).toBeTrue();
            expect(component.isCommandActive('h1')).toBeFalse();
            expect(component.isCommandActive('h3')).toBeFalse();
        });

        it('should mark the link button only when the caret is inside a link', () => {
            spyOn(document, 'queryCommandState').and.returnValue(false);
            selectInsideEditor('<p><a href="https://example.com">link</a></p>', 'a');
            refresh();
            expect(component.isCommandActive('link')).toBeTrue();

            selectInsideEditor('<p>plain</p>');
            refresh();
            expect(component.isCommandActive('link')).toBeFalse();
        });

        it('should mark nothing when the caret is outside the editor', () => {
            spyOn(document, 'queryCommandState').and.returnValue(true);
            const outside = document.createElement('p');
            outside.textContent = 'elsewhere';
            document.body.appendChild(outside);
            const range = document.createRange();
            range.selectNodeContents(outside);
            const selection = window.getSelection()!;
            selection.removeAllRanges();
            selection.addRange(range);
            refresh();
            expect(component.activeCommands.size).toBe(0);
            outside.remove();
        });

        it('should not replace the set when nothing changed', () => {
            spyOn(document, 'queryCommandState').and.callFake((c: string) => c === 'bold');
            selectInsideEditor('<p>text</p>');
            refresh();
            const first = component.activeCommands;
            refresh();
            expect(component.activeCommands).toBe(first);
        });

        it('should survive a browser that throws on queryCommandState', () => {
            spyOn(document, 'queryCommandState').and.throwError('not supported');
            selectInsideEditor('<p>text</p>');
            expect(() => refresh()).not.toThrow();
            expect(component.activeCommands.has('bold')).toBeFalse();
        });

        it('should never report a disabled heading button as active', () => {
            spyOn(document, 'queryCommandState').and.returnValue(false);
            spyOn(document, 'queryCommandValue').and.returnValue('h2');
            selectInsideEditor('<ul><li>item</li></ul>', 'li');
            refresh();
            expect(component.headingDisabled).toBeTrue();
            expect(component.isCommandActive('h2')).toBeFalse();
        });

        it('should put the state on the button as a class and aria-pressed', () => {
            spyOn(document, 'queryCommandState').and.callFake((c: string) => c === 'bold');
            selectInsideEditor('<p>text</p>');
            refresh();
            const bold = fixture.debugElement.queryAll(By.css('.rte-btn'))
                .find(b => b.nativeElement.getAttribute('title')?.startsWith('Bold'))!;
            expect(bold.nativeElement.classList).toContain('rte-btn--active');
            expect(bold.nativeElement.getAttribute('aria-pressed')).toBe('true');
        });
    });

    describe('underline is not pasted into a Rich Text field', () => {

        function pasteHtml(html: string): void {
            const event: any = new Event('paste');
            event.clipboardData = { getData: (type: string) => (type === 'text/html' ? html : '') };
            event.preventDefault = () => {};
            component.onPaste(event);
        }

        it('should drop the underline and keep its text', () => {
            const inserted: string[] = [];
            spyOn(document, 'execCommand').and.callFake((command: string, _ui?: boolean, value?: string) => {
                if (command === 'insertHTML') { inserted.push(value || ''); }
                return true;
            });

            pasteHtml('<p>a <u>b</u> c</p>');

            expect(inserted.length).toBe(1);
            expect(inserted[0]).toBe('<p>a b c</p>');
        });

        it('should keep bold, italic, headings and lists', () => {
            const inserted: string[] = [];
            spyOn(document, 'execCommand').and.callFake((command: string, _ui?: boolean, value?: string) => {
                if (command === 'insertHTML') { inserted.push(value || ''); }
                return true;
            });

            pasteHtml('<h2>Title</h2><ul><li><b>One</b> and <i>two</i></li></ul>');

            expect(inserted[0]).toBe('<h2>Title</h2><ul><li><b>One</b> and <i>two</i></li></ul>');
        });
    });
    describe('images', () => {
        const reference = 'ipfs://bafkreiabcdef123456';

        function pngFile(name = 'photo.png', type = 'image/png'): File {
            return new File([new Uint8Array([1, 2, 3, 4])], name, { type });
        }

        function selectFile(file: File): Promise<void> {
            const input = document.createElement('input');
            input.type = 'file';
            const transfer = new DataTransfer();
            transfer.items.add(file);
            input.files = transfer.files;
            return component.onImageSelected({ target: input } as any);
        }

        function flush(): Promise<void> {
            return new Promise<void>(resolve => setTimeout(resolve, 0));
        }

        function imageButton(): any {
            return fixture.debugElement
                .queryAll(By.css('.rte-btn'))
                .find(button => button.nativeElement.querySelector('.pi-image'));
        }

        it('should not show the image button without an uploader', () => {
            fixture.detectChanges();
            expect(imageButton()).toBeUndefined();
        });

        it('should show the image button once an uploader is bound', () => {
            fixture.componentRef.setInput('imageUploader', async () => reference);
            fixture.detectChanges();
            expect(imageButton()).toBeTruthy();
        });

        it('should refuse a file that is not png, jpeg or webp', async () => {
            const uploader = jasmine.createSpy('uploader').and.resolveTo(reference);
            component.imageUploader = uploader;

            await selectFile(pngFile('notes.pdf', 'application/pdf'));

            expect(uploader).not.toHaveBeenCalled();
            expect(component.imageError).toContain('notes.pdf');
            expect(component.imageError).toContain('PNG, JPEG or WebP');
        });

        it('should refuse a file whose content is not an image even when its name says png', async () => {
            const uploader = jasmine.createSpy('uploader').and.resolveTo(reference);
            component.imageUploader = uploader;
            const pdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]);

            await selectFile(new File([pdfBytes], 'report.png', { type: 'image/png' }));

            expect(uploader).not.toHaveBeenCalled();
            expect(component.imageError).toContain('report.png');
            expect(component.imageError).toContain('PNG, JPEG or WebP');
            expect(component.imageLoading).toBeFalse();
        });

        it('should still prepare a real picture', async () => {
            const encoded = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
            const binary = atob(encoded);
            const bytes = new Uint8Array(binary.length);
            for (let index = 0; index < binary.length; index++) {
                bytes[index] = binary.charCodeAt(index);
            }

            const prepared = await (component as any)._prepareImage(
                new File([bytes], 'dot.png', { type: 'image/png' })
            );

            expect(prepared).toBeTruthy();
            expect(prepared.size).toBeGreaterThan(0);
        });

        it('should refuse a file still over the limit and report both sizes', async () => {
            const uploader = jasmine.createSpy('uploader').and.resolveTo(reference);
            component.imageUploader = uploader;
            spyOn<any>(component, '_prepareImage').and.resolveTo(
                new File([new Uint8Array(900 * 1024)], 'photo.png', { type: 'image/png' })
            );

            await selectFile(pngFile());

            expect(uploader).not.toHaveBeenCalled();
            expect(component.imageError).toContain('photo.png');
            expect(component.imageError).toContain('900 KB');
            expect(component.imageError).toContain('512 KB');
        });

        function pressOn(element: Element): void {
            element.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
            fixture.detectChanges();
        }

        async function showError(): Promise<void> {
            fixture.componentRef.setInput('imageUploader', async () => reference);
            fixture.detectChanges();
            await selectFile(pngFile('notes.pdf', 'application/pdf'));
            fixture.detectChanges();
        }

        it('should clear the message when the text area is clicked', async () => {
            await showError();

            pressOn(component.editorRef.nativeElement);

            expect(component.imageError).toBe('');
            expect(fixture.debugElement.query(By.css('.rte-image-error'))).toBeNull();
        });

        it('should clear the message when the field is clicked beside the text area', async () => {
            await showError();

            pressOn(fixture.debugElement.query(By.css('.rte-toolbar')).nativeElement);

            expect(component.imageError).toBe('');
        });

        it('should keep the message when the message itself is clicked', async () => {
            await showError();

            pressOn(fixture.debugElement.query(By.css('.rte-image-error')).nativeElement);

            expect(component.imageError).toContain('notes.pdf');
        });

        it('should clear the message from a click anywhere outside the field', async () => {
            await showError();

            pressOn(document.body);

            expect(component.imageError).toBe('');
        });

        it('should clear the message when the image button is pressed again', () => {
            component.imageUploader = async () => reference;
            component.imageError = 'something went wrong';
            fixture.detectChanges();

            component.execCommand('image', new MouseEvent('mousedown'));

            expect(component.imageError).toBe('');
        });

        it('should insert an img with both attributes and emit a value holding only the reference', async () => {
            let emitted = '';
            component.registerOnChange(value => { emitted = value; });
            component.imageUploader = async () => reference;
            spyOn<any>(component, '_prepareImage').and.callFake((file: File) => Promise.resolve(file));
            spyOn<any>(component, '_readAsDataUrl').and.resolveTo('data:image/webp;base64,AAAA');
            spyOn(document, 'execCommand').and.callFake((command: string, _ui?: boolean, value?: string) => {
                if (command === 'insertHTML') {
                    component.editorRef.nativeElement.innerHTML = value || '';
                }
                return true;
            });

            await selectFile(pngFile());

            const image = component.editorRef.nativeElement.querySelector('img');
            expect(image?.getAttribute('data-src')).toBe(reference);
            expect(image?.getAttribute('src')).toBe('data:image/webp;base64,AAAA');
            expect(emitted).toContain(reference);
            expect(emitted).not.toContain('base64');
        });

        it('should report a failed upload and leave the value alone', async () => {
            let emitted: string | null = null;
            component.registerOnChange(value => { emitted = value; });
            component.imageUploader = () => Promise.reject(new Error('gone'));
            spyOn<any>(component, '_prepareImage').and.callFake((file: File) => Promise.resolve(file));

            await selectFile(pngFile());

            expect(component.imageError).toContain('could not be uploaded');
            expect(emitted).toBeNull();
        });

        it('should disable the image button while an upload is in flight', () => {
            component.imageLoading = true;
            expect(component.isCommandDisabled('image')).toBeTrue();
            component.imageLoading = false;
            expect(component.isCommandDisabled('image')).toBeFalse();
        });

        it('should resolve a stored reference once and fill src', async () => {
            const resolver = jasmine.createSpy('resolver').and.resolveTo('data:image/webp;base64,BBBB');
            component.imageResolver = resolver;

            component.writeValue(`![One](${reference})\n\n![Two](${reference})`);
            await flush();

            expect(resolver).toHaveBeenCalledTimes(1);
            const images = component.editorRef.nativeElement.querySelectorAll('img');
            expect(images.length).toBe(2);
            expect(images[0].getAttribute('src')).toBe('data:image/webp;base64,BBBB');
            expect(images[1].getAttribute('src')).toBe('data:image/webp;base64,BBBB');
        });

        it('should leave src empty and emit nothing when resolving fails', async () => {
            let emitted: string | null = null;
            component.registerOnChange(value => { emitted = value; });
            component.imageResolver = () => Promise.reject(new Error('gone'));

            component.writeValue(`![One](${reference})`);
            await flush();

            const image = component.editorRef.nativeElement.querySelector('img');
            expect(image?.getAttribute('src')).toBe('');
            expect(emitted).toBeNull();
        });
    });

    describe('pasted and dropped images', () => {
        const reference = 'ipfs://bafkreiabcdef123456';

        function imageFile(name = 'screenshot.png', type = 'image/png'): File {
            return new File([new Uint8Array([1, 2, 3, 4])], name, { type });
        }

        function fileList(...files: File[]): FileList {
            const transfer = new DataTransfer();
            for (const file of files) {
                transfer.items.add(file);
            }
            return transfer.files;
        }

        function pasteEvent(files: FileList | null, html = '', text = ''): any {
            return {
                preventDefault: () => {},
                clipboardData: {
                    files,
                    getData: (type: string) => (type === 'text/html' ? html : text)
                }
            };
        }

        function dropEvent(files: FileList | null, html = '', text = ''): any {
            return {
                preventDefault: () => {},
                clientX: 0,
                clientY: 0,
                dataTransfer: {
                    files,
                    getData: (type: string) => (type === 'text/html' ? html : text)
                }
            };
        }

        function flush(): Promise<void> {
            return new Promise<void>(resolve => setTimeout(resolve, 0));
        }

        function captureInsertedHtml(): void {
            spyOn(document, 'execCommand').and.callFake((command: string, _ui?: boolean, value?: string) => {
                if (command === 'insertHTML') {
                    component.editorRef.nativeElement.innerHTML += value || '';
                }
                return true;
            });
        }

        function bindWorkingUploader(): jasmine.Spy {
            const uploader = jasmine.createSpy('uploader').and.resolveTo(reference);
            component.imageUploader = uploader;
            spyOn<any>(component, '_prepareImage').and.callFake((file: File) => Promise.resolve(file));
            spyOn<any>(component, '_readAsDataUrl').and.resolveTo('data:image/webp;base64,AAAA');
            return uploader;
        }

        it('should upload and insert a pasted image file', async () => {
            let emitted = '';
            component.registerOnChange(value => { emitted = value; });
            const uploader = bindWorkingUploader();
            captureInsertedHtml();

            component.onPaste(pasteEvent(fileList(imageFile())));
            await flush();

            expect(uploader).toHaveBeenCalled();
            const image = component.editorRef.nativeElement.querySelector('img');
            expect(image?.getAttribute('data-src')).toBe(reference);
            expect(emitted).toContain(reference);
            expect(emitted).not.toContain('base64');
        });

        it('should keep the pasted text and the image when the clipboard holds both', async () => {
            const uploader = bindWorkingUploader();
            captureInsertedHtml();

            component.onPaste(pasteEvent(fileList(imageFile()), '<p>Wrapper <b>text</b></p>'));
            await flush();

            expect(uploader).toHaveBeenCalled();
            const editor = component.editorRef.nativeElement;
            expect(editor.querySelectorAll('img').length).toBe(1);
            expect(editor.textContent).toContain('Wrapper');
            expect(editor.querySelector('b')?.textContent).toBe('text');
        });

        it('should add no empty block when the clipboard markup holds only the image', async () => {
            const uploader = bindWorkingUploader();
            captureInsertedHtml();

            component.onPaste(pasteEvent(fileList(imageFile()), '<p><img src="https://foreign-host/pic.png"></p>'));
            await flush();

            expect(uploader).toHaveBeenCalled();
            const editor = component.editorRef.nativeElement;
            expect(editor.querySelectorAll('img').length).toBe(1);
            expect(editor.querySelectorAll('p').length).toBe(0);
        });

        it('should still drop an image referenced by pasted markup', async () => {
            const uploader = bindWorkingUploader();
            captureInsertedHtml();

            component.onPaste(pasteEvent(fileList(), '<p>Photo <img src="https://foreign-host/pic.png"></p>'));
            await flush();

            expect(uploader).not.toHaveBeenCalled();
            const editor = component.editorRef.nativeElement;
            expect(editor.querySelector('img')).toBeNull();
            expect(editor.textContent).toContain('Photo');
        });

        it('should keep pasting plain text unchanged', async () => {
            const uploader = bindWorkingUploader();
            captureInsertedHtml();

            component.onPaste(pasteEvent(fileList(), '', 'just text'));
            await flush();

            expect(uploader).not.toHaveBeenCalled();
            expect(component.editorRef.nativeElement.textContent).toContain('just text');
        });

        it('should upload and insert a dropped image file', async () => {
            const uploader = bindWorkingUploader();
            captureInsertedHtml();

            component.onDrop(dropEvent(fileList(imageFile())));
            await flush();

            expect(uploader).toHaveBeenCalled();
            expect(component.editorRef.nativeElement.querySelector('img')).toBeTruthy();
        });

        it('should insert nothing on a dropped image when no uploader is bound', async () => {
            let emitted: string | null = null;
            component.registerOnChange(value => { emitted = value; });
            captureInsertedHtml();

            component.onDrop(dropEvent(fileList(imageFile())));
            await flush();

            expect(component.editorRef.nativeElement.querySelector('img')).toBeNull();
            expect(emitted).toBeNull();
        });

        it('should refuse a pasted image type it cannot handle and keep the pasted text', async () => {
            const uploader = bindWorkingUploader();
            captureInsertedHtml();

            component.onPaste(pasteEvent(fileList(imageFile('animation.gif', 'image/gif')), '<p>Wrapper</p>'));
            await flush();

            expect(uploader).not.toHaveBeenCalled();
            expect(component.imageError).toContain('animation.gif');
            const editor = component.editorRef.nativeElement;
            expect(editor.querySelector('img')).toBeNull();
            expect(editor.textContent).toContain('Wrapper');
        });

        it('should report a failed upload of a pasted image and leave the value alone', async () => {
            let emitted: string | null = null;
            component.registerOnChange(value => { emitted = value; });
            component.imageUploader = () => Promise.reject(new Error('gone'));
            spyOn<any>(component, '_prepareImage').and.callFake((file: File) => Promise.resolve(file));
            captureInsertedHtml();

            component.onPaste(pasteEvent(fileList(imageFile())));
            await flush();

            expect(component.imageError).toContain('could not be uploaded');
            expect(component.imageLoading).toBeFalse();
            expect(emitted).toBeNull();
        });
    });
    describe('tables', () => {
        const TABLE = '<table><thead><tr><th>H1</th><th>H2</th></tr></thead>'
            + '<tbody><tr><td>a</td><td>b</td></tr><tr><td>c</td><td>d</td></tr></tbody></table>';

        function editor(): HTMLElement {
            return fixture.debugElement.query(By.css('.rte-editor')).nativeElement;
        }

        function caretIn(selector: string, index = 0): HTMLElement {
            const cell = editor().querySelectorAll(selector)[index] as HTMLElement;
            selectContents(cell);
            document.dispatchEvent(new Event('selectionchange'));
            fixture.detectChanges();
            return cell;
        }

        function rowTexts(): string[][] {
            return Array.from(editor().querySelectorAll('tr')).map(row =>
                Array.from(row.children).map(cell => cell.tagName + ':' + (cell.textContent || '').trim()));
        }

        it('should offer the five table commands', () => {
            const commands = component.toolbarItems.map((item: any) => item.command);
            const tableCommands = component.tableToolbarItems.map((item: any) => item.command);

            expect(commands).toContain('table');
            expect(commands).not.toContain('tableRowAdd');
            expect(tableCommands).toEqual([
                'tableRowAdd', 'tableRowRemove', 'tableColumnAdd', 'tableColumnRemove'
            ]);
        });

        function tableToolbar(): any {
            return fixture.debugElement.query(By.css('.rte-table-toolbar'));
        }

        function caretInto(element: Element | null): void {
            selectContents(element as Element);
            document.dispatchEvent(new Event('selectionchange'));
            fixture.detectChanges();
        }

        it('should show the table toolbar only while the caret is inside a table', () => {
            const editor = fixture.debugElement.query(By.css('.rte-editor')).nativeElement;
            editor.innerHTML = '<table><tbody><tr><td>one</td></tr></tbody></table><p>after</p>';

            caretInto(editor.querySelector('td'));

            expect(component.showTableToolbar).toBeTrue();
            expect(tableToolbar()).toBeTruthy();
            expect(tableToolbar().queryAll(By.css('.rte-btn')).length).toBe(4);

            caretInto(editor.querySelector('p'));

            expect(component.showTableToolbar).toBeFalse();
            expect(tableToolbar()).toBeNull();
        });

        it('should keep every button in the table toolbar enabled and named', () => {
            const editor = fixture.debugElement.query(By.css('.rte-editor')).nativeElement;
            editor.innerHTML = '<table><tbody><tr><td>one</td></tr></tbody></table>';

            caretInto(editor.querySelector('td'));

            const buttons = tableToolbar().queryAll(By.css('.rte-btn'))
                .map((item: any) => item.nativeElement as HTMLButtonElement);

            expect(buttons.every((item: HTMLButtonElement) => !item.disabled)).toBeTrue();
            expect(buttons.map((item: HTMLButtonElement) => item.title)).toEqual([
                'Add a row below',
                'Remove this row',
                'Add a column to the right',
                'Remove this column'
            ]);
        });

        it('should place the table toolbar above the table when there is room', () => {
            const editor = fixture.debugElement.query(By.css('.rte-editor')).nativeElement;
            editor.innerHTML = '<table><tbody><tr><td>one</td></tr></tbody></table>';
            const table = editor.querySelector('table');
            const wrapper = editor.parentElement;
            spyOn(wrapper, 'getBoundingClientRect').and.returnValue(new DOMRect(20, 10, 500, 300));
            spyOn(table, 'getBoundingClientRect').and.returnValue(new DOMRect(60, 120, 300, 80));

            caretInto(editor.querySelector('td'));

            expect(component.tableToolbarPosition).toEqual({ left: 40, top: 72 });
        });

        it('should place the table toolbar below the table when the table is at the top', () => {
            const editor = fixture.debugElement.query(By.css('.rte-editor')).nativeElement;
            editor.innerHTML = '<table><tbody><tr><td>one</td></tr></tbody></table>';
            const table = editor.querySelector('table');
            const wrapper = editor.parentElement;
            spyOn(wrapper, 'getBoundingClientRect').and.returnValue(new DOMRect(20, 10, 500, 300));
            spyOn(table, 'getBoundingClientRect').and.returnValue(new DOMRect(60, 20, 300, 80));

            caretInto(editor.querySelector('td'));

            expect(component.tableToolbarPosition.top).toBe(94);
        });

        it('should run a table command from the floating toolbar', () => {
            const editor = fixture.debugElement.query(By.css('.rte-editor')).nativeElement;
            editor.innerHTML = '<table><tbody><tr><td>one</td></tr></tbody></table>';
            caretInto(editor.querySelector('td'));

            tableToolbar().queryAll(By.css('.rte-btn'))[0].nativeElement
                .dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
            fixture.detectChanges();

            expect(editor.querySelectorAll('tr').length).toBe(2);
        });

        it('should open the size picker instead of inserting a table straight away', () => {
            const execSpy = spyOn(document, 'execCommand');

            component.execCommand('table', new MouseEvent('mousedown'));
            fixture.detectChanges();

            expect(component.showTableSizePicker).toBeTrue();
            expect(execSpy).not.toHaveBeenCalled();
            expect(fixture.debugElement.queryAll(By.css('.rte-table-picker-cell')).length).toBe(100);
        });

        it('should insert a table of the picked size, with a header row and a paragraph after it', () => {
            const execSpy = spyOn(document, 'execCommand');

            component.insertTableOfSize(2, 2, new MouseEvent('mousedown'));

            const html = execSpy.calls.mostRecent().args[2] as string;
            expect(html).toContain('<thead><tr><th>Header 1</th><th>Header 2</th></tr></thead>');
            expect(html).toContain('<tbody><tr><td><br></td><td><br></td></tr></tbody>');
            expect(html.endsWith('<p><br></p>')).toBeTrue();
            expect(component.showTableSizePicker).toBeFalse();
        });

        it('should insert as many rows and columns as were picked', () => {
            const execSpy = spyOn(document, 'execCommand');

            component.insertTableOfSize(4, 3, new MouseEvent('mousedown'));

            const html = execSpy.calls.mostRecent().args[2] as string;
            expect(html).toContain('<th>Header 3</th>');
            expect(html).not.toContain('<th>Header 4</th>');
            expect((html.match(/<tr><td>/g) || []).length).toBe(3);
        });

        it('should insert a header-only table when one row is picked', () => {
            const execSpy = spyOn(document, 'execCommand');

            component.insertTableOfSize(1, 2, new MouseEvent('mousedown'));

            const html = execSpy.calls.mostRecent().args[2] as string;
            expect(html).toContain('<tbody></tbody>');
        });

        it('should highlight the picked size and close the picker on a click outside', () => {
            component.execCommand('table', new MouseEvent('mousedown'));
            fixture.detectChanges();

            component.highlightTableSize(2, 3);
            fixture.detectChanges();

            expect(fixture.debugElement.queryAll(By.css('.rte-table-picker-cell--on')).length).toBe(6);

            document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
            fixture.detectChanges();

            expect(component.showTableSizePicker).toBeFalse();
        });

        it('should close the picker on a click in the text', () => {
            component.execCommand('table', new MouseEvent('mousedown'));
            fixture.detectChanges();

            component.editorRef.nativeElement
                .dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
            fixture.detectChanges();

            expect(component.showTableSizePicker).toBeFalse();
        });

        it('should stay open for the press that opened it', () => {
            const press = new MouseEvent('mousedown', { bubbles: true });
            component.execCommand('table', press);
            document.dispatchEvent(press);
            fixture.detectChanges();

            expect(component.showTableSizePicker).toBeTrue();
        });

        it('should stay open while the pointer is pressed inside the grid', () => {
            component.execCommand('table', new MouseEvent('mousedown'));
            fixture.detectChanges();

            fixture.debugElement.query(By.css('.rte-table-picker')).nativeElement
                .dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));

            expect(component.showTableSizePicker).toBeTrue();
        });

        it('should disable the list buttons and level arrows inside a cell', () => {
            editor().innerHTML = TABLE;
            caretIn('td');

            expect(component.inTableCell).toBeTrue();
            expect(component.isCommandDisabled('insertUnorderedList')).toBeTrue();
            expect(component.isCommandDisabled('insertOrderedList')).toBeTrue();
            expect(component.isCommandDisabled('indent')).toBeTrue();
            expect(component.commandTitle('insertUnorderedList', 'Bullet list'))
                .toBe('Lists are not available inside a table');
        });

        it('should disable the heading buttons inside a cell', () => {
            editor().innerHTML = TABLE;
            caretIn('td');
            const execSpy = spyOn(document, 'execCommand').and.returnValue(true);

            expect(component.isCommandDisabled('h1')).toBeTrue();
            expect(component.commandTitle('h1', 'Heading 1'))
                .toBe('Headings are not available inside a table');

            component.execCommand('h1', new MouseEvent('mousedown'));

            expect(execSpy).not.toHaveBeenCalled();
            expect(editor().querySelector('h1')).toBeNull();
        });

        it('should disable the image and table buttons inside a cell', () => {
            editor().innerHTML = TABLE;
            caretIn('td');

            expect(component.isCommandDisabled('image')).toBeTrue();
            expect(component.isCommandDisabled('table')).toBeTrue();
            expect(component.commandTitle('image', 'Insert image'))
                .toBe('Pictures are not available inside a table');
            expect(component.commandTitle('table', 'Insert table'))
                .toBe('A table cannot go inside another table');
        });

        it('should not open the size grid or the file dialog inside a cell', () => {
            editor().innerHTML = TABLE;
            caretIn('td');
            component.imageUploader = async () => 'ipfs://one';

            component.execCommand('table', new MouseEvent('mousedown'));
            component.execCommand('image', new MouseEvent('mousedown'));

            expect(component.showTableSizePicker).toBeFalse();
        });

        it('should refuse a pasted or dropped picture inside a cell', async () => {
            editor().innerHTML = TABLE;
            caretIn('td');
            const uploader = jasmine.createSpy('uploader').and.resolveTo('ipfs://one');
            component.imageUploader = uploader;

            await (component as any)._uploadAndInsertImage(
                new File([new Uint8Array([1, 2, 3])], 'photo.png', { type: 'image/png' })
            );

            expect(uploader).not.toHaveBeenCalled();
            expect(component.imageError).toBe('Pictures are not available inside a table');
        });

        it('should not make a list inside a cell', () => {
            editor().innerHTML = TABLE;
            caretIn('td');
            const execSpy = spyOn(document, 'execCommand').and.returnValue(true);

            component.execCommand('insertUnorderedList', new MouseEvent('mousedown'));
            component.execCommand('indent', new MouseEvent('mousedown'));

            expect(execSpy).not.toHaveBeenCalled();
            expect(editor().querySelector('ul')).toBeNull();
        });

        it('should enable the list buttons again outside the table', () => {
            editor().innerHTML = '<p>outside</p>' + TABLE;
            caretIn('p');

            expect(component.inTableCell).toBeFalse();
            expect(component.isCommandDisabled('insertUnorderedList')).toBeFalse();
        });

        it('should put a table after the list rather than inside it', () => {
            editor().innerHTML = '<ul><li>one</li><li>two</li></ul>';
            caretIn('li');

            component.insertTableOfSize(2, 2, new MouseEvent('mousedown'));

            const list = editor().querySelector('ul') as HTMLElement;
            expect(list.querySelector('table')).toBeNull();
            expect(list.querySelectorAll('li').length).toBe(2);
            expect(list.nextElementSibling?.tagName).toBe('TABLE');
            expect(editor().querySelector('table + p')).toBeTruthy();
        });

        it('should insert at the caret when it is not in a list', () => {
            editor().innerHTML = '<p>one</p>';
            caretIn('p');
            const execSpy = spyOn(document, 'execCommand').and.returnValue(true);

            component.insertTableOfSize(2, 2, new MouseEvent('mousedown'));

            expect(execSpy).toHaveBeenCalled();
            expect(execSpy.calls.mostRecent().args[0]).toBe('insertHTML');
        });

        it('should delete the table on the first backspace after it', () => {
            editor().innerHTML = TABLE + '<p><br></p>';
            const paragraph = editor().querySelector('p') as HTMLElement;
            const range = document.createRange();
            range.setStart(paragraph, 0);
            range.collapse(true);
            const selection = window.getSelection();
            selection?.removeAllRanges();
            selection?.addRange(range);

            const event = new KeyboardEvent('keydown', { key: 'Backspace', cancelable: true });
            editor().dispatchEvent(event);

            expect(editor().querySelector('table')).toBeNull();
            expect(event.defaultPrevented).toBeTrue();
        });

        it('should add a row through the browser so undo can restore the table', () => {
            editor().innerHTML = TABLE;
            caretIn('td');
            const execSpy = spyOn(document, 'execCommand').and.returnValue(true);

            component.execCommand('tableRowAdd', new MouseEvent('mousedown'));

            expect(execSpy.calls.allArgs().some(args => args[0] === 'insertHTML')).toBeTrue();
        });

        it('should collapse a whole-table selection after undo', () => {
            editor().innerHTML = TABLE;
            const table = editor().querySelector('table') as HTMLElement;
            const range = document.createRange();
            range.selectNode(table);
            const selection = window.getSelection();
            selection?.removeAllRanges();
            selection?.addRange(range);
            spyOn(document, 'execCommand').and.returnValue(true);

            component.execCommand('undo', new MouseEvent('mousedown'));

            expect(window.getSelection()?.isCollapsed).toBeTrue();
            expect(editor().querySelector('th')?.contains(
                window.getSelection()?.anchorNode as Node
            ) || editor().querySelector('th') === window.getSelection()?.anchorNode).toBeTrue();
        });

        it('should keep the view on the edited cell when a row is added', () => {
            editor().innerHTML = TABLE;
            caretIn('td');
            const scrolls: any[] = [];
            spyOn(Element.prototype, 'scrollIntoView').and.callFake(function (this: Element, options: any) {
                scrolls.push(options);
            });

            component.execCommand('tableRowAdd', new MouseEvent('mousedown'));

            expect(scrolls.length).toBe(1);
            expect(scrolls[0]).toEqual({ block: 'nearest', inline: 'nearest' });
        });

        it('should leave no marker attribute on the replaced table', () => {
            editor().innerHTML = TABLE;
            caretIn('td');

            component.execCommand('tableColumnAdd', new MouseEvent('mousedown'));

            expect(editor().innerHTML).not.toContain('data-rte-fresh');
        });

        it('should delete the table through the browser so undo can restore it', () => {
            editor().innerHTML = TABLE + '<p><br></p>';
            const paragraph = editor().querySelector('p') as HTMLElement;
            const range = document.createRange();
            range.setStart(paragraph, 0);
            range.collapse(true);
            const selection = window.getSelection();
            selection?.removeAllRanges();
            selection?.addRange(range);
            const execSpy = spyOn(document, 'execCommand').and.returnValue(true);

            editor().dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace', cancelable: true }));

            expect(execSpy).toHaveBeenCalledWith('delete');
            expect(window.getSelection()?.toString()).toContain('H1');
        });

        it('should leave a backspace inside a cell to the browser', () => {
            editor().innerHTML = TABLE;
            caretIn('td');

            const event = new KeyboardEvent('keydown', { key: 'Backspace', cancelable: true });
            editor().dispatchEvent(event);

            expect(editor().querySelector('table')).toBeTruthy();
            expect(event.defaultPrevented).toBeFalse();
        });

        it('should leave a backspace in ordinary text to the browser', () => {
            editor().innerHTML = '<p>one</p>';
            caretIn('p');

            const event = new KeyboardEvent('keydown', { key: 'Backspace', cancelable: true });
            editor().dispatchEvent(event);

            expect(event.defaultPrevented).toBeFalse();
        });

        function caretAt(node: Node, offset: number): void {
            const range = document.createRange();
            range.setStart(node, offset);
            range.collapse(true);
            const selection = window.getSelection();
            selection?.removeAllRanges();
            selection?.addRange(range);
        }

        function backspace(): KeyboardEvent {
            const event = new KeyboardEvent('keydown', { key: 'Backspace', cancelable: true });
            editor().dispatchEvent(event);
            return event;
        }

        it('should delete the table when the caret sits in the editor root after it', () => {
            editor().innerHTML = TABLE;
            caretAt(editor(), editor().childNodes.length);

            const event = backspace();

            expect(editor().querySelector('table')).toBeNull();
            expect(event.defaultPrevented).toBeTrue();
        });

        it('should delete the table when a wrapper holds both the table and the caret', () => {
            editor().innerHTML = '<ul><li>one</li></ul><div>' + TABLE + '<p><br></p></div>';
            caretAt(editor().querySelector('div > p') as HTMLElement, 0);

            const event = backspace();

            expect(editor().querySelector('table')).toBeNull();
            expect(editor().querySelector('ul')).toBeTruthy();
            expect(event.defaultPrevented).toBeTrue();
        });

        it('should leave a backspace after plain text in the editor root to the browser', () => {
            editor().innerHTML = TABLE + 'after';
            caretAt(editor(), editor().childNodes.length);

            const event = backspace();

            expect(editor().querySelector('table')).toBeTruthy();
            expect(event.defaultPrevented).toBeFalse();
        });

        it('should leave a backspace at the very start of the editor to the browser', () => {
            editor().innerHTML = TABLE;
            caretAt(editor(), 0);

            const event = backspace();

            expect(editor().querySelector('table')).toBeTruthy();
            expect(event.defaultPrevented).toBeFalse();
        });

        it('should enable the edit commands only inside a cell', () => {
            editor().innerHTML = '<p>outside</p>' + TABLE;
            caretIn('p');
            expect(component.tableEditDisabled).toBeTrue();
            expect(component.isCommandDisabled('tableRowAdd')).toBeTrue();
            expect(component.commandTitle('tableRowAdd', 'Add a row below'))
                .toBe('Table changes are only available inside a table');

            caretIn('td');
            expect(component.tableEditDisabled).toBeFalse();
            expect(component.isCommandDisabled('tableRowAdd')).toBeFalse();
        });

        it('should add a row below the current body row', () => {
            editor().innerHTML = TABLE;
            caretIn('td', 0);

            component.execCommand('tableRowAdd', new MouseEvent('mousedown'));

            expect(rowTexts()).toEqual([
                ['TH:H1', 'TH:H2'],
                ['TD:a', 'TD:b'],
                ['TD:', 'TD:'],
                ['TD:c', 'TD:d']
            ]);
        });

        it('should add a row from the header to the top of the body', () => {
            editor().innerHTML = TABLE;
            caretIn('th', 0);

            component.execCommand('tableRowAdd', new MouseEvent('mousedown'));

            expect(rowTexts()).toEqual([
                ['TH:H1', 'TH:H2'],
                ['TD:', 'TD:'],
                ['TD:a', 'TD:b'],
                ['TD:c', 'TD:d']
            ]);
        });

        it('should never remove the header row but should remove a body row', () => {
            editor().innerHTML = TABLE;
            caretIn('th', 0);

            component.execCommand('tableRowRemove', new MouseEvent('mousedown'));
            expect(editor().querySelectorAll('tr').length).toBe(3);

            caretIn('td', 0);
            component.execCommand('tableRowRemove', new MouseEvent('mousedown'));

            expect(rowTexts()).toEqual([['TH:H1', 'TH:H2'], ['TD:c', 'TD:d']]);
        });

        it('should add a column as th in the header and td elsewhere', () => {
            editor().innerHTML = TABLE;
            caretIn('td', 0);

            component.execCommand('tableColumnAdd', new MouseEvent('mousedown'));

            expect(rowTexts()).toEqual([
                ['TH:H1', 'TH:', 'TH:H2'],
                ['TD:a', 'TD:', 'TD:b'],
                ['TD:c', 'TD:', 'TD:d']
            ]);
        });

        it('should remove the column from every row', () => {
            editor().innerHTML = TABLE;
            caretIn('td', 1);

            component.execCommand('tableColumnRemove', new MouseEvent('mousedown'));

            expect(rowTexts()).toEqual([['TH:H1'], ['TD:a'], ['TD:c']]);
        });

        it('should refuse to remove the last column', () => {
            editor().innerHTML = '<table><thead><tr><th>H1</th></tr></thead>'
                + '<tbody><tr><td>a</td></tr></tbody></table>';
            caretIn('td', 0);

            component.execCommand('tableColumnRemove', new MouseEvent('mousedown'));

            expect(rowTexts()).toEqual([['TH:H1'], ['TD:a']]);
        });

        it('should report the edited table through onChange as markdown', () => {
            const emitted: string[] = [];
            component.registerOnChange((value: string) => { emitted.push(value); });
            editor().innerHTML = TABLE;
            caretIn('td', 0);

            component.execCommand('tableRowAdd', new MouseEvent('mousedown'));

            expect(emitted[emitted.length - 1])
                .toBe('| H1 | H2 |\n| --- | --- |\n| a | b |\n|  |  |\n| c | d |');
        });

        it('should move the caret between cells with Tab and Shift+Tab', () => {
            editor().innerHTML = TABLE;
            caretIn('td', 0);

            component.onKeyDown(new KeyboardEvent('keydown', { key: 'Tab' }));
            expect(window.getSelection()?.anchorNode).toBe(editor().querySelectorAll('td')[1]);

            component.onKeyDown(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true }));
            expect(window.getSelection()?.anchorNode).toBe(editor().querySelectorAll('td')[0]);
        });

        it('should add a row when Tab is pressed in the last cell', () => {
            editor().innerHTML = TABLE;
            caretIn('td', 3);

            component.onKeyDown(new KeyboardEvent('keydown', { key: 'Tab' }));

            expect(rowTexts()).toEqual([
                ['TH:H1', 'TH:H2'],
                ['TD:a', 'TD:b'],
                ['TD:c', 'TD:d'],
                ['TD:', 'TD:']
            ]);
        });

        it('should leave Tab alone outside a table', () => {
            editor().innerHTML = '<p>outside</p>';
            caretIn('p');
            const event = new KeyboardEvent('keydown', { key: 'Tab' });
            spyOn(event, 'preventDefault');

            component.onKeyDown(event);

            expect(event.preventDefault).not.toHaveBeenCalled();
        });

        it('should ignore every other key inside a table', () => {
            editor().innerHTML = TABLE;
            caretIn('td', 0);
            const event = new KeyboardEvent('keydown', { key: 'a' });
            spyOn(event, 'preventDefault');

            component.onKeyDown(event);

            expect(event.preventDefault).not.toHaveBeenCalled();
        });
    });
});
