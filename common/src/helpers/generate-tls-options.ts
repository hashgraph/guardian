export function GenerateTLSOptionsNats() {
    if (process.env.TLS_CERT && process.env.TLS_KEY) {
        return {
            cert: process.env.TLS_CERT,
            key: process.env.TLS_KEY,
            ca: process.env.TLS_CA
        }
    }
    return undefined;
}
