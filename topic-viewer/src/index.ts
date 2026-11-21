import express from 'express';
import { getIpfsFile } from './ipfs.js';
import { startMetricsServer } from './utils/metrics.js';

const PORT = process.env.PORT || 3006;
(async () => {
    const app = express();
    app.use(express.static('public'));
    app.use(express.json());
    app.get('/ipfs/:cid', getIpfsFile);

    startMetricsServer();
    app.listen(PORT, () => {
        console.log('Topic Viewer started at port', PORT);
    })
})();
