import WebSocket from 'ws';
import {IncomingMessage, Server} from 'http';
import { Users } from '@helpers/users';

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
                console.error(e.message);
            }
        });
    }

    private registerMessageHandler(): void {
        this.channel.response('update-block', async (msg, res) => {
            this.wss.clients.forEach((client: any) => {
                try {
                    client.send(msg.payload.uuid);
                } catch (e) {
                    console.error('WS Error', e);
                }
            });
        })
    }
}
