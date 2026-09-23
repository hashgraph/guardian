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
