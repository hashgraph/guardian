
import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";

context('Login', { tags: ['accounts', 'firstPool', 'all'] }, () => {
  const SRUsername = Cypress.env('SRUser');
  const UserUsername = Cypress.env('User');
  const loginUrl = `${API.ApiServer}${API.AccountsLogin}`;

  const loginRequest = ({body, headers,failOnStatusCode = true}) => {
    return cy.request({
      method: METHOD.POST,
      url: loginUrl,
      ...(body ? { body } : {}),
      ...(headers ? { headers } : {}),
      failOnStatusCode,
    });
  };

  it('Login as Standard Registry', { tags: ['smoke'] }, () => {
    loginRequest({
      body: { username: SRUsername, password: 'test' },
    }).then((response) => {
      expect(response.status).to.eq(STATUS_CODE.OK);
      expect(response.body).to.have.property('username', SRUsername);
      expect(response.body).to.have.property('role', 'STANDARD_REGISTRY');
      expect(response.body).to.have.property('did');
      expect(response.body).to.have.property('refreshToken');
    });
  });

  it('Login as User', () => {
    loginRequest({
      body: { username: UserUsername, password: 'test' },
    }).then((response) => {
      expect(response.status).to.eq(STATUS_CODE.OK);
      expect(response.body).to.have.property('username', UserUsername);
      expect(response.body).to.have.property('role', 'USER');
      expect(response.body).to.have.property('refreshToken');
    });
  });

  it.skip('Login as User with weakPassword', () => {
    loginRequest({
      body: { username: UserUsername, password: 'test' },
    }).then((response) => {
      expect(response.status).to.eq(STATUS_CODE.OK);
      expect(response.body).to.have.property('weakPassword', true);
    });
  });

  it('Login with sql injection - Negative', () => {
    loginRequest({
      headers: {
        username: 'select * from users where id = 1 or 1=1',
        password: 'test',
      },
      failOnStatusCode: false,
    }).should((response) => {
      expect(response.status).to.eql(STATUS_CODE.UNPROCESSABLE);
    });
  });

  it('Login with empty username - Negative', () => {
    loginRequest({
      headers: {
        username: '',
        password: 'test',
      },
      failOnStatusCode: false,
    }).then((response) => {
      expect(response.status).to.eql(STATUS_CODE.UNPROCESSABLE);
      expect(response.body.message.at(0)).to.eql('username should not be empty');
    });
  });

  it('Login with empty password - Negative', () => {
    loginRequest({
      headers: {
        username: 'StandardRegistry',
        password: '',
      },
      failOnStatusCode: false,
    }).then((response) => {
      expect(response.status).to.eql(STATUS_CODE.UNPROCESSABLE);
      expect(response.body.message.at(2)).to.eql('password should not be empty');
    });
  });
  
});
