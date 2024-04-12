import express from 'express'
import { hostname } from 'os';
import { GenerateUUIDv4 } from '@guardian/interfaces';
import { Singleton } from '../decorators/singleton.js';

/**
 * Large objects container
 */
@Singleton
export class LargePayloadContainer {

    /**
     * Is port random generated
     * @private
     */
    private readonly _portGenerated: boolean = false;

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
     * Objects map
     * @private
     */
    private readonly objectsMap: Map<string, Buffer | Uint8Array>;

    /**
     * Protocol
     * @private
     */
    private readonly PROTOCOL: 'http' | 'https';

    /**
     * Server port
     * @private
     */
    private PORT: number;

    /**
     * Domain
     */
    private readonly DOMAIN: string;

    constructor() {
        if (process.env.DIRECT_MESSAGE_PORT) {
            this.PORT = parseInt(process.env.DIRECT_MESSAGE_PORT, 10);
            this._portGenerated = false;
        } else {
            this._portGenerated = true;
            this.PORT = this.generateRandom(50000, 59999);
        }
        this.DOMAIN = (process.env.DIRECT_MESSAGE_HOST) ? process.env.DIRECT_MESSAGE_HOST : hostname();
        this.PROTOCOL = (process.env.DIRECT_MESSAGE_PROTOCOL) ? process.env.DIRECT_MESSAGE_PROTOCOL as any : 'http';

        this.objectsMap = new Map();
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

        const server = app.listen(this.PORT, () => {
            this._started = true;
            try {
                // this.logger.info(`Large objects server starts on ${this.PORT} port`, [process.env.SERVICE_CHANNEL?.toUpperCase()]);
                console.info(`Large objects server starts on ${this.PORT} port`);
            } catch (e) {
                console.warn(e.message)
            }
        });
        server.on('error', (error) => {
            if (!this._portGenerated) {
                throw error;
            } else {
                console.error(`Port ${this.PORT} already in use, regenerating...`);
                this.PORT = this.generateRandom(50000, 59999);
                this.runServer();
            }
        });
    }

    /**
     * Add object to share
     * @param o
     */
    public addObject(o: Buffer | Uint8Array): URL {
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
