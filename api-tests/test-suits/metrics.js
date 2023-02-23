
const chai = require('chai');
const chaiHttp = require('chai-http');
chai.use(chaiHttp);
let should = chai.should();

function Metrics() {
    describe('Test metrics endpoints', () => {
        it('GET api-gateway /metrics', (done) => {
            chai.request('http://localhost:3000/api/v1')
                .get('/metrics')
                .end((err, res) => {
                    res.should.have.status(200);
                    done();
                });
        });

        it('GET guardian-service /metrics', (done) => {
            chai.request('http://localhost:5007')
                .get('/metrics')
                .end((err, res) => {
                    res.should.have.status(200);
                    done();
                });
        });
        it('GET auth-service /metrics', (done) => {
            chai.request('http://localhost:5005')
                .get('/metrics')
                .end((err, res) => {
                    res.should.have.status(200);
                    done();
                });
        });
        it('GET policy-service /metrics', (done) => {
            chai.request('http://localhost:5006')
                .get('/metrics')
                .end((err, res) => {
                    res.should.have.status(200);
                    done();
                });
        });
        it('GET topic-viewer /metrics', (done) => {
            chai.request('http://localhost:5009')
                .get('/metrics')
                .end((err, res) => {
                    res.should.have.status(200);
                    done();
                });
        });
        it('GET mrv-sender /metrics', (done) => {
            chai.request('http://localhost:5008')
                .get('/metrics')
                .end((err, res) => {
                    res.should.have.status(200);
                    done();
                });
        });
    });
}

module.exports = {
    Metrics
}
