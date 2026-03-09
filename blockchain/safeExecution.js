/**
 * blockchain/safeExecution.js
 * SafeExecution kontratı için EIP-712 imza ve etkileşim yardımcıları
 *
 * Kullanım: Kullanıcı Al/Sat butonuna bastığında, EIP-712 ile imza oluşturulur.
 * Kontrat bu imza olmadan işlem yapmaz.
 */

const ORDER_TYPE = {
  Buy: 0,
  Sell: 1,
};

const EIP712_DOMAIN = {
  name: 'SafeExecution',
  version: '1',
  chainId: null, // çağrıda set edilir
  verifyingContract: null, // kontrat adresi
};

const ORDER_TYPEHASH = 'Order(address user,uint8 action,uint256 amount,uint256 price,uint256 nonce,uint256 deadline)';

/**
 * EIP-712 domain separator için tip tanımı
 */
const EIP712_TYPES = {
  Order: [
    { name: 'user', type: 'address' },
    { name: 'action', type: 'uint8' },
    { name: 'amount', type: 'uint256' },
    { name: 'price', type: 'uint256' },
    { name: 'nonce', type: 'uint256' },
    { name: 'deadline', type: 'uint256' },
  ],
};

/**
 * Order için EIP-712 typed data oluşturur (MetaMask signTypedData_v4 ile kullanılır)
 * @param {Object} params
 * @param {string} params.user - Kullanıcı adresi
 * @param {number} params.action - 0=Al, 1=Sat
 * @param {string} params.amount - Wei cinsinden miktar (hex veya decimal string)
 * @param {string} params.price - Fiyat (hex veya decimal string)
 * @param {string} params.nonce - Nonce (decimal string)
 * @param {number} params.deadline - Unix timestamp
 * @param {number} params.chainId - Zincir ID
 * @param {string} params.verifyingContract - SafeExecution kontrat adresi
 */
export function buildOrderTypedData({
  user,
  action,
  amount,
  price,
  nonce,
  deadline,
  chainId,
  verifyingContract,
}) {
  const domain = {
    name: EIP712_DOMAIN.name,
    version: EIP712_DOMAIN.version,
    chainId: Number(chainId),
    verifyingContract,
  };

  const message = {
    user,
    action: action,
    amount: toHex(amount),
    price: toHex(price),
    nonce: toHex(nonce),
    deadline: toHex(deadline),
  };

  return {
    types: {
      EIP712Domain: [
        { name: 'name', type: 'string' },
        { name: 'version', type: 'string' },
        { name: 'chainId', type: 'uint256' },
        { name: 'verifyingContract', type: 'address' },
      ],
      Order: EIP712_TYPES.Order,
    },
    primaryType: 'Order',
    domain,
    message,
  };
}

/**
 * Kullanıcıdan EIP-712 order imzası alır
 * @param {object} provider - window.ethereum
 * @param {object} typedData - buildOrderTypedData çıktısı
 * @returns {Promise<string>} 0x ile başlayan imza
 */
export async function signOrder(provider, typedData) {
  const method = 'eth_signTypedData_v4';
  const [address] = await provider.request({ method: 'eth_accounts' });
  const signature = await provider.request({
    method,
    params: [address, JSON.stringify(typedData)],
  });
  return signature;
}

/**
 * Decimal/bigint -> hex string
 */
function toHex(value) {
  if (typeof value === 'string' && value.startsWith('0x')) return value;
  const n = BigInt(value);
  return '0x' + n.toString(16);
}

/**
 * Saniye cinsinden deadline (örn. 15 dakika = 900)
 */
export function getDeadline(secondsFromNow = 900) {
  return Math.floor(Date.now() / 1000) + secondsFromNow;
}

export { ORDER_TYPE };
