context("Policies", { tags: '@policies' }, () => {
    const authorization = Cypress.env("authorization");

    it("should push create a new policy", () => {
        const nameTag = Math.floor(Math.random() * 999) + "test001";

        const urlPolicies = {
            method: "POST",
            url: Cypress.env("api_server") + "policies/push",
            body: {
                name: nameTag,
                description: nameTag,
                topicDescription: "",
                config: {
                    blockType: "interfaceContainerBlock",
                    id: "476cb893-1de6-4daa-aaec-b0ef3e556cab",
                    children: [
                        {
                            id: "bb2e5ee1-79e4-473d-b6d9-007bff6dd886",
                            tag: "Block4",
                            blockType: "interfaceContainerBlock",
                            defaultActive: true,
                            children: [
                                {
                                    id: "33a892f7-ad5b-45de-b512-9cff9448c5f3",
                                    tag: "Block2",
                                    blockType: "policyRolesBlock",
                                    defaultActive: true,
                                    children: [],
                                    permissions: ["NO_ROLE"],
                                    uiMetaData: { title: "Test" },
                                    roles: ["Test_role"],
                                },
                                {
                                    id: "8a164762-a4bc-45ad-b846-10dba5987915",
                                    tag: "Block5",
                                    blockType: "informationBlock",
                                    defaultActive: true,
                                    children: [],
                                    uiMetaData: {
                                        type: "text",
                                        title: "Test",
                                        description: "Test",
                                    },
                                    permissions: ["Test_role"],
                                },
                                {
                                    id: "bd348401-6955-4964-850e-6a5d6e0cfd32",
                                    tag: "Block6",
                                    blockType: "interfaceDocumentsSource",
                                    defaultActive: true,
                                    children: [
                                        {
                                            id: "ec4aff17-38a4-43d0-942a-eb107d0869da",
                                            tag: "Block7",
                                            blockType: "documentsSourceAddon",
                                            defaultActive: true,
                                            children: [],
                                            permissions: ["OWNER", "ANY_ROLE"],
                                            filters: [],
                                            dataType: "vc-documents",
                                        },
                                    ],
                                    permissions: ["OWNER", "ANY_ROLE"],
                                    uiMetaData: {
                                        fields: [
                                            {
                                                title: "",
                                                name: "document.id",
                                                tooltip: "",
                                                type: "text",
                                            },
                                        ],
                                    },
                                },
                                {
                                    id: "44973d3a-ac0f-43d5-8b2b-cea4a7290342",
                                    tag: "Block9",
                                    blockType: "interfaceStepBlock",
                                    defaultActive: true,
                                    children: [
                                        {
                                            id: "70a43732-3b6c-4eca-8f13-c02583878a6a",
                                            tag: "Block8",
                                            blockType: "requestVcDocument",
                                            defaultActive: true,
                                            children: [],
                                            permissions: ["OWNER", "ANY_ROLE"],
                                            uiMetaData: {
                                                privateFields: [],
                                                type: "page",
                                                title: "Test",
                                            },
                                        },
                                        {
                                            id: "d42c2739-dc87-46a4-8b6e-54beb6838293",
                                            tag: "Block10",
                                            blockType: "sendToGuardian",
                                            defaultActive: true,
                                            children: [],
                                            permissions: ["OWNER", "ANY_ROLE"],
                                            uiMetaData: {},
                                            dataType: "vc-documents",
                                            entityType: "test",
                                        },
                                    ],
                                    permissions: ["OWNER", "ANY_ROLE"],
                                    uiMetaData: {},
                                    cyclic: true,
                                },
                            ],
                            uiMetaData: { type: "tabs" },
                            permissions: ["OWNER", "ANY_ROLE"],
                        },
                    ],
                    uiMetaData: { type: "blank" },
                    permissions: ["ANY_ROLE"],
                    defaultActive: true,
                },
                owner: "did:hedera:testnet:CWfVb5bREzxcgAWuoJ1AMrFMvhJhcj9Ynv7HkNeSkxHF;hedera:testnet:fid=0.0.29515157",
                policyRoles: ["Test_role"],
                registeredUsers: {
                    "did:hedera:testnet:CWfVb5bREzxcgAWuoJ1AMrFMvhJhcj9Ynv7HkNeSkxHF;hedera:testnet:fid=0.0.29515157":
                        "Test_role",
                },
                topicId: "0.0.29592526",
                policyTag: nameTag,
            },
            headers: {
                authorization,
            },
            timeout: 600000,
        };

        cy.request(urlPolicies).should((response) => {
            expect(response.status).to.eq(201);
        });
    });
});
