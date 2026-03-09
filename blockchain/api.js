/**
 * blockchain/api.js
 * Cüzdan verilerini blockchain explorer API'lerinden çeker
 *
 * Desteklenen: Etherscan, PolygonScan, BscScan, Arbiscan, Base, Optimism
 */

import {
  ETHERSCAN_API_KEY,
  ETHERSCAN_V2_API,
  NATIVE_SYMBOLS,
} from './config.js';

const TX_LIMIT = 10;
const TOKEN_TX_LIMIT = 10;

/**
 * Etherscan API V2 isteği
 * @param {string} chainId
 * @param {Record<string, string>} params
 * @returns {Promise<object>}
 */
function parseChainId(chainId) {
  if (!chainId) return '1';
  const str = String(chainId).trim();
  if (str.startsWith('0x') || str.startsWith('0X')) {
    return String(parseInt(str, 16) || 1);
  }
  return String(parseInt(str, 10) || 1);
}

async function fetchApi(chainId, params) {
  const id = parseChainId(chainId);

  const url = new URL(ETHERSCAN_V2_API);
  url.searchParams.set('chainid', id);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  if (ETHERSCAN_API_KEY) {
    url.searchParams.set('apikey', ETHERSCAN_API_KEY);
  }

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`API hatası: ${res.status}`);

  const data = await res.json();
  if (data.status === '0' || data.message === 'NOTOK') {
    const msg = typeof data.result === 'string' ? data.result : (data.message || 'API hatası');
    const msgLower = msg.toLowerCase();

    if (msgLower.includes('deprecated') || msgLower.includes('api key')) {
      throw new Error('Etherscan API V2 için api key gerekli. config.js içine ekleyin: etherscan.io/apidashboard');
    }
    if (msgLower.includes('no transactions found') || msgLower.includes('no token transfers found')) {
      return { status: '1', result: [] };
    }
    throw new Error(msg);
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
  const str = String(wei || '0').trim();
  if (!/^\d+$/.test(str)) return '0';
  const value = BigInt(str);
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
  const symbol = NATIVE_SYMBOLS[parseInt(chainId, 10)] || 'ETH';

  const [balanceRes, tokenRes] = await Promise.all([
    fetchApi(chainId, {
      module: 'account',
      action: 'balance',
      address,
      tag: 'latest',
    }),
    fetchApi(chainId, {
      module: 'account',
      action: 'tokentx',
      address,
      page: '1',
      offset: '50',
      sort: 'desc',
    }).catch(() => ({ result: [] })),
  ]);

  const balance = formatAmount(balanceRes.result || '0', 18);

  const tokenList = Array.isArray(tokenRes.result) ? tokenRes.result : [];
  const tokenMap = new Map();
  for (const tx of tokenList) {
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
  const symbol = NATIVE_SYMBOLS[parseInt(chainId, 10)] || 'ETH';
  const addr = address.toLowerCase();

  const [txRes, tokenRes] = await Promise.all([
    fetchApi(chainId, {
      module: 'account',
      action: 'txlist',
      address,
      startblock: '0',
      endblock: '99999999',
      page: '1',
      offset: String(TX_LIMIT),
      sort: 'desc',
    }),
    fetchApi(chainId, {
      module: 'account',
      action: 'tokentx',
      address,
      page: '1',
      offset: String(TOKEN_TX_LIMIT),
      sort: 'desc',
    }).catch(() => ({ result: [] })),
  ]);

  const txList = Array.isArray(txRes.result) ? txRes.result : [];
  const tokenTxList = Array.isArray(tokenRes.result) ? tokenRes.result : [];

  const normals = txList.map((tx) => ({
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

  const tokens = tokenTxList.map((tx) => ({
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
