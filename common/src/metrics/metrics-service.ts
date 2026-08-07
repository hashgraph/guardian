import express, { Express } from 'express'
import client, { Registry } from 'prom-client';
import process from 'node:process';
import { PinoLogger } from '../helpers/index.js';

export class MetricsService {
    private readonly logger: PinoLogger;
    private readonly server: Express;
    private readonly register: Registry;
    private readonly port: number;

    constructor() {
        this.server = express();
        this.register = client.register;
        this.logger = new PinoLogger();
        this.port = parseInt(process.env.PROMETEUS_PORT, 10) || 5007;
    }

    public init(): void {
        this.server.get('/', async (_, res) => {
            res.set('Content-Type', this.register.contentType);
            res.send(await this.register.metrics())
        });

        this.server.listen(this.port, () => {
            this.logger
                .info(`Prometeus client listening on port ${this.port}`, null, null);
        })
    }
}
