import WebSocket from 'ws';
import {IncomingMessage, Server} from 'http';
import {AuthenticatedWebSocket, IAuthUser} from '@auth/auth.interface';
import {verify} from 'jsonwebtoken';

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
        this.wss.on('connection', async (ws: AuthenticatedWebSocket, req: IncomingMessage) => {
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
        this.wss.on('connection', async (ws: AuthenticatedWebSocket, req: IncomingMessage) => {
            const token = req.url.replace('/?token=', '');
            verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user: IAuthUser) => {
                if (err) {
                    return;
                }
                ws.user = user;
            });
        });
    }

    private registerMessageHandler(): void {
        this.channel.response('update-block', async (msg, res) => {
            this.wss.clients.forEach((client: AuthenticatedWebSocket) => {
                try {
                    client.send(msg.payload.uuid);
                } catch (e) {
                    console.error('WS Error', e);
                }
            });
        })
    }
}
