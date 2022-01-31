import express from 'express';
import 'express-async-errors';
import FastMQ from 'fastmq';
import { createConnection } from 'typeorm';
import { DefaultDocumentLoader, VCHelper } from 'vc-modules';
import passport from 'passport';
import { HeaderAPIKeyStrategy } from 'passport-headerapikey';
import createError from 'http-errors';
import { VCDocumentLoader } from './document-loader/vc-document-loader';
import { makeInfoApi } from '@api/info';
import { debugApi } from '@api/debug';
import { makeAuditApi } from '@api/audit';
import assert from 'assert';
import { makeTrackAndTraceApi } from '@api/track-and-trace';
import { DeviceConfig } from '@entity/device-config';
import morgan from 'morgan';
import { makeSchemaApi } from '@api/schema';
import { makeTokenApi } from '@api/token';
import { makePolicyApi } from '@api/policy';
import { makeUserApi } from '@api/user';
import axios from 'axios';
import { PolicyPackage } from '@entity/policy-package';
import { ProcessedMrv } from '@entity/processed-mrv';

axios.interceptors.request.use((request) => {
  if (request.url?.includes('login')) {
    console.log('Axios: Starting Request', request.url);
  } else {
    console.log(
      'Axios: Starting Request',
      JSON.stringify({ url: request.url, data: request.data }, null, 2),
    );
  }
  return request;
});

const {
  SERVICE_CHANNEL,
  MQ_ADDRESS,
  MRV_RECEIVER_URL,
  DB_HOST,
  DB_DATABASE,
  GUARDIAN_TYMLEZ_API_KEY,
  UI_SERVICE_BASE_URL,
  GUARDIAN_SERVICE_BASE_URL,
  MESSAGE_BROKER_BASE_URL,
  OPERATOR_ID,
} = process.env;

const PORT = process.env.PORT || 3010;

console.log('Starting tymlez-service', {
  now: new Date().toString(),
  BUILD_VERSION: process.env.BUILD_VERSION,
  DEPLOY_VERSION: process.env.DEPLOY_VERSION,
  PORT,
  DB_HOST,
  DB_DATABASE,
  OPERATOR_ID,
  MRV_RECEIVER_URL,
  UI_SERVICE_BASE_URL,
  GUARDIAN_SERVICE_BASE_URL,
  MESSAGE_BROKER_BASE_URL,
  SERVICE_CHANNEL,
  MQ_ADDRESS,
});

assert(DB_HOST, `DB_HOST is missing`);
assert(DB_DATABASE, `DB_DATABASE is missing`);
assert(SERVICE_CHANNEL, `SERVICE_CHANNEL is missing`);
assert(MQ_ADDRESS, `MQ_ADDRESS is missing`);
assert(MRV_RECEIVER_URL, `MRV_RECEIVER_URL is missing`);
assert(UI_SERVICE_BASE_URL, `UI_SERVICE_BASE_URL is missing`);
assert(GUARDIAN_SERVICE_BASE_URL, `GUARDIAN_SERVICE_BASE_URL is missing`);
assert(MESSAGE_BROKER_BASE_URL, `MESSAGE_BROKER_BASE_URL is missing`);
assert(GUARDIAN_TYMLEZ_API_KEY, `GUARDIAN_TYMLEZ_API_KEY is missing`);

passport.use(
  new HeaderAPIKeyStrategy(
    { header: 'Authorization', prefix: 'Api-Key ' },
    false,
    function (apiKey, done) {
      if (apiKey === GUARDIAN_TYMLEZ_API_KEY) {
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
    host: DB_HOST,
    database: DB_DATABASE,
    synchronize: true,
    logging: true,
    useUnifiedTopology: true,
    entities: ['dist/entity/*.js'],
    cli: {
      entitiesDir: 'dist/entity',
    },
  }),
  FastMQ.Client.connect(SERVICE_CHANNEL, 7500, MQ_ADDRESS),
]).then(async (values) => {
  const [db, channel] = values;
  const app = express();

  app.use(
    morgan('combined', {
      skip: (req) => {
        return !!req.originalUrl?.startsWith('/info');
      },
    }),
  );
  app.use(express.json());

  const deviceConfigRepository = db.getMongoRepository(DeviceConfig);
  const policyPackageRepository = db.getMongoRepository(PolicyPackage);
  const processedMrvRepository = db.getMongoRepository(ProcessedMrv);

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
  app.use(
    '/info',
    makeInfoApi({
      uiServiceBaseUrl: UI_SERVICE_BASE_URL,
      guardianServiceBaseUrl: GUARDIAN_SERVICE_BASE_URL,
      messageBrokerBaseUrl: MESSAGE_BROKER_BASE_URL,
    }),
  );

  // Add all protected routes below
  app.use(
    passport.authenticate('headerapikey', {
      session: false,
    }),
  );

  app.use('/debug/', debugApi);
  app.use('/audit/', makeAuditApi({ channel, deviceConfigRepository }));
  app.use(
    '/track-and-trace/',
    makeTrackAndTraceApi({
      vcDocumentLoader,
      vcHelper,
      deviceConfigRepository,
      policyPackageRepository,
      processedMrvRepository,
      mrvReceiverUrl: MRV_RECEIVER_URL,
      uiServiceBaseUrl: UI_SERVICE_BASE_URL,
    }),
  );
  app.use(
    '/schema/',
    makeSchemaApi({
      uiServiceBaseUrl: UI_SERVICE_BASE_URL,
    }),
  );
  app.use(
    '/tokens/',
    makeTokenApi({
      uiServiceBaseUrl: UI_SERVICE_BASE_URL,
    }),
  );
  app.use(
    '/policy/',
    makePolicyApi({
      uiServiceBaseUrl: UI_SERVICE_BASE_URL,
      policyPackageRepository,
    }),
  );
  app.use(
    '/user/',
    makeUserApi({
      uiServiceBaseUrl: UI_SERVICE_BASE_URL,
    }),
  );

  app.listen(PORT, () => {
    console.log('tymlez service started', PORT);
  });
});
