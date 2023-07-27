"use strict";

const BASE_URL = location.href + 'analytics';

async function updateReport() {
    try {
        const result = await fetch(`${BASE_URL}/report/update`);
        if (result.status === 200) {
            const data = await result.json();
            return data;
        } else {
            return [];
        }
    } catch (error) {
        console.log(error);
        return [];
    }
}

async function loadReport() {
    try {
        const result = await fetch(`${BASE_URL}/report`);
        if (result.status === 200) {
            const data = await result.json();
            return data;
        } else {
            return [];
        }
    } catch (error) {
        console.log(error);
        return [];
    }
}

async function loadReports() {
    try {
        const result = await fetch(`${BASE_URL}/reports`);
        if (result.status === 200) {
            const data = await result.json();
            return data;
        } else {
            return [];
        }
    } catch (error) {
        console.log(error);
        return [];
    }
}

async function loadDashboards() {
    try {
        const result = await fetch(`${BASE_URL}/dashboards`);
        if (result.status === 200) {
            const data = await result.json();
            return data;
        } else {
            return [];
        }
    } catch (error) {
        console.log(error);
        return [];
    }
}

async function loadData(id) {
    try {
        if (!id) {
            return null;
        }
        const result = await fetch(`${BASE_URL}/dashboards/${id}`);
        if (result.status === 200) {
            const data = await result.json();
            return data;
        } else {
            return null;
        }
    } catch (error) {
        console.log(error);
        return null;
    }
}

async function exportInFile(uuid) {
    try {
        const result = await fetch(`${BASE_URL}/reports/${uuid}/export/xlsx`, {
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

export default {
    updateReport,
    loadReport,
    loadReports,
    loadDashboards,
    loadData,
    exportInFile
};