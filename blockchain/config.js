/**
 * blockchain/config.js
 * API ve ağ yapılandırması
 *
 * Etherscan API Key: https://etherscan.io/myapikey adresinden ücretsiz alınabilir.
 * Key olmadan da çalışır ancak istek limiti düşüktür.
 */

export const ETHERSCAN_API_KEY = ''; // Ücretsiz key: etherscan.io/myapikey

/** chainId -> Explorer API base URL */
export const EXPLORER_APIS = {
  1: 'https://api.etherscan.io/api',
  5: 'https://api-goerli.etherscan.io/api',
  11155111: 'https://api-sepolia.etherscan.io/api',
  137: 'https://api.polygonscan.com/api',
  56: 'https://api.bscscan.com/api',
  42161: 'https://api.arbiscan.io/api',
  10: 'https://api-optimistic.etherscan.io/api',
  8453: 'https://api.basescan.org/api',
};

export const CHAIN_NAMES = {
  1: 'Ethereum',
  5: 'Goerli',
  11155111: 'Sepolia',
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
  137: 'MATIC',
  56: 'BNB',
  42161: 'ETH',
  10: 'ETH',
  8453: 'ETH',
};
