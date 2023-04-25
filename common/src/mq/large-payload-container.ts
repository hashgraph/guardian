// import util from 'util';
import express from 'express'
// import { lookup } from 'dns';
import { hostname } from 'os';
import { GenerateUUIDv4 } from '@guardian/interfaces';
import { Logger } from '../helpers';
import { Singleton } from '../decorators/singleton';

/**
 * Large objects container
 */
@Singleton
export class LargePayloadContainer {

    /**
     * Server was started
     * @private
     */
    private _started: boolean;

    /**
     * Server was started
     */
    public get started(): boolean {
        return this._started;
    }

    /**
     * Logger
     * @private
     */
    private readonly logger: Logger;

    /**
     * Objects map
     * @private
     */
    private readonly objectsMap: Map<string, Buffer>;

    /**
     * Protocol
     * @private
     */
    private readonly PROTOCOL: 'http' | 'https';

    /**
     * Server port
     * @private
     */
    private readonly PORT: number;

    /**
     * Domain
     */
    private readonly DOMAIN: string;

    constructor() {
        this.PORT = (process.env.DIRECT_MESSAGE_PORT) ? parseInt(process.env.DIRECT_MESSAGE_PORT, 10) : this.generateRandom(50000, 59999);
        this.DOMAIN = (process.env.DIRECT_MESSAGE_HOST) ? process.env.DIRECT_MESSAGE_HOST : hostname();
        this.PROTOCOL = (process.env.DIRECT_MESSAGE_PROTOCOL) ? process.env.DIRECT_MESSAGE_PROTOCOL as any : 'http';

        this.objectsMap = new Map();
        this.logger = new Logger();
        this._started = false;
    }

    /**
     * Run server
     */
    public runServer() {
        if (this.started) {
            return;
        }
        const app = express();
        app.get('/:objectId', (req, res) => {
            const objectID = req.params.objectId;
            const buf = this.objectsMap.get(objectID);
            if (!buf) {
                res.sendStatus(404);
                return
            }
            this.objectsMap.delete(objectID)
            res.send(buf);
        })

        app.listen(this.PORT, () => {
            this.logger.info(`Large objects server starts on ${this.PORT} port`, [process.env.SERVICE_CHANNEL?.toUpperCase()]);
        });
        this._started = true;
    }

    /**
     * Add object to share
     * @param o
     */
    public addObject(o: Buffer): URL {
        const objectID = GenerateUUIDv4();
        this.objectsMap.set(objectID, o);
        return new URL(`/${objectID}`, `${this.PROTOCOL}://${this.DOMAIN}:${this.PORT}`);
    }

    /**
     * Generate random
     * @param min
     * @param max
     * @private
     */
    private generateRandom(min: number, max: number) {
        const difference = max - min;
        let rand = Math.random();
        rand = Math.floor( rand * difference);
        rand = rand + min;
        return rand;
    }

    /**
     * Lookup ip address
     * @param domain
     * @private
     */
    // private async lookupAddress(domain: string): Promise<string> {
    //     const {address} = await util.promisify(lookup)(domain);
    //     return address
    // }
}
