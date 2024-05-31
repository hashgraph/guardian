import express, { Express } from 'express'
import client, { Registry } from 'prom-client';
import process from 'process';
import { Logger } from '../helpers/index.js';

export class MetricsService{
    private readonly logger: Logger;
    private readonly server: Express;
    private readonly register: Registry;
    private readonly port: number;

    constructor() {
        this.server = express();
        this.register = client.register;
        this.logger = new Logger();
        this.port = parseInt(process.env.PROMETEUS_PORT, 10) || 5007;
    }

    public init(): void {
        this.server.get('/', async (_, res) => {
            res.set('Content-Type', this.register.contentType);
            res.send(await this.register.metrics())
        });

        this.server.listen(this.port, () => {
            this.logger.info(`Prometeus client listening on port ${this.port}`);
        })
    }
}
