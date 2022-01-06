import FastMQ from 'fastmq'
import express, { Request, Response } from 'express'

const server = FastMQ.Server.create('master', 7500, '0.0.0.0');

const PORT = process.env.PORT || 3003;

console.log('Starting message-broker', {
    now: new Date().toString(),
    PORT,
    BUILD_VERSION: process.env.BUILD_VERSION,
    DEPLOY_VERSION: process.env.DEPLOY_VERSION,
});


// start server
Promise.all([
    server.start()
]).then(async () => {



    const app = express();
    app.use(express.json());

    const channel = await FastMQ.Client.connect('mrv-data', 7500, '127.0.0.1');

    app.post('/mrv', async (req: Request, res: Response) => {
        try {
            console.log(req.body);

            await channel.request('ui-service', 'mrv-data', req.body, 'json');
            res.sendStatus(200);
        } catch (e) {
            res.status(500).send(e.message);
        }
    });

    app.get('/info', async (req: Request, res: Response) => {
        res.status(200).json({
            NAME: 'message-broker',
            BUILD_VERSION: process.env.BUILD_VERSION,
            DEPLOY_VERSION: process.env.DEPLOY_VERSION,
        });
    });

    app.listen(PORT, () => {
        console.log('Message Broker server started', PORT);
    });
}, (err) => {
    console.error("Failed to FastMQ server", err)
});
