/**
 * blockchain/wallet.js
 * Cüzdan bağlantı modülü - MetaMask ve EVM uyumlu cüzdanlar
 *
 * Güvenlik notları:
 * - Özel anahtarlar asla okunmaz veya saklanmaz
 * - Kullanıcı onayı olmadan işlem imzalanmaz
 * - Adres sadece kesilmiş (truncated) formatta gösterilir
 */

const CHARS_SHORT = 6;

/**
 * Ethereum adresini kısa formata çevirir
 * @param {string} address - Tam adres
 * @returns {string} 0x1234...5678 formatı
 */
function truncateAddress(address) {
  if (!address || typeof address !== 'string') return '';
  const len = address.length;
  if (len < CHARS_SHORT * 2 + 2) return address;
  return `${address.slice(0, CHARS_SHORT + 2)}...${address.slice(-CHARS_SHORT)}`;
}

/**
 * MetaMask/EVM provider var mı kontrol eder
 * @returns {boolean}
 */
function hasProvider() {
  return typeof window !== 'undefined' && Boolean(window.ethereum);
}

/**
 * Cüzdana bağlanır
 * @returns {Promise<{ address: string } | { error: string }>}
 */
async function connect() {
  if (!hasProvider()) {
    return {
      error: 'Cüzdan bulunamadı. Lütfen MetaMask veya uyumlu bir cüzdan yükleyin.',
    };
  }

  try {
    const accounts = await window.ethereum.request({
      method: 'eth_requestAccounts',
    });

    if (!accounts || accounts.length === 0) {
      return { error: 'Bağlantı reddedildi.' };
    }

    const address = accounts[0];
    if (!isValidAddress(address)) {
      return { error: 'Geçersiz adres döndü.' };
    }

    return { address };
  } catch (err) {
    if (err.code === 4001) {
      return { error: 'Bağlantı kullanıcı tarafından reddedildi.' };
    }
    if (err.code === -32002) {
      return { error: 'Bağlantı bekleniyor. Lütfen cüzdanınızı kontrol edin.' };
    }
    return {
      error: err.message || 'Bağlantı sırasında bir hata oluştu.',
    };
  }
}

/**
 * Geçerli Ethereum adresi formatı kontrolü
 * @param {string} address
 * @returns {boolean}
 */
function isValidAddress(address) {
  if (!address || typeof address !== 'string') return false;
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Mevcut zincir ID'sini döndürür
 * @returns {Promise<string | null>}
 */
async function getChainId() {
  if (!hasProvider()) return null;
  try {
    const chainId = await window.ethereum.request({ method: 'eth_chainId' });
    return chainId ? String(parseInt(chainId, 16)) : null;
  } catch {
    return null;
  }
}

/**
 * Mevcut bağlı adresi döndürür (provider varsa)
 * @returns {Promise<string | null>}
 */
async function getAddress() {
  if (!hasProvider()) return null;

  try {
    const accounts = await window.ethereum.request({
      method: 'eth_accounts',
    });
    return accounts?.[0] ?? null;
  } catch {
    return null;
  }
}

/**
 * Hesap değişikliği dinleyicisi
 * @param {(address: string | null) => void} callback
 * @returns {() => void} Cleanup fonksiyonu
 */
function onAccountsChanged(callback) {
  if (!hasProvider()) return () => {};

  const handler = (accounts) => {
    const address = accounts?.[0] ?? null;
    callback(address);
  };

  window.ethereum.on('accountsChanged', handler);

  return () => {
    window.ethereum.removeListener?.('accountsChanged', handler);
  };
}

/**
 * Ağ (chain) değişikliği dinleyicisi
 * @param {(chainId: string) => void} callback
 * @returns {() => void} Cleanup fonksiyonu
 */
function onChainChanged(callback) {
  if (!hasProvider()) return () => {};

  const handler = (chainId) => {
    callback(chainId);
  };

  window.ethereum.on('chainChanged', handler);

  return () => {
    window.ethereum.removeListener?.('chainChanged', handler);
  };
}

export {
  connect,
  getAddress,
  getChainId,
  truncateAddress,
  hasProvider,
  isValidAddress,
  onAccountsChanged,
  onChainChanged,
};
