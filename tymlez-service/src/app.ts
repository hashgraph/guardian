import express, { Request, Response } from 'express';
import FastMQ from 'fastmq';
import { createConnection } from 'typeorm';
import { DefaultDocumentLoader, VCHelper } from 'vc-modules';
import passport from 'passport';
import { HeaderAPIKeyStrategy } from 'passport-headerapikey';
import createError from 'http-errors';
import { VCDocumentLoader } from './document-loader/vc-document-loader';
import { infoApi } from '@api/info';
import { debugApi } from '@api/debug';

const PORT = process.env.PORT || 3010;

console.log('Starting tymlez-service', {
  now: new Date().toString(),
  PORT,
  DB_HOST: process.env.DB_HOST,
  DB_DATABASE: process.env.DB_DATABASE,
  BUILD_VERSION: process.env.BUILD_VERSION,
  DEPLOY_VERSION: process.env.DEPLOY_VERSION,
  OPERATOR_ID: process.env.OPERATOR_ID,
});

passport.use(
  new HeaderAPIKeyStrategy(
    { header: 'Authorization', prefix: 'Api-Key ' },
    false,
    function (apiKey, done) {
      if (apiKey === process.env.GUARDIAN_TYMLEZ_API_KEY) {
        done(null, {});
      } else {
        done(createError(401), false);
      }
    },
  ),
);

Promise.all([
  createConnection({
    type: 'mongodb',
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    synchronize: true,
    logging: true,
    useUnifiedTopology: true,
  }),
  FastMQ.Client.connect(
    process.env.SERVICE_CHANNEL,
    7500,
    process.env.MQ_ADDRESS,
  ),
]).then(async (values) => {
  const [db, channel] = values;
  const app = express();

  // <-- Document Loader

  const vcHelper = new VCHelper();
  const defaultDocumentLoader = new DefaultDocumentLoader();
  const vcDocumentLoader = new VCDocumentLoader('https://localhost/schema', '');
  vcHelper.addContext('https://localhost/schema');
  vcHelper.addDocumentLoader(defaultDocumentLoader);
  vcHelper.addDocumentLoader(vcDocumentLoader);
  vcHelper.buildDocumentLoader();
  // Document Loader -->

  // No not protect /info
  app.use('/info', infoApi);

  // Add all protected routes below
  app.use(
    passport.authenticate('headerapikey', {
      session: false,
    }),
  );

  app.use('/debug/', debugApi);

  app.listen(PORT, () => {
    console.log('tymlez service started', PORT);
  });
});
