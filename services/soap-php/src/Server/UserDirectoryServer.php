<?php
namespace UPBCientifica\Server;

use Firebase\JWT\JWT;
use Firebase\JWT\Key;

class UserDirectoryServer
{
    // Clave secreta para JWT (en producción será RSA, por ahora HS256)
    private string $jwtSecret = 'upb-cientifica-dev-secret-change-me';
    private int $jwtExpHours = 8;

    // ====================================================
    // OPERACIÓN 1: authenticate
    // Recibe credenciales, valida contra AD (mock por ahora)
    // Retorna JWT
    // ====================================================
    public function authenticate(object $params): object
    {
        $username = $params->credentials->username ?? '';
        $password = $params->credentials->password ?? '';

        // --- MOCK: Simula validación contra AD ---
        // TODO: Reemplazar con ldap_bind() contra AD real
        $validUsers = [
            'admin'        => ['password' => 'admin123',   'role' => 'ADMIN'],
            'investigador' => ['password' => 'invest123',  'role' => 'RESEARCHER'],
            'estudiante'   => ['password' => 'estud123',   'role' => 'STUDENT'],
        ];

        if (!isset($validUsers[$username]) ||
            $validUsers[$username]['password'] !== $password) {
            throw new \SoapFault('Client', 'Credenciales inválidas');
        }

        $user = $validUsers[$username];
        $now = time();
        $payload = [
            'sub'   => $username,
            'roles' => [$user['role']],
            'iat'   => $now,
            'exp'   => $now + ($this->jwtExpHours * 3600),
        ];

        $jwt = JWT::encode($payload, $this->jwtSecret, 'HS256');

        return (object)[
            'jwt'       => $jwt,
            'expiresAt' => date('c', $payload['exp']),
            'userDn'    => "cn={$username},ou=Users,dc=upb-cientifica,dc=edu,dc=co",
            'roles'     => [$user['role']],
        ];
    }

    // ====================================================
    // OPERACIÓN 2: getUserProfile
    // ====================================================
    public function getUserProfile(object $params): object
    {
        $uid = $params->uid ?? '';

        // --- MOCK ---
        return (object)[
            'uid'          => $uid,
            'dn'           => "cn={$uid},ou=Users,dc=upb-cientifica,dc=edu,dc=co",
            'displayName'  => ucfirst($uid),
            'email'        => "{$uid}@upb.edu.co",
            'primaryGroup' => 'investigadores',
            'quotaBytes'   => 5368709120, // 5 GB
            'homePath'     => "/home/{$uid}",
            'gpgPublicKey' => '',
            'authorizedServices' => [
                'file_sync', 'shared_file', 'photo_album',
                'streaming', 'mpi_jobs'
            ],
        ];
    }

    // ====================================================
    // OPERACIÓN 3: createUser
    // ====================================================
    public function createUser(object $params): object
    {
        // --- MOCK: Simula creación en AD ---
        // TODO: Usar ldap_add() contra AD real
        return (object)[
            'uid'          => $params->uid,
            'dn'           => "cn={$params->uid},ou=Users,dc=upb-cientifica,dc=edu,dc=co",
            'displayName'  => $params->displayName,
            'email'        => $params->email,
            'primaryGroup' => $params->primaryGroup,
            'quotaBytes'   => $params->quotaBytes,
            'homePath'     => "/home/{$params->uid}",
            'gpgPublicKey' => '',
            'authorizedServices' => [
                'file_sync', 'shared_file', 'photo_album',
                'streaming', 'mpi_jobs'
            ],
        ];
    }

    // ====================================================
    // OPERACIÓN 4: validateToken
    // Los otros servidores (Node, Java, Go) llaman esto
    // para verificar que un JWT es válido
    // ====================================================
    public function validateToken(object $params): object
    {
        try {
            $decoded = JWT::decode(
                $params->jwt,
                new Key($this->jwtSecret, 'HS256')
            );
            return (object)[
                'valid' => true,
                'uid'   => $decoded->sub,
                'roles' => $decoded->roles ?? [],
            ];
        } catch (\Exception $e) {
            return (object)[
                'valid' => false,
                'uid'   => '',
                'roles' => [],
            ];
        }
    }
}