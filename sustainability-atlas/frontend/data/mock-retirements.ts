import type { Retirement } from '~/types/models';

export const MOCK_RETIREMENTS: Retirement[] = [
    { id: '1', creditId: '1', projectId: '2', beneficiary: 'Microsoft Corp', quantity: 200000, date: '2024-03-15', txHash: '0.0.48291-1710400000-000', reason: 'Corporate carbon neutrality 2024', status: 'Completed' },
    { id: '2', creditId: '1', projectId: '2', beneficiary: 'Shell Energy', quantity: 100000, date: '2024-06-10', txHash: '0.0.48291-1717900000-000', reason: 'Voluntary offset program', status: 'Completed' },
    { id: '3', creditId: '4', projectId: '5', beneficiary: 'Amazon Inc', quantity: 120000, date: '2024-08-20', txHash: '0.0.48520-1724100000-000', reason: 'Climate Pledge commitment', status: 'Completed' },
    { id: '4', creditId: '4', projectId: '5', beneficiary: 'Google LLC', quantity: 80000, date: '2024-09-05', txHash: '0.0.48520-1725400000-000', reason: 'Net-zero operations 2024', status: 'Completed' },
    { id: '5', creditId: '7', projectId: '15', beneficiary: 'TotalEnergies', quantity: 250000, date: '2023-07-14', txHash: '0.0.48802-1689200000-000', reason: 'Regulatory compliance offset', status: 'Completed' },
    { id: '6', creditId: '7', projectId: '15', beneficiary: 'BP Carbon', quantity: 350000, date: '2023-09-28', txHash: '0.0.48802-1695800000-000', reason: 'Voluntary carbon market', status: 'Completed' },
    { id: '7', creditId: '2', projectId: '1', beneficiary: 'Unilever PLC', quantity: 30000, date: '2024-10-01', txHash: '0.0.48305-1727700000-000', reason: 'Scope 3 offsetting', status: 'Completed' },
    { id: '8', creditId: '9', projectId: '11', beneficiary: 'Delta Airlines', quantity: 150000, date: '2024-05-22', txHash: '0.0.49001-1716300000-000', reason: 'SAF credit retirement', status: 'Completed' },
    { id: '9', creditId: '5', projectId: '3', beneficiary: 'Walmart Inc', quantity: 15000, date: '2024-09-10', txHash: '0.0.48601-1725900000-000', reason: 'Project Gigaton', status: 'Completed' },
    { id: '10', creditId: '3', projectId: '4', beneficiary: 'Apple Inc', quantity: 50000, date: '2024-12-01', txHash: '0.0.48412-1733000000-000', reason: 'Carbon neutral product line', status: 'Completed' },
    { id: '11', creditId: '10', projectId: '6', beneficiary: 'Shopify', quantity: 20000, date: '2025-02-14', txHash: '0.0.49105-1739400000-000', reason: 'Sustainability fund allocation', status: 'Completed' },
    { id: '12', creditId: '11', projectId: '7', beneficiary: 'Netflix Inc', quantity: 80000, date: '2024-07-30', txHash: '0.0.49210-1722200000-000', reason: 'Environmental stewardship', status: 'Completed' },
];
