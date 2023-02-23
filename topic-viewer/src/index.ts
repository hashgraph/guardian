import express from 'express';
import { startMetricsServer } from './utils/metrics';

const PORT = process.env.PORT || 3007;
(async () => {
    const app = express();
    app.use(express.static('public'));
    app.use(express.json());

    startMetricsServer();
    app.listen(PORT, () => {
        console.log('Topic Viewer started at port', PORT);
    })
})();
