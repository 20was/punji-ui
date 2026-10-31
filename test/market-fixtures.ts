import type { Quote } from '../src/index.ts';

/** Illustrative NEPSE-style quotes in NPR. Not real market data. Prices are paisa (rupees × 100). */
const npr = (rupees: string): bigint => {
  const [whole, frac = ''] = rupees.split('.');
  return BigInt(whole!) * 100n + BigInt(frac.padEnd(2, '0').slice(0, 2));
};
export { npr };

export const QUOTES: Quote[] = [
  { symbol: 'NABIL', name: 'Nabil Bank Limited', sector: 'Commercial Banks', ltp: npr('512.30'), previousClose: npr('508.00'), volume: 184_320, turnover: npr('94412160.00'), history: [505, 507, 506, 509, 508, 511, 512.3], lowerLimit: npr('457.20'), upperLimit: npr('558.80') },
  { symbol: 'NTC', name: 'Nepal Telecom', sector: 'Telecommunication', ltp: npr('890.10'), previousClose: npr('902.50'), volume: 41_200, turnover: npr('36672120.00'), history: [905, 903, 899, 897, 893, 891, 890.1], lowerLimit: npr('812.25'), upperLimit: npr('992.75') },
  { symbol: 'HDL', name: 'Himalayan Distillery Limited', sector: 'Manufacturing And Processing', ltp: npr('1240.00'), previousClose: npr('1240.00'), volume: 6_150, turnover: npr('7626000.00'), history: [1238, 1240, 1239, 1241, 1240, 1240, 1240], lowerLimit: npr('1116.00'), upperLimit: npr('1364.00') },
  { symbol: 'NICA', name: 'NIC Asia Bank Limited', sector: 'Commercial Banks', ltp: npr('745.00'), previousClose: npr('731.80'), volume: 312_870, turnover: npr('233101150.00'), history: [728, 731, 733, 738, 741, 743, 745], lowerLimit: npr('658.62'), upperLimit: npr('804.98') },
  { symbol: 'UPPER', name: 'Upper Tamakoshi Hydropower', sector: 'Hydro Power', ltp: npr('245.52'), previousClose: npr('223.20'), volume: 1_204_500, turnover: npr('295734000.00'), history: [223.2, 228, 233, 239, 242, 244, 245.52], lowerLimit: npr('200.88'), upperLimit: npr('245.52') },
  { symbol: 'CIT', name: 'Citizen Investment Trust', sector: 'Investment', ltp: npr('2100.00'), previousClose: npr('2330.00'), volume: 2_840, turnover: npr('5964000.00'), history: [2330, 2290, 2250, 2200, 2160, 2120, 2100], lowerLimit: npr('2097.00'), upperLimit: npr('2563.00') },
  { symbol: 'SHIVM', name: 'Shivam Cements Limited', sector: 'Manufacturing And Processing', ltp: null, previousClose: npr('428.00'), volume: null, turnover: null },
  { symbol: 'ADBL', name: 'Agriculture Development Bank', sector: 'Commercial Banks', ltp: npr('318.40'), previousClose: npr('318.40'), volume: 98_700, turnover: npr('31426080.00'), history: [317, 318, 319, 318, 318.4] },
];

export const INDICES = [
  { id: 'nepse', name: 'NEPSE', value: 2712.45, previousValue: 2698.1, history: [2650, 2662, 2671, 2690, 2698.1, 2712.45] },
  { id: 'sensitive', name: 'Sensitive', value: 481.07, previousValue: 483.9, history: [486, 485, 484.2, 483.9, 481.07] },
  { id: 'float', name: 'Float', value: 168.33, previousValue: 168.33 },
  { id: 'banking', name: 'Banking', value: null, previousValue: 1210.2 },
];
