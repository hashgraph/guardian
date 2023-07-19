const BASE_URL = location.href + 'analytics';

document.addEventListener('DOMContentLoaded', () => {
    onInit();
})

async function onInit() {
    const createBtn = document.getElementById('create-btn');
    createBtn.addEventListener('click', async (event) => {
        event.preventDefault();
        renderStatus('load');
        await createReport();
        await load();
    });

    const updateBtn = document.getElementById('update-btn');
    updateBtn.addEventListener('click', async (event) => {
        event.preventDefault();
        renderStatus('load');
        const report = await loadReport();
        await updateReport(report.uuid);
        await load();
    });

    const exportBtn = document.getElementById('export-btn');
    exportBtn.addEventListener('click', async (event) => {
        event.preventDefault();
        renderStatus('load');
        const report = await loadReport();
        const fileBuffer = await exportInFile(report.uuid);
        
        // let downloadLink = document.createElement('a');
        // downloadLink.href = window.URL.createObjectURL(new Blob([new Uint8Array(fileBuffer)], {
        //     type: 'application/guardian-schema'
        // }));
        // downloadLink.setAttribute('download', `report_${Date.now()}.zip`);
        // document.body.appendChild(downloadLink);
        // downloadLink.click();
        // downloadLink.remove();

        const url = window.URL.createObjectURL(fileBuffer);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${Date.now()}.xlsx`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        await load();
    });

    await load();
}

async function load() {
    renderProgress();
    renderStatus('load');
    const report = await loadReport();
    if (!report) {
        renderStatus('none');
        return;
    }
    if (report.status === 'FINISHED') {
        const data = await loadReportData(report.uuid);
        renderReport(data);
        renderStatus('report');
        return;
    }
    if (report.status === 'ERROR') {
        renderStatus('error');
        return;
    }
    if (report.status === 'PROGRESS') {
        renderProgress(report);
        renderStatus('load');
        setTimeout(async () => {
            await load();
        }, 1000)
        return;
    }
    return;
}

async function createReport() {
    try {
        const result = await fetch(`${BASE_URL}/report`, {
            method: 'POST',
            mode: 'cors',
            cache: 'no-cache',
            credentials: 'same-origin',
            headers: {
                'Content-Type': 'application/json'
            },
            redirect: 'follow',
            referrerPolicy: 'no-referrer',
            body: null
        });
        if (result.status === 200) {
            const data = await result.json();
            return data;
        } else {
            return null;
        }
    } catch (error) {
        console.log(error);
    }
}

async function loadReport() {
    try {
        const result = await fetch(`${BASE_URL}/report`);
        if (result.status === 200) {
            const data = await result.json();
            return data;
        } else {
            return null;
        }
    } catch (error) {
        console.log(error);
    }
}

async function updateReport(uuid) {
    try {
        const result = await fetch(`${BASE_URL}/report/${uuid}`, {
            method: 'POST',
            mode: 'cors',
            cache: 'no-cache',
            credentials: 'same-origin',
            headers: {
                'Content-Type': 'application/json'
            },
            redirect: 'follow',
            referrerPolicy: 'no-referrer',
            body: null
        });
        if (result.status === 200) {
            const data = await result.json();
            return data;
        } else {
            return null;
        }
    } catch (error) {
        console.log(error);
    }
}

async function loadReportData(uuid) {
    try {
        const result = await fetch(`${BASE_URL}/report/${uuid}`);
        if (result.status === 200) {
            const data = await result.json();
            return data;
        } else {
            return null;
        }
    } catch (error) {
        console.log(error);
    }
}

async function exportInFile(uuid) {
    try {
        const result = await fetch(`${BASE_URL}/report/${uuid}/export/xlsx`, {
            responseType: 'blob'
        });
        if (result.status === 200) {
            const blob = await result.blob()
            return blob;
        } else {
            return null;
        }
    } catch (error) {
        console.log(error);
    }
}

function numberFormat(value) {
    if (!value) {
        return 0;
    }
    return parseInt(value, 10).toLocaleString()
}

function render(config) {
    const {
        standardRegistries,
        users,
        policies
    } = config;

    const container = document.getElementById('container');
    container.innerHTML = '';

    renderRow(container, 'StandardRegistries', standardRegistries.length);
    renderRow(container, 'Users', users.length);
    renderRow(container, 'Policies', policies.length);
}

function renderRow(container, name, value) {
    const row = document.createElement("div");
    row.className = `field`;

    const nameDiv = document.createElement("div");
    nameDiv.className = `field-name`;
    nameDiv.innerHTML = name;
    row.append(nameDiv);

    const valueDiv = document.createElement("div");
    valueDiv.className = `field-value`;
    valueDiv.innerHTML = value;
    row.append(valueDiv);

    container.append(row);
}

function renderReport(report) {
    document.getElementById('topics-count').innerHTML = numberFormat(report.topics);
    document.getElementById('standard-registries-count').innerHTML = numberFormat(report.standardRegistries);
    document.getElementById('users-count').innerHTML = numberFormat(report.users);
    document.getElementById('policies-count').innerHTML = numberFormat(report.policies);
    document.getElementById('instances-count').innerHTML = numberFormat(report.instances);
    document.getElementById('messages-count').innerHTML = numberFormat(report.messages);
    document.getElementById('modules-count').innerHTML = report.modules;
    document.getElementById('documents-count').innerHTML = numberFormat(report.documents);
    document.getElementById('vp-documents-count').innerHTML = numberFormat(report.vpDocuments);
    document.getElementById('f-tokens-count').innerHTML = numberFormat(report.fTokens);
    document.getElementById('nf-tokens-count').innerHTML = numberFormat(report.nfTokens);
    document.getElementById('ft-balances').innerHTML = numberFormat(report.fTotalBalances);
    document.getElementById('nft-balances').innerHTML = numberFormat(report.nfTotalBalances);
    document.getElementById('user-topic-count').innerHTML = numberFormat(report.userTopic);
    document.getElementById('schemas-count').innerHTML = numberFormat(report.schemas);
    document.getElementById('tags-count').innerHTML = numberFormat(report.tags);
    document.getElementById('revoke-count').innerHTML = numberFormat(report.revokeDocuments);

    renderRate(report.topPolicies, 'policies-rate');
    renderRate(report.topVersion, 'version-rate');
    renderRate(report.topSrByPolicies, 'policies-rate-by-owner');
    renderRate(report.topSrByUser, 'user-rate-by-owner');
    renderRate(report.topPoliciesByDocuments, 'policies-rate-by-documents');
    renderRate(report.topPoliciesByVP, 'policies-rate-by-vp');
    renderRate(report.topTokens, 'tokens-rate');

    renderRate(report.topFTokensByBalances, 'f-tokens-rate-by-balances');
    renderRate(report.topNFTokensByBalances, 'nf-tokens-rate-by-balances');
}

function renderRate(data, id) {
    const container = document.getElementById(id);
    container.innerHTML = '';
    for (const item of data) {
        const row = document.createElement("div");
        row.className = `report-rate-row`;
        const nameDiv = document.createElement("div");
        nameDiv.className = `report-rate-row-name`;
        nameDiv.innerHTML = item.name || '-';
        row.append(nameDiv);
        const valueDiv = document.createElement("div");
        valueDiv.className = `report-rate-row-value`;
        valueDiv.innerHTML = numberFormat(item.count);
        row.append(valueDiv);
        container.append(row);
    }
}

function renderStatus(status) {
    document.getElementById('load').classList.toggle('hide', status !== 'load');
    document.getElementById('error').classList.toggle('hide', status !== 'error');
    document.getElementById('report').classList.toggle('hide', status !== 'report');
}

function renderProgress(report) {
    if (!report) {
        document.getElementById('progress').innerHTML = '';
        return;
    }
    switch (report.steep) {
        case 'STANDARD_REGISTRY': {
            document.getElementById('progress').innerHTML = `Searching Standard Registries: ${report.progress} / ${report.maxProgress}`;
            break
        }
        case 'POLICIES': {
            document.getElementById('progress').innerHTML = `Searching Policies: ${report.progress} / ${report.maxProgress}`;
            break
        }
        case 'INSTANCES': {
            document.getElementById('progress').innerHTML = `Searching Instances: ${report.progress} / ${report.maxProgress}`;
            break
        }
        case 'TOKENS': {
            document.getElementById('progress').innerHTML = `Searching Tokens: ${report.progress} / ${report.maxProgress}`;
            break
        }
        case 'DOCUMENTS': {
            document.getElementById('progress').innerHTML = `Searching Documents: ${report.progress} / ${report.maxProgress}`;
            break
        }
        default: {
            document.getElementById('progress').innerHTML = `${report.progress} / ${report.maxProgress}`;
            break
        }
    }
}