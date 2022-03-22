import WebSocket from 'ws';
import {IncomingMessage, Server} from 'http';
import { Users } from '@helpers/users';
import { Logger } from 'logger-helper';

export class WebSocketsService {
    private wss: WebSocket.Server;

    constructor(
        private server: Server,
        private channel: any
    ) {
        this.wss = new WebSocket.Server({server});
        this.registerPingPongAnswers();
        this.registerAuthorisation();
        this.registerMessageHandler();
    }

    private registerPingPongAnswers(): void {
        this.wss.on('connection', async (ws: any, req: IncomingMessage) => {
            ws.on('message', (data: Buffer) => {
                switch (data.toString()) {
                    case 'ping':
                        ws.send('pong');
                        break;
                }
            });
        });
    }

    private registerAuthorisation(): void {
        this.wss.on('connection', async (ws: any, req: IncomingMessage) => {
            try {
                const params = req.url.split('?')[1];
                const token = new URLSearchParams(params).get('token');
                ws.user = await new Users().getUserByToken(token);
            } catch (e) {
                new Logger().error(e.toString(), ['API_GATEWAY']);
                console.error(e.message);
            }
        });
    }

    private registerMessageHandler(): void {
        this.channel.response('update-block', async (msg, res) => {
            this.wss.clients.forEach((client: any) => {
                try {
                    client.send(JSON.stringify({
                        type: 'update-event',
                        data: msg.payload.uuid
                    }));
                } catch (e) {
                    console.error('WS Error', e);
                }
            });
        });

        this.channel.response('block-error', async (msg, res) => {
            this.wss.clients.forEach((client: any) => {
                try {
                    if (client.user.did === msg.payload.user.did) {
                        client.send(JSON.stringify({
                            type: 'error-event',
                            data: {
                                blockType: msg.payload.blockType,
                                message: msg.payload.message
                            }
                        }));
                    }
                } catch (e) {
                    new Logger().error(e.toString(), ['API_GATEWAY']);
                    console.error('WS Error', e);
                }
            });
        })
    }
}
