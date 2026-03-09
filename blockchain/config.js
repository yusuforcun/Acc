/**
 * blockchain/config.js
 * API ve ağ yapılandırması
 *
 * Etherscan API V2 - Tek API key ile 60+ zincir
 * Ücretsiz key: https://etherscan.io/apidashboard
 * V2 için API key zorunludur.
 */

export const ETHERSCAN_API_KEY = 'TT915PU3K5FEIPCHHMXUJUFFNMZWRDD3D9'; // etherscan.io/apidashboard

/** Etherscan API V2 - tek endpoint, chainid ile zincir seçilir */
export const ETHERSCAN_V2_API = 'https://api.etherscan.io/v2/api';

export const CHAIN_NAMES = {
  1: 'Ethereum',
  5: 'Goerli',
  11155111: 'Sepolia',
  97: 'BSC Testnet',
  80002: 'Polygon Amoy',
  84532: 'Base Sepolia',
  421614: 'Arbitrum Sepolia',
  11155420: 'OP Sepolia',
  137: 'Polygon',
  56: 'BSC',
  42161: 'Arbitrum',
  10: 'Optimism',
  8453: 'Base',
};

export const NATIVE_SYMBOLS = {
  1: 'ETH',
  5: 'ETH',
  11155111: 'ETH',
  97: 'tBNB',
  80002: 'MATIC',
  84532: 'ETH',
  421614: 'ETH',
  11155420: 'ETH',
  137: 'MATIC',
  56: 'BNB',
  42161: 'ETH',
  10: 'ETH',
  8453: 'ETH',
};
