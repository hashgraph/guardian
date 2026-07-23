export interface SDG {
    id: number;
    name: string;
    color: string;
}

export const SDG_LIST: SDG[] = [
    { id: 1, name: 'No Poverty', color: '#E5243B' },
    { id: 2, name: 'Zero Hunger', color: '#DDA63A' },
    { id: 3, name: 'Good Health and Well-being', color: '#4C9F38' },
    { id: 4, name: 'Quality Education', color: '#C5192D' },
    { id: 5, name: 'Gender Equality', color: '#FF3A21' },
    { id: 6, name: 'Clean Water and Sanitation', color: '#26BDE2' },
    { id: 7, name: 'Affordable and Clean Energy', color: '#FCC30B' },
    { id: 8, name: 'Decent Work and Economic Growth', color: '#A21942' },
    { id: 9, name: 'Industry, Innovation and Infrastructure', color: '#FD6925' },
    { id: 10, name: 'Reduced Inequalities', color: '#DD1367' },
    { id: 11, name: 'Sustainable Cities and Communities', color: '#FD9D24' },
    { id: 12, name: 'Responsible Consumption and Production', color: '#BF8B2E' },
    { id: 13, name: 'Climate Action', color: '#3F7E44' },
    { id: 14, name: 'Life Below Water', color: '#0A97D9' },
    { id: 15, name: 'Life on Land', color: '#56C02B' },
    { id: 16, name: 'Peace, Justice and Strong Institutions', color: '#00689D' },
    { id: 17, name: 'Partnerships for the Goals', color: '#19486A' },
];

export function getSDG(id: number): SDG | undefined {
    return SDG_LIST.find(s => s.id === id);
}
