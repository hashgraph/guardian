import express, { Request, Response } from 'express';
import axios from 'axios';
import { VCDocumentLoader } from './document-loader/vc-document-loader';
import { DefaultDocumentLoader } from './document-loader/document-loader-default';
import { VCHelper } from './vc-helper';
import path from 'path';
import fs from 'fs';
import { startMetricsServer } from './utils/metrics';

enum GenerateMode {
    TEMPLATES = "TEMPLATES",
    VALUES = "VALUES"
}

const PORT = process.env.PORT || 3005;
(async () => {
    const app = express()

    app.use(express.static('public'));
    app.use(express.json());

    const defaultDocumentLoader = new DefaultDocumentLoader();
    const vcDocumentLoader = new VCDocumentLoader('https://localhost/schema', '');
    const vcHelper = new VCHelper();
    vcHelper.addDocumentLoader(defaultDocumentLoader);
    vcHelper.addDocumentLoader(vcDocumentLoader);
    vcHelper.buildDocumentLoader();

    app.get('/templates', async (req: Request, res: Response) => {
        const directoryPath = path.join(__dirname, '..', 'templates');
        fs.readdir(directoryPath, function (err, files) {
            res.status(200).json(files);
        });
    });

    app.post('/mrv-generate', async (req: Request, res: Response) => {
        const { num, config, setting, mode } = req.body;
        const {
            url,
            topic,
            hederaAccountId,
            hederaAccountKey,
            installer,
            did,
            key,
            policyId,
            type,
            context,
            schema,
            policyTag,
            didDocument,
            ref
        } = config;

        vcDocumentLoader.setDocument(schema);
        vcDocumentLoader.setContext(context);

        let document, vc;
        try {
            const date = (new Date()).toISOString();
            let vcSubject: any = {
                ...context
            };

            switch(mode) {
                case GenerateMode.TEMPLATES:
                    let data: any = fs.readFileSync(path.join(__dirname, '..', 'templates', setting.fileName));
                    vcSubject = Object.assign(vcSubject, JSON.parse(data));
                    break;
                case GenerateMode.VALUES:
                    if (setting) {
                        const keys = Object.keys(setting);
                        for (let i = 0; i < keys.length; i++) {
                            const key = keys[i];
                            const item = setting[key];
                            if (item.random) {
                                const _decimal = Math.pow(10, item.decimal + 1);
                                vcSubject[key] = String(Math.round(Math.random() * _decimal));
                            } else {
                                vcSubject[key] = String(item.value);
                            }
                        }
                    }
                    break;
            }

            const fields = schema['@context'][type]['@context'];
            if(fields.policyId) {
                vcSubject.policyId = policyId;
            }
            if(fields.accountId) {
                vcSubject.accountId = hederaAccountId;
            }
            if(fields.ref) {
                vcSubject.ref = ref;
            }

            document = await vcHelper.createVC(vcSubject, didDocument, did);
            console.log('created vc', document);
        } catch (error) {
            console.error(error);
            res.status(500).json(error);
            return;
        }

        const body = {
            document: document,
            ref: ref,
            owner: installer,
            policyTag: policyTag
        }

        try {
            console.log('start post');
            const resp = await axios.post(url, body);
            console.log('end post', resp.status);
        } catch (error) {
            console.error(error);
            res.status(500).json(error);
            return;
        }

        res.status(200).json(document);
    });

    startMetricsServer();
    app.listen(PORT, () => {
        console.log('Sender started at port', PORT);
    })
})();
