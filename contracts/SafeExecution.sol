// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title SafeExecution
 * @dev Kullanıcı imzası (EIP-712) ve harcama limiti ile güvenli işlem yürütme.
 * AI hata yapsa bile, kullanıcının manuel imzası olmadan işlem gerçekleşmez.
 */
contract SafeExecution {
    // ============ EIP-712 ============
    bytes32 public constant ORDER_TYPEHASH = keccak256(
        "Order(address user,uint8 action,uint256 amount,uint256 price,uint256 nonce,uint256 deadline)"
    );
    bytes32 public immutable DOMAIN_SEPARATOR;

    uint8 public constant ACTION_BUY = 0;
    uint8 public constant ACTION_SELL = 1;

    // ============ State ============
    /// @dev user => max wei harcama limiti (onaylanan miktar)
    mapping(address => uint256) public allowance;

    /// @dev user => nonce (replay koruması)
    mapping(address => uint256) public nonces;

    // ============ Events ============
    event AllowanceSet(address indexed user, uint256 amount);
    event OrderExecuted(
        address indexed user,
        uint8 action,
        uint256 amount,
        uint256 price,
        uint256 nonce
    );

    constructor() {
        DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
                keccak256(bytes("SafeExecution")),
                keccak256(bytes("1")),
                block.chainid,
                address(this)
            )
        );
    }

    /**
     * @dev Harcama limiti belirle. Kullanıcı sadece bu miktara kadar onay verir.
     * @param amount Wei cinsinden max harcama limiti
     */
    function setAllowance(uint256 amount) external {
        allowance[msg.sender] = amount;
        emit AllowanceSet(msg.sender, amount);
    }

    /**
     * @dev Harcama limitini sıfırla
     */
    function revokeAllowance() external {
        allowance[msg.sender] = 0;
        emit AllowanceSet(msg.sender, 0);
    }

    /**
     * @dev EIP-712 Order hash hesapla
     */
    function _hashOrder(
        address user,
        uint8 action,
        uint256 amount,
        uint256 price,
        uint256 nonce,
        uint256 deadline
    ) internal view returns (bytes32) {
        return keccak256(
            abi.encodePacked(
                "\x19\x01",
                DOMAIN_SEPARATOR,
                keccak256(
                    abi.encode(
                        ORDER_TYPEHASH,
                        user,
                        action,
                        amount,
                        price,
                        nonce,
                        deadline
                    )
                )
            )
        );
    }

    /**
     * @dev İmza doğrula (EIP-712) - signer'ı geri döndür
     */
    function _recoverSigner(bytes32 hash, bytes memory signature) internal pure returns (address) {
        require(signature.length == 65, "SafeExecution: invalid sig length");
        bytes32 r;
        bytes32 s;
        uint8 v;
        assembly {
            r := mload(add(signature, 32))
            s := mload(add(signature, 64))
            v := byte(0, mload(add(signature, 96)))
        }
        if (v < 27) v += 27;
        require(v == 27 || v == 28, "SafeExecution: invalid v");
        return ecrecover(hash, v, r, s);
    }

    /**
     * @dev İmzalı siparişi yürüt. Sadece geçerli EIP-712 imzası ve yeterli limit ile çalışır.
     * @param action 0 = Al, 1 = Sat
     * @param amount İşlem miktarı (wei veya token birimi)
     * @param price Fiyat bilgisi (doğrulama / log için)
     * @param deadline İmzanın geçerlilik süresi (unix timestamp)
     * @param signature EIP-712 ile imzalanmış sipariş
     */
    function executeOrder(
        uint8 action,
        uint256 amount,
        uint256 price,
        uint256 deadline,
        bytes calldata signature
    ) external {
        require(block.timestamp <= deadline, "SafeExecution: expired");
        require(action == ACTION_BUY || action == ACTION_SELL, "SafeExecution: invalid action");
        require(amount > 0, "SafeExecution: amount zero");

        address signer = _recoverSigner(
            _hashOrder(msg.sender, action, amount, price, nonces[msg.sender], deadline),
            signature
        );
        require(signer == msg.sender, "SafeExecution: invalid signature");

        address user = msg.sender;
        require(allowance[user] >= amount, "SafeExecution: allowance exceeded");
        allowance[user] -= amount;

        uint256 currentNonce = nonces[user];
        nonces[user] = currentNonce + 1;

        // Burada swap/transfer mantığı eklenebilir (Uniswap vb.)
        emit OrderExecuted(user, action, amount, price, currentNonce);
    }

    /**
     * @dev Mevcut nonce'u döndür (frontend imza için kullanır)
     */
    function getNonce(address user) external view returns (uint256) {
        return nonces[user];
    }
}
