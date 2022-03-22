import FastMQ from 'fastmq'
import express, {Request, Response} from 'express'

const mqServer = FastMQ.Server.create('master', 7500, '0.0.0.0');

const PORT = process.env.PORT || 3003;

// start server
export default Promise.all([
    mqServer.start()
]).then(async () => {

    const app = express();
    app.use(express.json());

    const channel = await FastMQ.Client.connect('mrv-data', 7500, '127.0.0.1');

    app.post('/mrv', async (req: Request, res: Response) => {
        try {
            await channel.request('guardian.*', 'mrv-data', req.body, 'json');
            res.sendStatus(200);
        } catch (e) {
            res.status(500).send(e.message);
        }
    });

    app.listen(PORT, () => {
        console.log('Message Broker server started', PORT);
    });
});
