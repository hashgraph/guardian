import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Observable, Subject, of, throwError } from 'rxjs';
import { SettingsService } from 'src/app/services/settings.service';
import { HederaExplorer } from './hedera-explorer.component';

@Component({
    template: `<hedera-explorer [params]="tokenId" type="tokens">{{ tokenId }}</hedera-explorer>`,
    standalone: false
})
class HostComponent {
    tokenId: string | null = '0.0.10004069';
}

describe('HederaExplorer', () => {
    let net: Observable<string>;

    function build(): ComponentFixture<HostComponent> {
        TestBed.configureTestingModule({
            declarations: [HederaExplorer, HostComponent],
            providers: [{ provide: SettingsService, useValue: { getHederaNet: () => net } }]
        });
        const fixture = TestBed.createComponent(HostComponent);
        fixture.detectChanges();
        return fixture;
    }

    function href(fixture: ComponentFixture<HostComponent>): string | null {
        return fixture.nativeElement.querySelector('a').getAttribute('href');
    }

    function inactive(fixture: ComponentFixture<HostComponent>): boolean {
        return fixture.nativeElement.querySelector('a').classList.contains('hedera-link-inactive');
    }

    it('links to hashscan for a token id', () => {
        net = of('testnet');
        const fixture = build();
        expect(href(fixture)).toBe('https://hashscan.io/testnet/token/0.0.10004069');
        expect(inactive(fixture)).toBeFalse();
    });

    it('links to hashscan when the network arrives after render', () => {
        const network = new Subject<string>();
        net = network.asObservable();
        const fixture = build();
        expect(href(fixture)).toBeNull();

        network.next('testnet');
        fixture.detectChanges();
        expect(href(fixture)).toBe('https://hashscan.io/testnet/token/0.0.10004069');
    });

    it('renders no link when the network is unavailable', () => {
        net = throwError(() => new Error('401'));
        const fixture = build();
        expect(href(fixture)).toBeNull();
        expect(inactive(fixture)).toBeTrue();
    });

    it('renders no link for an unknown network', () => {
        net = of('unknown-net');
        expect(href(build())).toBeNull();
    });
});
