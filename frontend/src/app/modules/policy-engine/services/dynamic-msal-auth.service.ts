import { Injectable, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import {
    Configuration,
    LogLevel,
    BrowserCacheLocation,
    PublicClientApplication,
    PopupRequest,
    AuthenticationResult,
} from '@azure/msal-browser';

export interface DynamicMsalConfig {
    clientId: string;
    authority: string;
    knownAuthorities: string[];
    scopes: string[];
}

@Injectable()
export class DynamicMsalAuthService implements OnDestroy {
    private destroy$ = new Subject<void>();
    private dynamicConfig: DynamicMsalConfig;
    private msalInstance: PublicClientApplication | null = null;
    private msalKey = `msal`;

    constructor() {}

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    public async getRemoteAuthToken(config: DynamicMsalConfig): Promise<string> {
        const authenticationResult = await this.loginWithFormConfig(config);
        return authenticationResult.accessToken || authenticationResult.idToken;
    }

    private async loginWithFormConfig(config: DynamicMsalConfig): Promise<AuthenticationResult> {
        try {
            this.dynamicConfig = config;
            this.clearMsalCache();
            await this.recreateMsalInstance();
            return await this.triggerOAuth2Popup();
        } catch (error) {
            console.error('Error executing loginWithFormConfig:', error);
            throw error;
        }
    }

    private async recreateMsalInstance(): Promise<void> {
        try {
            const msalConfig: Configuration = {
                auth: {
                    clientId: this.dynamicConfig.clientId,
                    authority: this.dynamicConfig.authority,
                    knownAuthorities: this.dynamicConfig.knownAuthorities,
                    redirectUri: window.location.origin,
                    postLogoutRedirectUri: window.location.origin,
                },
                cache: {
                    cacheLocation: BrowserCacheLocation.SessionStorage,
                    storeAuthStateInCookie: false,
                },
                system: {
                    allowRedirectInIframe: true,
                    loggerOptions: {
                        loggerCallback: (logLevel: LogLevel, message: string) => {
                            console.log(`[MSAL ${LogLevel[logLevel]}]: ${message}`);
                        },
                        logLevel: LogLevel.Info,
                        piiLoggingEnabled: false,
                    },
                },
            };

            this.msalInstance = new PublicClientApplication(msalConfig);
            await this.msalInstance.initialize();
        } catch (error) {
            throw error;
        }
    }

    private async triggerOAuth2Popup(): Promise<AuthenticationResult> {
        if (!this.msalInstance || !this.dynamicConfig) {
            throw new Error('MSAL is not initialized');
        }

        const popupRequest: PopupRequest = {
            scopes: this.dynamicConfig.scopes,
            authority: this.dynamicConfig.authority,
            popupWindowAttributes: {
                popupSize: {
                    width: 950,
                    height: 950,
                },
                popupPosition: {
                    left: (window.screen.availWidth - 950) / 2,
                    top: (window.screen.availHeight - 950) / 2,
                },
            },
        };

        try {
            return await this.msalInstance.loginPopup(popupRequest);
        } catch (error) {
            this.clearMsalCache();
            throw error;
        }
    }

    private clearMsalCache(): void {
        this.msalInstance = null;
        this.clearStorage(sessionStorage);
    }

    private clearStorage(storage: Storage): void {
        const keysToRemove: string[] = [];
        
        for (let i = 0; i < storage.length; i++) {
            const key = storage.key(i)!;
            if (key.includes(this.msalKey) || key.includes(this.dynamicConfig.clientId)) {
                keysToRemove.push(key);
            }
        }
        
        keysToRemove.forEach(key => storage.removeItem(key));
    }
}
