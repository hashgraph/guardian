
import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Checks from "../../../support/checkingMethods";
import * as Authorization from "../../../support/authorization";

context("Contracts", { tags: ["policy_labels", "formulas", "trustchains", "contracts", "firstPool", "all"] }, () => {
  const SRUsername = Cypress.env("SRUser");
  const UserUsername = Cypress.env("User");

  let contractIdR, contractUuidR, tokenId, policyId, hederaId, poolId, retireRequestId;

  const DEFAULT_TIMEOUT = 180000;
  const apiBase = API.ApiServer;

  const requestWithAuth = (username, req) => {
    return Authorization.getAccessToken(username).then((authorization) => {
      return cy.request({
        failOnStatusCode: req.failOnStatusCode ?? true,
        method: req.method,
        url: req.url,
        body: req.body,
        qs: req.qs,
        timeout: req.timeout ?? DEFAULT_TIMEOUT,
        headers: {
          ...(req.headers || {}),
          authorization,
        },
      });
    });
  };

  const getWithAuth = (username, url, qs) =>
    requestWithAuth(username, { method: METHOD.GET, url, qs });

  const expectUnauthorized = (req) => {
    return cy
      .request({
        ...req,
        failOnStatusCode: false,
      })
      .its("status")
      .should("eq", STATUS_CODE.UNAUTHORIZED);
  };

  const expectUnauthorizedWithHeader = (req, headerValue) => {
    return cy
      .request({
        ...req,
        headers: {
          ...(req.headers || {}),
          authorization: headerValue,
        },
        failOnStatusCode: false,
      })
      .its("status")
      .should("eq", STATUS_CODE.UNAUTHORIZED);
  };

  const getFirstRetireContract = (username) => {
    return requestWithAuth(username, {
      method: METHOD.GET,
      url: apiBase + API.ListOfContracts,
      qs: { type: "RETIRE" },
    }).then((response) => {
      expect(response.status).to.eq(STATUS_CODE.OK);
      const first = response.body && response.body[0];
      expect(first, "RETIRE contract exists").to.exist;
      return { id: first.id, uuid: first.contractId };
    });
  };

  const getPolicyIdByName = (username, policyName) => {
    return getWithAuth(username, apiBase + API.Policies).then((response) => {
      expect(response.status).to.eq(STATUS_CODE.OK);
      const p = (response.body || []).find((x) => x.name === policyName);
      expect(p, `Policy '${policyName}' exists`).to.exist;
      return p.id;
    });
  };

  const getTokenIdByPolicy = (username, pId) => {
    return getWithAuth(username, apiBase + API.ListOfTokens).then((response) => {
      expect(response.status).to.eq(STATUS_CODE.OK);
      const token = (response.body || []).find((t) => (t.policyIds && t.policyIds[0]) === pId);
      expect(token, `Token for policyId '${pId}' exists`).to.exist;
      return token.tokenId;
    });
  };

  const getHederaIdForUser = (username) => {
    return requestWithAuth(username, {
      method: METHOD.GET,
      url: apiBase + "profiles/" + username,
    }).then((response) => {
      expect(response.status).to.eq(STATUS_CODE.OK);
      return response.body.hederaAccountId;
    });
  };

  const getFirstRetirePoolId = (username) => {
    return getWithAuth(username, apiBase + API.RetirePools).then((response) => {
      expect(response.status).to.eq(STATUS_CODE.OK);
      const first = response.body && response.body[0];
      expect(first, "At least one retire pool exists").to.exist;
      return first.id;
    });
  };

  const createRetireRequest = (username, poolId, token, count, serials) => {
    return requestWithAuth(username, {
      method: METHOD.POST,
      url: apiBase + API.RetirePools + poolId + "/" + API.Retire,
      headers: { "Content-Type": "application/json" },
      body: [{ token, count, serials }],
    }).then((response) => {
      expect(response.status).to.eq(STATUS_CODE.OK);
      return response;
    });
  };

  const waitAndFetchRetireRequestForContract = (srUsername, contractUuid) => {
    return Authorization.getAccessToken(srUsername)
      .then((authorization) => {
        // polling you already have
        Checks.whileRetireRRequestCreating(contractUuid, authorization, 0);
      })
      .then(() => {
        return getWithAuth(srUsername, apiBase + API.RetireRequests, { contractId: contractUuid }).then((response) => {
          expect(response.status).to.eq(STATUS_CODE.OK);
          const rr = response.body && response.body[0];
          expect(rr, "Retire request exists").to.exist;
          return rr;
        });
      });
  };

  const approveRetireRequest = (username, rrId) =>
    requestWithAuth(username, {
      method: METHOD.POST,
      url: apiBase + API.RetireRequests + rrId + "/" + API.Approve,
    });

  const cancelRetireRequest = (username, rrId) =>
    requestWithAuth(username, {
      method: METHOD.DELETE,
      url: apiBase + API.RetireRequests + rrId + "/" + API.Cancel,
    });

  const unsetRetireRequest = (username, rrId) =>
    requestWithAuth(username, {
      method: METHOD.DELETE,
      url: apiBase + API.RetireRequests + rrId,
    });

  const setPoolForRetireContract = (username, retireContractId, token, count, immediately = true) =>
    requestWithAuth(username, {
      method: METHOD.POST,
      url: apiBase + API.RetireContract + retireContractId + "/" + API.PoolContract,
      body: {
        tokens: [{ token, count }],
        immediately,
      },
    });

  const getRetireRequests = (username, qs) => getWithAuth(username, apiBase + API.RetireRequests, qs);

  before("Create contracts, policy and register new user", () => {
    getFirstRetireContract(SRUsername).then(({ id, uuid }) => {
      contractIdR = id;
      contractUuidR = uuid;
    });

    getPolicyIdByName(SRUsername, "iRec_4").then((pid) => {
      policyId = pid;
      return getTokenIdByPolicy(SRUsername, policyId).then((tid) => {
        tokenId = tid;
      });
    });

    getHederaIdForUser(UserUsername).then((hid) => {
      hederaId = hid;
    });
  });

  describe("Create and cancel retire request", () => {
    it("Create retire request", () => {
      getFirstRetirePoolId(UserUsername)
        .then((pid) => {
          poolId = pid;
          return createRetireRequest(UserUsername, poolId, tokenId, 1, [1]);
        });

      waitAndFetchRetireRequestForContract(SRUsername, contractUuidR).then((rr) => {
        retireRequestId = rr.id;
        expect(rr.contractId).to.eq(contractUuidR);
        expect(rr.tokens && rr.tokens[0] && rr.tokens[0].token).to.eq(tokenId);
        expect(rr.tokens && rr.tokens[0] && rr.tokens[0].count).to.eq(1);
        expect(rr.user).to.eq(hederaId);
      });
    });

    it("Cancel retire request without auth token - Negative", () => {
      expectUnauthorized({
        method: METHOD.DELETE,
        url: apiBase + API.RetireRequests + retireRequestId,
      });
    });

    it("Cancel retire request with invalid auth token - Negative", () => {
      expectUnauthorizedWithHeader(
        {
          method: METHOD.DELETE,
          url: apiBase + API.RetireRequests + retireRequestId,
        },
        "Bearer wqe"
      );
    });

    it("Cancel retire request with empty auth token - Negative", () => {
      expectUnauthorizedWithHeader(
        {
          method: METHOD.DELETE,
          url: apiBase + API.RetireRequests + retireRequestId,
        },
        ""
      );
    });

    it("Cancel retire request", () => {
      cancelRetireRequest(UserUsername, retireRequestId).then((response) => {
        expect(response.status).to.eq(STATUS_CODE.OK);
      });
    });
  });

  describe("Create and unset retire request", () => {
    it("Create retire request", () => {
      getFirstRetirePoolId(UserUsername)
        .then((pid) => {
          poolId = pid;
          return createRetireRequest(UserUsername, poolId, tokenId, 1, [1]);
        })
        .then(() => waitAndFetchRetireRequestForContract(SRUsername, contractUuidR))
        .then((rr) => {
          retireRequestId = rr.id;
          expect(rr.contractId).to.eq(contractUuidR);
          expect(rr.tokens && rr.tokens[0] && rr.tokens[0].token).to.eq(tokenId);
          expect(rr.tokens && rr.tokens[0] && rr.tokens[0].count).to.eq(1);
          expect(rr.user).to.eq(hederaId);
        });
    });

    it("Unset retire request without auth token - Negative", () => {
      expectUnauthorized({
        method: METHOD.DELETE,
        url: apiBase + API.RetireRequests + retireRequestId,
      });
    });

    it("Unset retire request with invalid auth token - Negative", () => {
      expectUnauthorizedWithHeader(
        {
          method: METHOD.DELETE,
          url: apiBase + API.RetireRequests + retireRequestId,
        },
        "Bearer wqe"
      );
    });

    it("Unset retire request with empty auth token - Negative", () => {
      expectUnauthorizedWithHeader(
        {
          method: METHOD.DELETE,
          url: apiBase + API.RetireRequests + retireRequestId,
        },
        ""
      );
    });

    it("Unset retire request", () => {
      unsetRetireRequest(SRUsername, retireRequestId).then((response) => {
        expect(response.status).to.eq(STATUS_CODE.OK);
      });
    });
  });

  describe("Get retire request", () => {
    it("Create retire request", () => {
      getFirstRetirePoolId(UserUsername)
        .then((pid) => {
          poolId = pid;
          return createRetireRequest(UserUsername, poolId, tokenId, 1, [1]);
        })
        .then(() => waitAndFetchRetireRequestForContract(SRUsername, contractUuidR))
        .then((rr) => {
          retireRequestId = rr.id;
          expect(rr.contractId).to.eq(contractUuidR);
          expect(rr.tokens && rr.tokens[0] && rr.tokens[0].token).to.eq(tokenId);
          expect(rr.tokens && rr.tokens[0] && rr.tokens[0].count).to.eq(1);
          expect(rr.user).to.eq(hederaId);
        });
    });

    it("Get retire request", () => {
      getRetireRequests(SRUsername, { contractId: contractUuidR }).then((response) => {
        expect(response.status).to.eq(STATUS_CODE.OK);
        const rr = response.body && response.body[0];
        expect(rr.contractId).to.eq(contractUuidR);
        expect(rr.tokens && rr.tokens[0] && rr.tokens[0].token).to.eq(tokenId);
        expect(rr.tokens && rr.tokens[0] && rr.tokens[0].count).to.eq(1);
        expect(rr.user).to.eq(hederaId);
      });
    });

    it("Get all retire contracts requests", () => {
      getRetireRequests(SRUsername).then((response) => {
        expect(response.status).to.eq(STATUS_CODE.OK);
      });
    });

    it("Get all retire contracts requests without auth token - Negative", () => {
      expectUnauthorized({
        method: METHOD.GET,
        url: apiBase + API.RetireRequests,
      });
    });

    it("Get all retire contracts requests with invalid auth token - Negative", () => {
      expectUnauthorizedWithHeader(
        { method: METHOD.GET, url: apiBase + API.RetireRequests },
        "Bearer wqe"
      );
    });

    it("Get all retire contracts requests with empty auth token - Negative", () => {
      expectUnauthorizedWithHeader(
        { method: METHOD.GET, url: apiBase + API.RetireRequests },
        ""
      );
    });

    it("Get retire request without auth token - Negative", () => {
      expectUnauthorized({
        method: METHOD.GET,
        url: apiBase + API.RetireRequests,
        qs: { contractId: contractIdR },
      });
    });

    it("Get retire request with invalid auth token - Negative", () => {
      expectUnauthorizedWithHeader(
        {
          method: METHOD.GET,
          url: apiBase + API.RetireRequests,
          qs: { contractId: contractIdR },
        },
        "Bearer wqe"
      );
    });

    it("Get retire request with empty auth token - Negative", () => {
      expectUnauthorizedWithHeader(
        {
          method: METHOD.GET,
          url: apiBase + API.RetireRequests,
          qs: { contractId: contractIdR },
        },
        ""
      );
    });
  });

  describe("Approve retire request", () => {
    it("Approve retire request without auth token - Negative", () => {
      getRetireRequests(SRUsername, { contractId: contractUuidR }).then((response) => {
        expect(response.status).eql(STATUS_CODE.OK);
        retireRequestId = response.body.at(0).id;
        expectUnauthorized({
          method: METHOD.POST,
          url: apiBase + API.RetireRequests + retireRequestId + "/" + API.Approve,
        });
      })
    })

    it("Approve retire request with invalid auth token - Negative", () => {
      expectUnauthorizedWithHeader(
        {
          method: METHOD.POST,
          url: apiBase + API.RetireRequests + retireRequestId + "/" + API.Approve,
        },
        "Bearer wqe"
      );
    });

    it("Approve retire request with empty auth token - Negative", () => {
      expectUnauthorizedWithHeader(
        {
          method: METHOD.POST,
          url: apiBase + API.RetireRequests + retireRequestId + "/" + API.Approve,
        },
        ""
      );
    });

    it("Approve retire request", () => {
      approveRetireRequest(SRUsername, retireRequestId).then((response) => {
        expect(response.status).to.eq(STATUS_CODE.OK);
      })
    });
  })

  describe("Create and approve retire request without approve", () => {
    before("Set pool", () => {
      setPoolForRetireContract(SRUsername, contractIdR, tokenId, 2, true).then((response) => {
        expect(response.status).to.eq(STATUS_CODE.OK);
      });
    });

    it("Create retire request", () => {
      getFirstRetirePoolId(UserUsername).then((pid) => {
        poolId = pid;
        return createRetireRequest(UserUsername, poolId, tokenId, 2, [2, 3]);
      });
    });

    it("Create retire request without auth token - Negative", () => {
      expectUnauthorized({
        method: METHOD.POST,
        url: apiBase + API.RetirePools + poolId + "/" + API.Retire,
      });
    });

    it("Create retire request with invalid auth token - Negative", () => {
      expectUnauthorizedWithHeader(
        {
          method: METHOD.POST,
          url: apiBase + API.RetirePools + poolId + "/" + API.Retire,
        },
        "Bearer wqe"
      );
    });

    it("Create retire request with empty auth token - Negative", () => {
      expectUnauthorizedWithHeader(
        {
          method: METHOD.POST,
          url: apiBase + API.RetirePools + poolId + "/" + API.Retire,
        },
        ""
      );
    });

    it("Verify balance decreased", () => {
      getWithAuth(SRUsername, `${apiBase}${API.ListOfTokens}${tokenId}/${API.RelayerAccounts}${hederaId}/${API.Info}`).then((response) => {
        expect(response.status).to.eq(STATUS_CODE.OK);
        expect(response.body.balance).to.eq("7");
      });

      // TBD: optionally check retirement end status if API available
    });
  });
}
);