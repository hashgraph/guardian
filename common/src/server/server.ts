import { ApplicationStates } from '@guardian/interfaces';
import { ApplicationState } from '../helpers/application-state';
import { MessageBrokerChannel } from '../mq';
import express from 'express';
import { MessageResponse } from '../models/message-response';
import { createServer, Server } from 'http';
import { Connection, createConnection } from 'typeorm';

interface IServerOptions {
    port: number;
    name: string;
    channelName: string;
    onReady: (db: Connection | undefined, cn: MessageBrokerChannel, app: express.Application, server: Server) => void;
    requireDB?: boolean;
    entities?: any[];
}
export class ApiServer {
    private state: ApplicationState;
    private channel: MessageBrokerChannel;

    constructor(private options: IServerOptions) {
        this.state = new ApplicationState(this.options.name);
    }

    private async initialize() {

        const connectDB = this.options.requireDB ? async () => {
            return createConnection({
                type: 'mongodb',
                host: process.env.DB_HOST,
                database: process.env.DB_DATABASE,
                synchronize: true,
                logging: true,
                useUnifiedTopology: true,
                entities: [
                    'dist/entity/*.js'
                ],
                cli: {
                    entitiesDir: 'dist/entity'
                }
            })
        } : () => Promise.resolve(undefined);

        return await Promise.all([
            connectDB(),
            MessageBrokerChannel.connect(this.options.name)
        ]);

    }

    private apiServer() {
        const app = express();
        app.use(express.json());
        app.use(express.raw({
            inflate: true,
            limit: '4096kb',
            type: 'binary/octet-stream'
        }));
        // Added global error handler,
        app.use((err, req, res, next) => {
            console.error(err.stack)
            res.status(500).send('Internal server error')
        })
        app.get('/health', async (_: express.Request, res: express.Response) => {
            const serviceStatus = await this.state.getState();
            const testMessage = await this.channel.request<any, any>(`${this.options.channelName}.health`, {}, 5000);
            const statusCode = serviceStatus === ApplicationStates.READY && testMessage.body.ok ? 200 : 500;
            res.status(statusCode).send({
                serviceStatus,
                testMessage
            });
        })
        const server = createServer(app);

        return { app, server };
    }

    public async start() {
        const [db, cn] = await this.initialize();
        this.channel = new MessageBrokerChannel(cn, this.options.channelName);
        const state = this.state;
        // Listen to the healthcheck event and return result.
        this.channel.response('health', () => Promise.resolve(new MessageResponse({
            ok: true,
            ts: new Date().toISOString(),
        })));
        state.setChannel(this.channel);
        state.updateState(ApplicationStates.STARTED);
        const { app, server } = await this.apiServer();
        state.updateState(ApplicationStates.INITIALIZING);
        await this.options.onReady(db, this.channel, app, server);

        state.updateState(ApplicationStates.READY);
        // start express servers
        server.listen(this.options.port, async () => {
            console.log(`${this.options.name} started, healthcheck can be access at: http://0.0.0.0:${this.options.port}/health`, await this.state.getState());
        });

        return server;
    }
}
