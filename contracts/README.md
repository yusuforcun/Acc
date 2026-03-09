# Safe Execution Kontratı

## Özet

- **EIP-712 imza**: Her işlem kullanıcı imzası gerektirir. AI hata yapsa bile imza olmadan işlem yapılamaz.
- **Harcama limiti (allowance)**: Kullanıcı sadece belirlediği miktara kadar onay verir.

## Derleme & Deploy (Hardhat)

```bash
# 1. Bağımlılıkları yükle
npm install

# 2. Derle
npm run compile

# 3. Lokal test ağına deploy (hızlı test için)
npx hardhat run scripts/deploy.js

# 4. Sepolia testnete deploy (opsiyonel)
PRIVATE_KEY=0x... RPC_URL=https://rpc.sepolia.org npx hardhat run scripts/deploy.js --network sepolia
```

Not: `PRIVATE_KEY` cüzdan özel anahtarınızdır. Asla paylaşmayın.

## Kontrat Arayüzü

| Fonksiyon | Açıklama |
|-----------|----------|
| `setAllowance(uint256 amount)` | Max harcama limiti (wei) belirle |
| `revokeAllowance()` | Limiti sıfırla |
| `executeOrder(action, amount, price, deadline, signature)` | İmzalı siparişi yürüt |
| `getNonce(address user)` | Frontend imza için nonce al |

## Frontend Akışı

1. Kullanıcı `setAllowance(amount)` ile limit belirler
2. Al/Sat tıklanınca: `buildOrderTypedData()` → `signOrder()` → `executeOrder(..., signature)`
3. Kontrat imzayı doğrular, limiti kontrol eder, işlemi yürütür
