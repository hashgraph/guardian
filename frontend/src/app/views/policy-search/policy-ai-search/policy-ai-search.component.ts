import { Component, ElementRef, HostListener, OnInit, ViewChild } from '@angular/core';
import { FormControl, Validators } from '@angular/forms';
import { AISearchMessage, AISearchRequest, MOCK_AI_SEARCH_MESSAGE } from './ai-search.model';
import { AISearchService } from '../../../services/ai-search.service';
import { Router } from '@angular/router';

/**
 * The page with AI policy search
 */
@Component({
    selector: 'app-policy-ai-search',
    templateUrl: './policy-ai-search.component.html',
    styleUrls: ['./policy-ai-search.component.scss']
})
export class PolicyAISearchComponent implements OnInit {
    loading: boolean = false;
    requestTextControl: FormControl = new FormControl(null, Validators.required);
    messages: AISearchMessage[] = MOCK_AI_SEARCH_MESSAGE;

    @ViewChild('containerMessages') containerMessages: ElementRef;

    constructor(private aiSearchService: AISearchService, private router: Router) {
    }

    ngOnInit() {
        this.messages = [];
    }

    ngOnDestroy(): void {
    }

    sendRequest() {
        this.loading = true;
        const message: AISearchRequest = {
            message: this.requestTextControl.value,
        }
        const request: AISearchMessage = {
            type: 'REQUEST',
            data: message.message,
        }
        this.messages.push(request);
        this.requestTextControl.setValue(null);
        this.aiSearchService.sendMessage(message).subscribe(s => {
            const response: AISearchMessage = {
                type: 'RESPONSE',
                data: s,
            }
            this.messages.push(response);
            this.loading = false;
        });
    }

    @HostListener('document:keydown.enter', ['$event']) onKeydownHandler(event: KeyboardEvent) {
        if (this.requestTextControl.value) {
            this.sendRequest();
        }
    }
}
