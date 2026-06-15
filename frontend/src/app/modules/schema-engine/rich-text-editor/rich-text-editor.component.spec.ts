import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { FormsModule, ReactiveFormsModule, FormControl } from '@angular/forms';
import { ChangeDetectionStrategy } from '@angular/core';
import { By } from '@angular/platform-browser';

import { RichTextEditorComponent } from './rich-text-editor.component';

function createNgModel(value: string = '') {
    return { value } as FormControl;
}

describe('RichTextEditorComponent', () => {
    let component: RichTextEditorComponent;
    let fixture: ComponentFixture<RichTextEditorComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [RichTextEditorComponent],
            imports: [FormsModule, ReactiveFormsModule],
        })
            .overrideComponent(RichTextEditorComponent, {
                set: { changeDetection: ChangeDetectionStrategy.Default },
            })
            .compileComponents();

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
        component.readonly = true;
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
        expect(component['_value']).toBe('');
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
        // Spy on execCommand to avoid needing a real browser context
        const execSpy = spyOn(document, 'execCommand');
        component.showLinkDialog = true;
        component.linkUrl = 'example.com';
        component.insertLink();
        expect(execSpy).toHaveBeenCalledWith('createLink', false, 'https://example.com');
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
});
