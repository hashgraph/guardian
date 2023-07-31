'use strict';

import Card from './components/card/card.js';
import Loader from './components/loader/loader.js';
import Grid from './components/grid/grid.js';
import Dropdown from './components/dropdown/dropdown.js';
import ReportService from './services/report.service.js';

class App {
    container;
    loader;
    cardsContainer;
    gridContainer;

    constructor(container) {
        this.container = container;
        this.onInit();
    }

    async onInit() {
        const toolbar = document.createElement('div');
        toolbar.className = 'toolbar';
        container.append(toolbar);

        const cardsContainer = document.createElement('div');
        cardsContainer.className = 'cards-container';
        container.append(cardsContainer);

        const gridContainer = document.createElement('div');
        gridContainer.className = 'rate-container';
        container.append(gridContainer);

        const gridCard = document.createElement('div');
        gridCard.className = 'rate-card';
        gridContainer.append(gridCard);

        const gridToolbar = document.createElement('div');
        gridToolbar.className = 'rate-toolbar';
        gridCard.append(gridToolbar);

        const gridBody = document.createElement('div');
        gridBody.className = 'rate-body';
        gridCard.append(gridBody);

        this.loader = new Loader(document.body);
        this.cardsContainer = cardsContainer;
        this.gridContainer = gridBody;
        this.gridToolbar = gridToolbar;

        this.transactionCard = new Card(cardsContainer);
        this.transactionCard
            .setField('Transactions')
            .setLabel('All Transactions')
            .setSliders(['Topics', 'Messages'])
            .setValue([0, 0])
            .render();

        this.usersCard = new Card(cardsContainer);
        this.usersCard
            .setField('Users')
            .setLabel('Users')
            .setSliders(['All', 'Standard Registries', 'Users'])
            .setValue([0, 0, 0])
            .change(this.onSelectCard.bind(this))
            .render();

        this.tagsCard = new Card(cardsContainer);
        this.tagsCard
            .setField('Tags')
            .setLabel('Tags')
            .setValue([0])
            .change(this.onSelectCard.bind(this))
            .render();

        this.schemasCard = new Card(cardsContainer);
        this.schemasCard
            .setField('Schemas')
            .setLabel('Schemas')
            .setSliders(['All', 'System Schemas', 'User Schemas'])
            .setValue([0, 0])
            .change(this.onSelectCard.bind(this))
            .render();

        this.modulesCard = new Card(cardsContainer);
        this.modulesCard
            .setField('Modules')
            .setLabel('Modules')
            .setValue([0])
            .change(this.onSelectCard.bind(this))
            .render();

        this.policiesCard = new Card(cardsContainer);
        this.policiesCard
            .setField('Policies')
            .setLabel('Policies')
            .setSliders(['Policies', 'Versions'])
            .setValue([0, 0])
            .change(this.onSelectCard.bind(this))
            .render();

        this.userTopicsCard = new Card(cardsContainer);
        this.userTopicsCard
            .setField('UserTopics')
            .setLabel('User Topics')
            .setValue([0])
            .render();

        this.documentsCard = new Card(cardsContainer);
        this.documentsCard
            .setField('Documents')
            .setLabel('Documents')
            .setSliders(['All', 'DID', 'VC', 'VP'])
            .setValue([0, 0, 0, 0])
            .change(this.onSelectCard.bind(this))
            .render();

        this.revokeCard = new Card(cardsContainer);
        this.revokeCard
            .setField('RevokedDocuments')
            .setLabel('Revoked Documents')
            .setValue([0])
            .change(this.onSelectCard.bind(this))
            .render();

        this.tokensCard = new Card(cardsContainer);
        this.tokensCard
            .setField('Tokens')
            .setLabel('Tokens')
            .setSliders(['All', 'Fungible', 'Non-Fungible'])
            .setValue([0, 0, 0])
            .change(this.onSelectCard.bind(this))
            .render();

        this.mintedTokensCard = new Card(cardsContainer);
        this.mintedTokensCard
            .setField('MintedTokens')
            .setLabel('Minted tokens')
            .setSliders(['Fungible', 'Non-Fungible'])
            .setValue([0, 0])
            .change(this.onSelectCard.bind(this))
            .render();

        this.grid = new Grid(gridBody);

        this.dropdown = new Dropdown(gridToolbar)
            .setTitle('Type')
            .setData([])
            .render();

        this.dashboardsDropdown = new Dropdown(toolbar)
            .setTitle('Reports')
            .setData([])
            .render();

        const size = 10;
        this.gridList = [
            {
                name: `Top ${size} Standard Registries by policies`,
                value: 'topSRByPolicies',
                headers: [{
                    title: 'Standard Registry',
                    field: 'name'
                }, {
                    title: 'Policies',
                    field: 'value',
                    width: '200px'
                }]
            },
            {
                name: `Top ${size} Standard Registries by users`,
                value: 'topSRByUsers',
                headers: [{
                    title: 'Standard Registry',
                    field: 'name'
                }, {
                    title: 'Users',
                    field: 'value',
                    width: '200px'
                }]
            },
            {
                name: `Top ${size} Tags by label`,
                value: 'topTagsByLabel',
                headers: [{
                    title: 'Label',
                    field: 'name'
                }, {
                    title: 'Count',
                    field: 'value',
                    width: '200px'
                }]
            },
            {
                name: `Top ${size} All Schemas by name`,
                value: 'topAllSchemasByName',
                headers: [{
                    title: 'Schema Name',
                    field: 'name'
                }, {
                    title: 'Count',
                    field: 'value',
                    width: '200px'
                }]
            },
            {
                name: `Top ${size} System Schemas by name`,
                value: 'topSystemSchemasByName',
                headers: [{
                    title: 'Schema Name',
                    field: 'name'
                }, {
                    title: 'Count',
                    field: 'value',
                    width: '200px'
                }]
            },
            {
                name: `Top ${size} User Schemas by name`,
                value: 'topSchemasByName',
                headers: [{
                    title: 'Schema Name',
                    field: 'name'
                }, {
                    title: 'Count',
                    field: 'value',
                    width: '200px'
                }]
            },
            {
                name: `Top ${size} Modules by name`,
                value: 'topModulesByName',
                headers: [{
                    title: 'Module Name',
                    field: 'name'
                }, {
                    title: 'Count',
                    field: 'value',
                    width: '200px'
                }]
            },
            {
                name: `Top ${size} Policies by name`,
                value: 'topPoliciesByName',
                headers: [{
                    title: 'Policy Name',
                    field: 'name'
                }, {
                    title: 'Count',
                    field: 'value',
                    width: '200px'
                }]
            },
            {
                name: `Top ${size} Policy versions by name`,
                value: 'topVersionsByName',
                headers: [{
                    title: 'Policy Name',
                    field: 'name'
                }, {
                    title: 'Count',
                    field: 'value',
                    width: '200px'
                }]
            },
            {
                name: `Top ${size} Policies by all documents`,
                value: 'topPoliciesByDocuments',
                headers: [{
                    title: 'Policy Name',
                    field: 'name'
                }, {
                    title: 'Topic Id',
                    field: 'instanceTopicId'
                }, {
                    title: 'Documents',
                    field: 'value',
                    width: '200px'
                }]
            },
            {
                name: `Top ${size} Policies by DID documents`,
                value: 'topPoliciesByDID',
                headers: [{
                    title: 'Policy Name',
                    field: 'name'
                }, {
                    title: 'Topic Id',
                    field: 'instanceTopicId'
                }, {
                    title: 'Documents',
                    field: 'value',
                    width: '200px'
                }]
            },
            {
                name: `Top ${size} Policies by VC documents`,
                value: 'topPoliciesByVC',
                headers: [{
                    title: 'Policy Name',
                    field: 'name'
                }, {
                    title: 'Topic Id',
                    field: 'instanceTopicId'
                }, {
                    title: 'Documents',
                    field: 'value',
                    width: '200px'
                }]
            },
            {
                name: `Top ${size} Policies by VP documents`,
                value: 'topPoliciesByVP',
                headers: [{
                    title: 'Policy Name',
                    field: 'name'
                }, {
                    title: 'Topic Id',
                    field: 'instanceTopicId'
                }, {
                    title: 'Documents',
                    field: 'value',
                    width: '200px'
                }]
            },
            {
                name: `Top ${size} Policies by revoked documents`,
                value: 'topPoliciesByRevoked',
                headers: [{
                    title: 'Policy Name',
                    field: 'name'
                }, {
                    title: 'Topic Id',
                    field: 'instanceTopicId'
                }, {
                    title: 'Documents',
                    field: 'value',
                    width: '200px'
                }]
            },
            {
                name: `Top ${size} Tokens by name`,
                value: 'topTokensByName',
                headers: [{
                    title: 'Token Name',
                    field: 'name'
                }, {
                    title: 'Count',
                    field: 'value',
                    width: '200px'
                }]
            },
            {
                name: `Top ${size} Fungible Tokens by name`,
                value: 'topFTokensByName',
                headers: [{
                    title: 'Token Name',
                    field: 'name'
                }, {
                    title: 'Count',
                    field: 'value',
                    width: '200px'
                }]
            },
            {
                name: `Top ${size} Non-Fungible Tokens by name`,
                value: 'topNFTokensByName',
                headers: [{
                    title: 'Token Name',
                    field: 'name'
                }, {
                    title: 'Count',
                    field: 'value',
                    width: '200px'
                }]
            },
            {
                name: `Top ${size} Fungible tokens by balances`,
                value: 'topFTokensByBalance',
                headers: [{
                    title: 'Token Name',
                    field: 'name'
                }, {
                    title: 'Token Id',
                    field: 'tokenId'
                }, {
                    title: 'Balance',
                    field: 'value',
                    width: '200px'
                }]
            },
            {
                name: `Top ${size} Non-Fungible tokens by balances`,
                value: 'topNFTokensByBalance',
                headers: [{
                    title: 'Token Name',
                    field: 'name'
                }, {
                    title: 'Token Id',
                    field: 'tokenId'
                }, {
                    title: 'Balance',
                    field: 'value',
                    width: '200px'
                }]
            }
        ];

        const exportBtn = document.createElement('button');
        exportBtn.className = 'export-btn';
        exportBtn.textContent = 'Export';
        exportBtn.addEventListener('click', async (event) => {
            event.preventDefault();
            this.onExport();
        });
        toolbar.append(exportBtn);

        this.reportStatus = document.createElement('div');
        this.reportStatus.className = 'report-status';
        this.reportStatus.addEventListener('click', async (event) => {
            event.preventDefault();
            await this.loadStatus();
        });
        this.container.append(this.reportStatus);

        this.restartBtn = document.createElement('div');
        this.restartBtn.className = 'report-restart';
        this.restartBtn.addEventListener('click', async (event) => {
            event.preventDefault();
            await this.updateReport();
            await this.loadStatus();
        });
        this.container.append(this.restartBtn);

        await this.load();
        await this.loadStatus();
    }

    async load() {
        try {
            this.loader.show();
            this.dashboards = await ReportService.loadDashboards();
            this.container.classList.toggle('no-data', !this.dashboards.length);
            this.renderDashboards(this.dashboards);
            this.loader.hide();
            this.selectDashboard(this.dashboards[this.dashboards.length - 1]);
        } catch (error) {
            console.error(error);
            this.loader.hide();
        }
    }

    async loadStatus() {
        try {
            this.reportStatus.setAttribute('status', 'loading');
            this.reportStatus.setAttribute('title', 'Loading...');
            this.lastReport = await ReportService.loadReport();
            setTimeout(() => {
                const status = this.getReportStatus(this.lastReport);
                const step = this.getReportStep(this.lastReport);
                const date = this.getReportUpdateDate(this.lastReport);
                this.reportStatus.setAttribute('status', status);
                this.reportStatus.setAttribute('title', step);
                this.reportStatus.setAttribute('date', date);
            }, 500);
        } catch (error) {
            console.error(error);
            this.loader.hide();
        }
    }

    async updateReport() {
        try {
            this.reportStatus.setAttribute('status', 'loading');
            this.reportStatus.setAttribute('title', 'Loading...');
            await ReportService.updateReport();
        } catch (error) {
            console.error(error);
            this.loader.hide();
        }
    }

    async onExport() {
        this.loader.show();
        const fileBuffer = await ReportService.exportInFile(this.dashboard?.uuid);
        this.loader.hide();
        const url = window.URL.createObjectURL(fileBuffer);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${Date.now()}.xlsx`);
        document.body.appendChild(link);
        link.click();
        link.remove();
    }

    async selectDashboard(dashboard) {
        try {
            if (this.dashboard === dashboard) {
                return;
            }
            this.loader.show();
            this.dashboard = dashboard;
            const index = this.dashboards.findIndex(d => d === dashboard);
            const prev = this.dashboards[index - 1];
            const currentData = await ReportService.loadData(dashboard?.id);
            const prevData = await ReportService.loadData(prev?.id);
            this.renderReport(currentData, prevData);
            this.loader.hide();
        } catch (error) {
            console.error(error);
            this.loader.hide();
        }
    }

    onSelectCard(card, field, index) {
        switch (field) {
            case 'Users': {
                if (index === 0) {
                    this.dropdown.select('topSRByPolicies');
                } else if (index === 1) {
                    this.dropdown.select('topSRByPolicies');
                } else if (index === 2) {
                    this.dropdown.select('topSRByUsers');
                }
                break;
            }
            case 'Tags': {
                this.dropdown.select('topTagsByLabel');
                break;
            }
            case 'Schemas': {
                if (index === 0) {
                    this.dropdown.select('topAllSchemasByName');
                } else if (index === 1) {
                    this.dropdown.select('topSystemSchemasByName');
                } else if (index === 2) {
                    this.dropdown.select('topSchemasByName');
                }
                break;
            }
            case 'Modules': {
                this.dropdown.select('topModulesByName');
                break;
            }
            case 'Policies': {
                if (index === 0) {
                    this.dropdown.select('topPoliciesByName');
                } else if (index === 1) {
                    this.dropdown.select('topVersionsByName');
                }
                break;
            }
            case 'Documents': {
                if (index === 0) {
                    this.dropdown.select('topPoliciesByDocuments');
                } else if (index === 1) {
                    this.dropdown.select('topPoliciesByDID');
                } else if (index === 2) {
                    this.dropdown.select('topPoliciesByVC');
                } else if (index === 3) {
                    this.dropdown.select('topPoliciesByVP');
                }
                break;
            }
            case 'RevokedDocuments': {
                this.dropdown.select('topPoliciesByRevoked');
                break;
            }
            case 'Tokens': {
                if (index === 0) {
                    this.dropdown.select('topTokensByName');
                } else if (index === 1) {
                    this.dropdown.select('topFTokensByName');
                } else if (index === 2) {
                    this.dropdown.select('topNFTokensByName');
                }
                break;
            }
            case 'MintedTokens': {
                if (index === 0) {
                    this.dropdown.select('topFTokensByBalance');
                } else if (index === 1) {
                    this.dropdown.select('topNFTokensByBalance');
                }
                break;
            }
        }
    }

    renderDashboards(dashboards) {
        if (!dashboards.length) {
            return;
        }
        const data = dashboards.map(d => {
            return {
                name: d.date,
                value: d.id,
                data: d
            }
        })
        this.dashboardsDropdown
            .setData(data)
            .change((item) => {
                this.selectDashboard(item.data);
            })
            .render();
        this.dashboardsDropdown.select(dashboards[dashboards.length - 1].id);
    }

    renderReport(current, prev) {
        this.currentReport = current?.report;
        this.prevReport = prev?.report;
        if (!current) {
            this.prevReport = null;
        }
        if (prev && prev.root != current.root) {
            this.prevReport = null;
        }

        this.gridList.forEach(item => item.report = this.currentReport);

        this.dropdown
            .setData(this.gridList)
            .change((item) => {
                this.grid
                    .setHeader(item.headers)
                    .setData(item.report[item.value])
                    .render();
            })
            .render();


        if (this.prevReport) {
            this.transactionCard.setPrev([
                this.prevReport.topics,
                this.prevReport.messages
            ]);

            this.usersCard.setPrev([
                this.prevReport.standardRegistries + this.prevReport.users,
                this.prevReport.standardRegistries,
                this.prevReport.users
            ]);

            this.tagsCard.setPrev([
                this.prevReport.tags
            ]);

            this.schemasCard.setPrev([
                this.prevReport.systemSchemas + this.prevReport.schemas,
                this.prevReport.systemSchemas,
                this.prevReport.schemas
            ]);

            this.modulesCard.setPrev([
                this.prevReport.modules
            ]);

            this.policiesCard.setPrev([
                this.prevReport.policies,
                this.prevReport.instances
            ]);

            this.userTopicsCard.setPrev([
                this.prevReport.userTopic
            ]);

            this.documentsCard.setPrev([
                this.prevReport.documents,
                this.prevReport.didDocuments,
                this.prevReport.vcDocuments,
                this.prevReport.vpDocuments
            ]);

            this.revokeCard.setPrev([
                this.prevReport.revokeDocuments
            ]);

            this.tokensCard.setPrev([
                this.prevReport.fTokens + this.prevReport.nfTokens,
                this.prevReport.fTokens,
                this.prevReport.nfTokens
            ]);

            this.mintedTokensCard.setPrev([
                this.prevReport.fTotalBalances,
                this.prevReport.nfTotalBalances
            ]);
        }

        this.transactionCard.setValue([
            this.currentReport.topics,
            this.currentReport.messages
        ]).render();

        this.usersCard.setValue([
            this.currentReport.standardRegistries + this.currentReport.users,
            this.currentReport.standardRegistries,
            this.currentReport.users
        ]).render();

        this.tagsCard.setValue([
            this.currentReport.tags
        ]).render();

        this.schemasCard.setValue([
            this.currentReport.systemSchemas + this.currentReport.schemas,
            this.currentReport.systemSchemas,
            this.currentReport.schemas
        ]).render();

        this.modulesCard.setValue([
            this.currentReport.modules
        ]).render();

        this.policiesCard.setValue([
            this.currentReport.policies,
            this.currentReport.instances
        ]).render();

        this.userTopicsCard.setValue([
            this.currentReport.userTopic
        ]).render();

        this.documentsCard.setValue([
            this.currentReport.documents,
            this.currentReport.didDocuments,
            this.currentReport.vcDocuments,
            this.currentReport.vpDocuments
        ]).render();

        this.revokeCard.setValue([
            this.currentReport.revokeDocuments
        ]).render();

        this.tokensCard.setValue([
            this.currentReport.fTokens + this.currentReport.nfTokens,
            this.currentReport.fTokens,
            this.currentReport.nfTokens
        ]).render();

        this.mintedTokensCard.setValue([
            this.currentReport.fTotalBalances,
            this.currentReport.nfTotalBalances
        ]).render();

        this.dropdown
            .select('topSRByPolicies');
    }

    getReportStatus(report) {
        if (!report) {
            return 'none';
        }
        switch (report.status) {
            case 'PROGRESS':
                return 'progress';
            case 'FINISHED':
                return 'finished';
            case 'ERROR':
                return 'error';
            default:
                return 'none'
        }
    }

    getReportStep(report) {
        if (!report) {
            return '';
        }
        if (report.status === 'FINISHED') {
            return `Report updated: ${report.updateDate}`;
        }
        if (report.status === 'ERROR') {
            return `Error: ${report.error}`;
        }
        if (report.status !== 'PROGRESS') {
            return 'New report';
        }
        switch (report.steep) {
            case 'STANDARD_REGISTRY':
                return `Searching Standard Registries: ${report.progress} / ${report.maxProgress}`;
            case 'POLICIES':
                return `Searching Policies: ${report.progress} / ${report.maxProgress}`;
            case 'INSTANCES':
                return `Searching Instances: ${report.progress} / ${report.maxProgress}`;
            case 'TOKENS':
                return `Searching Tokens: ${report.progress} / ${report.maxProgress}`;
            case 'DOCUMENTS':
                return `Searching Documents: ${report.progress} / ${report.maxProgress}`;
            default:
                return `${report.progress} / ${report.maxProgress}`;
        }
    }

    getReportUpdateDate(report) {
        if (!report) {
            return '';
        }
        const date = new Date(report.updateDate)
        return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('container') || document.body;
    const app = new App(container);
})