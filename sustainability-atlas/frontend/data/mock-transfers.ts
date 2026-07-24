import type { Transfer } from '~/types/models';

export const MOCK_TRANSFERS: Transfer[] = [
    { id: '1', creditId: '1', projectId: '2', from: 'Wildlife Works', to: 'Climate Fund LLC', quantity: 600000, date: '2023-09-10', txHash: '0.0.48291-1694300000-000', status: 'Completed' },
    { id: '2', creditId: '1', projectId: '2', from: 'Climate Fund LLC', to: 'Microsoft Corp', quantity: 300000, date: '2023-11-20', txHash: '0.0.48291-1700400000-000', status: 'Completed' },
    { id: '3', creditId: '1', projectId: '2', from: 'Climate Fund LLC', to: 'Shell Energy', quantity: 200000, date: '2024-01-15', txHash: '0.0.48291-1705300000-000', status: 'Completed' },
    { id: '4', creditId: '2', projectId: '1', from: 'EcoAct', to: 'Unilever PLC', quantity: 50000, date: '2024-06-01', txHash: '0.0.48305-1717200000-000', status: 'Completed' },
    { id: '5', creditId: '2', projectId: '1', from: 'EcoAct', to: 'Nestlé SA', quantity: 40000, date: '2024-07-18', txHash: '0.0.48305-1721300000-000', status: 'Completed' },
    { id: '6', creditId: '4', projectId: '5', from: 'South Pole', to: 'Amazon Inc', quantity: 200000, date: '2024-02-28', txHash: '0.0.48520-1709100000-000', status: 'Completed' },
    { id: '7', creditId: '4', projectId: '5', from: 'South Pole', to: 'Google LLC', quantity: 150000, date: '2024-04-10', txHash: '0.0.48520-1712700000-000', status: 'Completed' },
    { id: '8', creditId: '7', projectId: '15', from: 'Wildlife Works', to: 'BP Carbon', quantity: 800000, date: '2022-08-22', txHash: '0.0.48802-1661100000-000', status: 'Completed' },
    { id: '9', creditId: '7', projectId: '15', from: 'BP Carbon', to: 'TotalEnergies', quantity: 400000, date: '2023-03-05', txHash: '0.0.48802-1677900000-000', status: 'Completed' },
    { id: '10', creditId: '9', projectId: '11', from: '3Degrees', to: 'Delta Airlines', quantity: 200000, date: '2024-01-20', txHash: '0.0.49001-1705700000-000', status: 'Completed' },
    { id: '11', creditId: '5', projectId: '3', from: 'ClimeCo', to: 'Walmart Inc', quantity: 30000, date: '2024-05-12', txHash: '0.0.48601-1715500000-000', status: 'Completed' },
    { id: '12', creditId: '3', projectId: '4', from: 'South Pole', to: 'Apple Inc', quantity: 100000, date: '2024-08-15', txHash: '0.0.48412-1723600000-000', status: 'Completed' },
    { id: '13', creditId: '6', projectId: '8', from: 'EcoAct', to: 'IKEA Foundation', quantity: 25000, date: '2025-04-01', txHash: '0.0.48715-1743400000-000', status: 'Pending' },
];
