const {
    VcSubject
} = require("../../../dist/index");
const { expect, assert } = require('chai');

describe("VcSubject", function () {
    let data;

    before(async function () {
        data = {
            id: "f5630d9a-3c27-4ccc-a371-f4d30c2da4e1",
            date: "2021-10-13T11:21:47Z",
            amount: 2,
            period: 1,
            policyId: "6166be37d739af60e05258bf",
            accountId: "0.0.2770197",
        }
    });

    it('Test VcSubjectConstruction', async function () {
        const vcSubject = new VcSubject("MRV", data);
        assert.equal(vcSubject.getId(), "f5630d9a-3c27-4ccc-a371-f4d30c2da4e1");
        assert.equal(vcSubject.getType(), "MRV");
        assert.equal(vcSubject.getField("date"), "2021-10-13T11:21:47Z");
        assert.equal(vcSubject.getField("amount"), 2);
        assert.equal(vcSubject.getField("period"), 1);
        assert.equal(vcSubject.getField("policyId"), "6166be37d739af60e05258bf");
        assert.equal(vcSubject.getField("accountId"), "0.0.2770197");
    });

    it('TestVcSubjectConversion', async function () {
        const vcSubject = new VcSubject("MRV", data);
        const schemaContext = ["https://localhost/schema"];
        for (let i = 0; i < schemaContext.length; i++) {
            const element = schemaContext[i];
            vcSubject.addContext(element);
        }

        const json = vcSubject.toJSON();
        const newSubject = VcSubject.fromJson(json);

        assert.equal(vcSubject.getId(), newSubject.getId());
        assert.equal(vcSubject.getType(), newSubject.getType());
        assert.equal(vcSubject.getField("date"), newSubject.getField("date"));
        assert.equal(vcSubject.getField("amount"), newSubject.getField("amount"));
        assert.equal(vcSubject.getField("period"), newSubject.getField("period"));
        assert.equal(vcSubject.getField("policyId"), newSubject.getField("policyId"));
        assert.equal(vcSubject.getField("accountId"), newSubject.getField("accountId"));

        const root = vcSubject.toJsonTree();
        const newSubject2 = VcSubject.fromJsonTree(root);

        assert.equal(vcSubject.getId(), newSubject2.getId());
        assert.equal(vcSubject.getType(), newSubject2.getType());
        assert.equal(vcSubject.getField("date"), newSubject2.getField("date"));
        assert.equal(vcSubject.getField("amount"), newSubject2.getField("amount"));
        assert.equal(vcSubject.getField("period"), newSubject2.getField("period"));
        assert.equal(vcSubject.getField("policyId"), newSubject2.getField("policyId"));
        assert.equal(vcSubject.getField("accountId"), newSubject2.getField("accountId"));

        assert.deepEqual(root, {
            "@context": [
                "https://localhost/schema"
            ],
            "id": "f5630d9a-3c27-4ccc-a371-f4d30c2da4e1",
            "type": "MRV",
            "date": "2021-10-13T11:21:47Z",
            "amount": 2,
            "period": 1,
            "policyId": "6166be37d739af60e05258bf",
            "accountId": "0.0.2770197"
        });
    });
});