/**
 * frontend/js/app.js
 * Ana uygulama - grafik, cüzdan UI ve blockchain verileri
 */

import {
  connect,
  getAddress,
  getChainId,
  truncateAddress,
  hasProvider,
  onAccountsChanged,
  onChainChanged,
} from '../../blockchain/wallet.js';
import { getAssets, getTransactions } from '../../blockchain/api.js';
import { CHAIN_NAMES } from '../../blockchain/config.js';

// DOM
const walletBtn = document.getElementById('walletConnectBtn');
const walletText = walletBtn?.querySelector('.wallet-btn__text');
const walletDataSection = document.getElementById('walletDataSection');
const networkBadge = document.getElementById('networkBadge');
const assetsContent = document.getElementById('assetsContent');
const transactionsContent = document.getElementById('transactionsContent');

// Grafik verisi
const CANDLE_DATA = [
  { o: 0.25, c: 0.45, type: 'up' },
  { o: 0.45, c: 0.35, type: 'down' },
  { o: 0.35, c: 0.55, type: 'up' },
  { o: 0.55, c: 0.5, type: 'down' },
  { o: 0.5, c: 0.7, type: 'up' },
  { o: 0.7, c: 0.6, type: 'down' },
  { o: 0.6, c: 0.8, type: 'up' },
  { o: 0.8, c: 0.72, type: 'down' },
  { o: 0.72, c: 0.88, type: 'up' },
  { o: 0.88, c: 0.82, type: 'down' },
  { o: 0.82, c: 0.92, type: 'up' },
  { o: 0.92, c: 0.86, type: 'down' },
  { o: 0.86, c: 0.95, type: 'up' },
  { o: 0.95, c: 0.9, type: 'down' },
  { o: 0.9, c: 1, type: 'up' },
];

/**
 * Cüzdan verilerini yükler ve gösterir
 * @param {string} address
 */
async function loadWalletData(address) {
  if (!walletDataSection || !assetsContent || !transactionsContent) return;

  const chainId = await getChainId();
  const chainIdDec = chainId?.startsWith?.('0x') ? parseInt(chainId, 16) : parseInt(chainId || '1', 10);
  const networkName = CHAIN_NAMES[chainIdDec] || `Ağ ${chainIdDec}`;

  if (networkBadge) {
    networkBadge.textContent = `Ağ: ${networkName}`;
    networkBadge.style.display = 'block';
  }

  assetsContent.innerHTML = '<p class="wallet-data__loading">Yükleniyor...</p>';
  transactionsContent.innerHTML = '<p class="wallet-data__loading">Yükleniyor...</p>';

  try {
    const [assets, txList] = await Promise.all([
      getAssets(address, chainId || '1'),
      getTransactions(address, chainId || '1'),
    ]);

    // Varlıklar
    const assetItems = [
      { symbol: assets.symbol, balance: assets.balance },
      ...assets.tokens.map((t) => ({ symbol: t.symbol, balance: t.balance })),
    ].filter((a) => parseFloat(a.balance) > 0 || a.symbol === assets.symbol);

    if (assetItems.length === 0) {
      assetsContent.innerHTML = '<p class="wallet-data__empty">Varlık bulunamadı</p>';
    } else {
      assetsContent.innerHTML = assetItems
        .map(
          (a) => `
        <div class="asset-item">
          <span class="asset-item__symbol">${escapeHtml(a.symbol)}</span>
          <span class="asset-item__balance">${escapeHtml(a.balance)}</span>
        </div>
      `
        )
        .join('');
    }

    // İşlemler
    if (!txList || txList.length === 0) {
      transactionsContent.innerHTML = '<p class="wallet-data__empty">İşlem bulunamadı</p>';
    } else {
      transactionsContent.innerHTML = txList
        .map(
          (tx) => `
        <div class="tx-item">
          <div class="tx-item__left">
            <span class="tx-item__type tx-item__type--${tx.type}">
              ${tx.type === 'in' ? 'Alındı' : 'Gönderildi'}
            </span>
            <span class="tx-item__time">${escapeHtml(tx.timeFormatted)}</span>
          </div>
          <span class="tx-item__value">${escapeHtml(tx.value)} ${escapeHtml(tx.symbol)}</span>
        </div>
      `
        )
        .join('');
    }
  } catch (err) {
    assetsContent.innerHTML = `<p class="wallet-data__empty">Hata: ${escapeHtml(err.message)}</p>`;
    transactionsContent.innerHTML = `<p class="wallet-data__empty">Hata: ${escapeHtml(err.message)}</p>`;
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Cüzdan UI durumunu günceller
 * @param {string | null} address
 */
async function updateWalletUI(address) {
  if (!walletBtn || !walletText) return;

  if (address) {
    walletBtn.classList.add('wallet-btn--connected');
    walletText.textContent = truncateAddress(address);
    walletBtn.setAttribute('aria-label', 'Cüzdanı bağlantıyı kes');

    if (walletDataSection) {
      walletDataSection.classList.add('is-visible');
      walletDataSection.setAttribute('aria-hidden', 'false');
      loadWalletData(address);
    }
  } else {
    walletBtn.classList.remove('wallet-btn--connected');
    const label = hasProvider() ? 'cüzdan bağla' : 'cüzdan yok';
    walletText.textContent = label;
    walletBtn.setAttribute('aria-label', hasProvider() ? 'Cüzdan bağla' : 'Cüzdan bulunamadı');

    if (walletDataSection) {
      walletDataSection.classList.remove('is-visible');
      walletDataSection.setAttribute('aria-hidden', 'true');
      if (networkBadge) networkBadge.style.display = 'none';
      assetsContent.innerHTML = '<p class="wallet-data__empty">Cüzdan bağlayın</p>';
      transactionsContent.innerHTML = '<p class="wallet-data__empty">Cüzdan bağlayın</p>';
    }
  }
  walletBtn.disabled = false;
}

/**
 * Bağlan / Bağlantıyı kes toggle
 */
async function handleWalletClick() {
  if (!walletBtn) return;

  const currentAddress = await getAddress();

  if (currentAddress) {
    updateWalletUI(null);
    return;
  }

  walletBtn.disabled = true;
  const result = await connect();

  if (result.error) {
    alert(result.error);
    updateWalletUI(null);
    return;
  }

  updateWalletUI(result.address);
}

function initChart() {
  const chartEl = document.getElementById('chart');
  if (!chartEl) return;

  CANDLE_DATA.forEach((d) => {
    const div = document.createElement('div');
    div.className = `candle ${d.type}`;
    div.title = d.type === 'up' ? 'Yükseliş' : 'Düşüş';
    const bodyHeight = Math.max(Math.abs(d.c - d.o) * 100, 10);
    div.innerHTML = `<div class="candle-body" style="height: ${bodyHeight}%"></div>`;
    chartEl.appendChild(div);
  });
}

async function init() {
  initChart();

  const address = await getAddress();
  updateWalletUI(address);

  if (walletBtn) {
    walletBtn.addEventListener('click', handleWalletClick);
  }

  onAccountsChanged(updateWalletUI);
  onChainChanged(() => {
    getAddress().then(async (addr) => {
      updateWalletUI(addr);
      if (addr) loadWalletData(addr);
    });
  });
}

init();
