import chai, { expect } from 'chai';
import chaiHttp from 'chai-http';
import { describe, it } from 'mocha';
import app from '../src/index';

chai.use(chaiHttp);
const webhookApiTest = () => {
  describe('Webhook API', () => {
    let webhookId: string = '';
    it('should create a new webhook', (done) => {
      chai.request(app)
        .post('/api/webhooks')
        .send({ url: 'https://example.com/webhook', events: ['event1', 'event2'] })
        .end((err, res) => {
          expect(res.status).to.equal(201);
          expect(res.body).to.have.property('id');
          webhookId = res.body.id;
          done();
        });
    });

    it('should get a list of webhooks', (done) => {
      chai
        .request(app)
        .get('/api/webhooks')
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body).to.be.an('array');
          expect(res.body[0]).to.have.property('url');
          expect(res.body[0]).to.have.property('events');
          done();
        });
    });


    it('should get a specific webhooks by id', (done) => {
      chai
        .request(app)
        .get(`/api/webhooks/${webhookId}`)
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body).to.have.property('id');
          expect(res.body).to.have.property('url');
          expect(res.body).to.have.property('events');
          expect(res.body.events).to.be.an('array');
          done();
        });
    });

    it('should update a webhook', (done) => {
      chai
        .request(app)
        .put(`/api/webhooks/${webhookId}`)
        .send({
          events: ['event1', 'event3'],
          url: 'https://example.com/webhook-updated',
        })
        .end((err, res) => {
          expect(res).to.have.status(204);
          done();
        });
    });

    it('should delete a webhook', (done) => {
      chai
        .request(app)
        .delete(`/api/webhooks/${webhookId}`)
        .end((err, res) => {
          expect(res).to.have.status(204);
          done();
        });
    });

    it('should get a list of events', (done) => {
      chai
        .request(app)
        .get('/api/events')
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body).to.be.an('array');
          expect(res.body[0]).to.be.an('string');
          done();
        });
    });
  });
};

export default webhookApiTest;
