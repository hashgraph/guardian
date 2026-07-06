declare module 'did-context' {
    const value: { contexts: Map<string, any>; [key: string]: any };
    export = value;
}

declare module '@digitalbazaar/credentials-context' {
    export const contexts: Map<string, any>;
    export const metadata: Map<string, any>;
    export const named: Map<string, any>;
}

declare module '@digitalbazaar/security-context' {
    const value: { contexts: Map<string, any>; constants: Record<string, string>; [key: string]: any };
    export = value;
}

declare module '@digitalbazaar/ed25519-signature-2018' {
    export class Ed25519Signature2018 {
        static CONTEXT_URL: string;
        static CONTEXT: any;
        constructor(options?: any);
    }
}

declare module '@digitalbazaar/ed25519-verification-key-2018' {
    export class Ed25519VerificationKey2018 {
        static from(options: any): Promise<Ed25519VerificationKey2018>;
        static generate(options?: any): Promise<Ed25519VerificationKey2018>;
    }
}

declare module 'jsonld-signatures-v7' {
    import type { VerificationResult } from '@digitalbazaar/vc';
    export function sign(document: any, options: any): Promise<any>;
    export function verify(document: any, options: any): Promise<VerificationResult>;
    export const purposes: { AssertionProofPurpose: new (options?: any) => any; [key: string]: any };
    export const suites: Record<string, any>;
    export const SECURITY_CONTEXT_URL: string;
    export const SECURITY_PROOF_URL: string;
}

declare module '@digitalbazaar/vc' {
    export interface VerificationResult {
        verified: boolean;
        results?: Array<{ verified: boolean; error?: { message?: string } }>;
        error?: any;
    }
    export function issue(options: any): Promise<any>;
    export function verifyCredential(options: any): Promise<VerificationResult>;
    export function signPresentation(options: any): Promise<any>;
}
