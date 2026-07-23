import type { Credit } from '~/types/models';

export const MOCK_CREDITS: Credit[] = [
    { id: '1', tokenId: '0.0.48291', name: 'VCS Carbon Credit', symbol: 'VCU', type: 'Fungible', supply: 1200000, projectId: '2', registry: 'Verra', mintDate: '2023-07-15' },
    { id: '2', tokenId: '0.0.48305', name: 'GS Emission Reduction', symbol: 'GER', type: 'Fungible', supply: 125000, projectId: '1', registry: 'Gold Standard', mintDate: '2024-04-01' },
    { id: '3', tokenId: '0.0.48412', name: 'Blue Carbon Credit', symbol: 'BCC', type: 'Non-Fungible', supply: 340000, projectId: '4', registry: 'Verra', mintDate: '2024-05-10' },
    { id: '4', tokenId: '0.0.48520', name: 'CAR Offset Credit', symbol: 'CRT', type: 'Fungible', supply: 520000, projectId: '5', registry: 'Verra', mintDate: '2023-10-20' },
    { id: '5', tokenId: '0.0.48601', name: 'Cookstove Credit', symbol: 'CSC', type: 'Non-Fungible', supply: 85000, projectId: '3', registry: 'Gold Standard', mintDate: '2024-02-14' },
    { id: '6', tokenId: '0.0.48715', name: 'SDW Credit', symbol: 'SDW', type: 'Fungible', supply: 67000, projectId: '8', registry: 'Gold Standard', mintDate: '2025-02-20' },
    { id: '7', tokenId: '0.0.48802', name: 'Forest Carbon Unit', symbol: 'FCU', type: 'Fungible', supply: 1800000, projectId: '15', registry: 'Verra', mintDate: '2022-05-30' },
    { id: '8', tokenId: '0.0.48910', name: 'Peatland Credit', symbol: 'PLC', type: 'Non-Fungible', supply: 890000, projectId: '13', registry: 'Verra', mintDate: '2024-08-12' },
    { id: '9', tokenId: '0.0.49001', name: 'Landfill Gas Credit', symbol: 'LGC', type: 'Fungible', supply: 450000, projectId: '11', registry: 'CAR', mintDate: '2023-09-05' },
    { id: '10', tokenId: '0.0.49105', name: 'Biochar Credit', symbol: 'BCR', type: 'Non-Fungible', supply: 42000, projectId: '6', registry: 'Verra', mintDate: '2025-01-18' },
    { id: '11', tokenId: '0.0.49210', name: 'Mangrove Credit', symbol: 'MCC', type: 'Non-Fungible', supply: 180000, projectId: '7', registry: 'Verra', mintDate: '2024-03-22' },
    { id: '12', tokenId: '0.0.49311', name: 'Reforestation Unit', symbol: 'RFU', type: 'Fungible', supply: 210000, projectId: '10', registry: 'Verra', mintDate: '2023-12-10' },
    { id: '13', tokenId: '0.0.49420', name: 'Geothermal Credit', symbol: 'GTC', type: 'Fungible', supply: 150000, projectId: '18', registry: 'ACR', mintDate: '2023-11-15' },
    { id: '14', tokenId: '0.0.49515', name: 'Biomass Credit', symbol: 'BMC', type: 'Fungible', supply: 95000, projectId: '16', registry: 'Verra', mintDate: '2024-09-01' },
    { id: '15', tokenId: '0.0.49620', name: 'Clean Water Credit', symbol: 'CWC', type: 'Fungible', supply: 33000, projectId: '17', registry: 'Gold Standard', mintDate: '2025-03-10' },
];
