<?php
namespace UPBCientifica\Jwt;

use Firebase\JWT\JWT;
use Firebase\JWT\Key;

/**
 * Emisor y validador de JWT con firma RS256.
 * - La clave PRIVADA se usa para FIRMAR (solo en PHP/SOAP).
 * - La clave PÚBLICA se distribuye a los demás servidores.
 */
class JwtIssuer
{
    private string $privateKey;
    private string $publicKey;
    private int $expHours;

    public function __construct(
        string $privateKeyPath,
        string $publicKeyPath,
        int $expHours = 8
    ) {
        if (!file_exists($privateKeyPath)) {
            throw new \RuntimeException("Clave privada no encontrada: {$privateKeyPath}");
        }
        if (!file_exists($publicKeyPath)) {
            throw new \RuntimeException("Clave pública no encontrada: {$publicKeyPath}");
        }

        $this->privateKey = file_get_contents($privateKeyPath);
        $this->publicKey = file_get_contents($publicKeyPath);
        $this->expHours = $expHours;
    }

    /**
     * Firma un JWT con la clave privada (RS256).
     */
    public function issue(array $claims): string
    {
        $now = time();
        $payload = array_merge($claims, [
            'iss' => 'upb-cientifica-soap',
            'iat' => $now,
            'exp' => $now + ($this->expHours * 3600),
            'nbf' => $now,
        ]);

        return JWT::encode($payload, $this->privateKey, 'RS256');
    }

    /**
     * Valida un JWT con la clave pública.
     */
    public function validate(string $token): ?array
    {
        try {
            $decoded = JWT::decode($token, new Key($this->publicKey, 'RS256'));
            return (array) $decoded;
        } catch (\Exception $e) {
            error_log("JWT inválido: " . $e->getMessage());
            return null;
        }
    }

    public function getPublicKey(): string
    {
        return $this->publicKey;
    }

    public function getExpHours(): int
    {
        return $this->expHours;
    }
}