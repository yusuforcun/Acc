/**
 * blockchain/api.js
 * Cüzdan verilerini blockchain explorer API'lerinden çeker
 *
 * Desteklenen: Etherscan, PolygonScan, BscScan, Arbiscan, Base, Optimism
 */

import {
  ETHERSCAN_API_KEY,
  EXPLORER_APIS,
  NATIVE_SYMBOLS,
} from './config.js';

const TX_LIMIT = 10;
const TOKEN_TX_LIMIT = 10;

/**
 * Explorer API base URL'ini chainId'ye göre döndürür
 * @param {string} chainId
 * @returns {string | null}
 */
function getApiUrl(chainId) {
  const id = chainId ? parseInt(chainId, 10) : 1;
  return EXPLORER_APIS[id] ?? EXPLORER_APIS[1];
}

/**
 * API isteği atar
 * @param {string} baseUrl
 * @param {Record<string, string>} params
 * @returns {Promise<object>}
 */
async function fetchApi(baseUrl, params) {
  const url = new URL(baseUrl);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  if (ETHERSCAN_API_KEY) {
    url.searchParams.set('apikey', ETHERSCAN_API_KEY);
  }

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`API hatası: ${res.status}`);

  const data = await res.json();
  if (data.status === '0' && data.message?.toLowerCase().includes('error')) {
    throw new Error(data.result || data.message || 'API hatası');
  }
  return data;
}

/**
 * Wei'yi okunabilir formata çevirir
 * @param {string} wei
 * @param {number} decimals
 * @returns {string}
 */
function formatAmount(wei, decimals = 18) {
  const value = BigInt(wei);
  const divisor = BigInt(10 ** decimals);
  const whole = value / divisor;
  const frac = value % divisor;
  const fracStr = frac.toString().padStart(decimals, '0').slice(0, 6);
  if (fracStr === '000000') return whole.toString();
  return `${whole}.${fracStr}`.replace(/\.?0+$/, '');
}

/**
 * Unix timestamp'ı kısa tarihe çevirir
 * @param {string | number} ts
 * @returns {string}
 */
function formatTime(ts) {
  const date = new Date(parseInt(ts, 10) * 1000);
  const now = new Date();
  const diff = now - date;
  if (diff < 60000) return 'Az önce';
  if (diff < 3600000) return `${Math.floor(diff / 60000)} dk önce`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} saat önce`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)} gün önce`;
  return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
}

/**
 * Kullanıcının varlıklarını getirir (native + token transferlerinden türetilen)
 * @param {string} address
 * @param {string} chainId
 * @returns {Promise<{ balance: string, symbol: string, tokens: Array }>}
 */
export async function getAssets(address, chainId = '1') {
  const baseUrl = getApiUrl(chainId);
  const symbol = NATIVE_SYMBOLS[parseInt(chainId, 10)] || 'ETH';

  const [balanceRes, tokenRes] = await Promise.all([
    fetchApi(baseUrl, {
      module: 'account',
      action: 'balance',
      address,
      tag: 'latest',
    }),
    fetchApi(baseUrl, {
      module: 'account',
      action: 'tokentx',
      address,
      page: '1',
      offset: String(50),
      sort: 'desc',
    }).catch(() => ({ result: [] })),
  ]);

  const balance = formatAmount(balanceRes.result || '0', 18);

  const tokenMap = new Map();
  for (const tx of tokenRes.result || []) {
    const key = tx.contractAddress?.toLowerCase();
    if (!key) continue;
    const dec = parseInt(tx.tokenDecimal || '18', 10);
    const amt = BigInt(tx.value || '0');
    const isIn = tx.to?.toLowerCase() === address.toLowerCase();
    const cur = tokenMap.get(key) || { symbol: tx.tokenSymbol || '?', amount: 0n };
    cur.amount += isIn ? amt : -amt;
    tokenMap.set(key, cur);
  }

  const tokens = [];
  tokenMap.forEach((v, addr) => {
    if (v.amount > 0n) {
      tokens.push({
        address: addr,
        symbol: v.symbol,
        balance: formatAmount(v.amount.toString(), 18),
      });
    }
  });

  return { balance, symbol, tokens };
}

/**
 * Son işlemleri getirir (normal + token)
 * @param {string} address
 * @param {string} chainId
 * @returns {Promise<Array>}
 */
export async function getTransactions(address, chainId = '1') {
  const baseUrl = getApiUrl(chainId);
  const symbol = NATIVE_SYMBOLS[parseInt(chainId, 10)] || 'ETH';
  const addr = address.toLowerCase();

  const [txRes, tokenRes] = await Promise.all([
    fetchApi(baseUrl, {
      module: 'account',
      action: 'txlist',
      address,
      startblock: '0',
      endblock: '99999999',
      page: '1',
      offset: String(TX_LIMIT),
      sort: 'desc',
    }),
    fetchApi(baseUrl, {
      module: 'account',
      action: 'tokentx',
      address,
      page: '1',
      offset: String(TOKEN_TX_LIMIT),
      sort: 'desc',
    }).catch(() => ({ result: [] })),
  ]);

  const normals = (txRes.result || []).map((tx) => ({
    hash: tx.hash,
    time: tx.timeStamp,
    timeFormatted: formatTime(tx.timeStamp),
    type: tx.from?.toLowerCase() === addr ? 'out' : 'in',
    value: formatAmount(tx.value || '0', 18),
    symbol,
    to: tx.to,
    from: tx.from,
    isToken: false,
  }));

  const tokens = (tokenRes.result || []).map((tx) => ({
    hash: tx.hash,
    time: tx.timeStamp,
    timeFormatted: formatTime(tx.timeStamp),
    type: tx.to?.toLowerCase() === addr ? 'in' : 'out',
    value: formatAmount(tx.value || '0', parseInt(tx.tokenDecimal || '18', 10)),
    symbol: tx.tokenSymbol || '?',
    to: tx.to,
    from: tx.from,
    isToken: true,
  }));

  const merged = [...normals, ...tokens]
    .sort((a, b) => parseInt(b.time, 10) - parseInt(a.time, 10))
    .slice(0, TX_LIMIT);

  return merged;
}
