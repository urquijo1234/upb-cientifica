<?php
namespace UPBCientifica\Server;

use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use UPBCientifica\Ldap\AdClient;

class UserDirectoryServer
{
    private string $jwtSecret;
    private int $jwtExpHours;
    private AdClient $ad;

    public function __construct()
    {
        // Cargar variables de entorno (las pone index.php antes de instanciar)
        $this->jwtSecret = $_ENV['JWT_SECRET'] ?? 'fallback-dev-secret';
        $this->jwtExpHours = (int)($_ENV['JWT_EXP_HOURS'] ?? 8);

        $this->ad = new AdClient(
            host:   $_ENV['AD_HOST']      ?? '192.168.56.10',
            port:   (int)($_ENV['AD_PORT'] ?? 389),
            baseDn: $_ENV['AD_BASE_DN']    ?? 'DC=upbcientifica,DC=local',
            domain: $_ENV['AD_DOMAIN']     ?? 'upbcientifica.local'
        );
    }

    // ====================================================
    // authenticate — AHORA CONTRA AD REAL
    // ====================================================
    public function authenticate(object $params): object
    {
        $username = $params->credentials->username ?? '';
        $password = $params->credentials->password ?? '';

        if (empty($username) || empty($password)) {
            throw new \SoapFault('Client', 'Usuario y contraseña requeridos');
        }

        // Validar contra AD
        $user = $this->ad->authenticate($username, $password);
        if ($user === null) {
            throw new \SoapFault('Client', 'Credenciales inválidas');
        }

        // Derivar roles desde los grupos AD
        $roles = $this->mapGroupsToRoles($user['groups']);

        // Emitir JWT
        $now = time();
        $payload = [
            'sub'   => $user['uid'],
            'dn'    => $user['dn'],
            'email' => $user['email'],
            'roles' => $roles,
            'iat'   => $now,
            'exp'   => $now + ($this->jwtExpHours * 3600),
        ];
        $jwt = JWT::encode($payload, $this->jwtSecret, 'HS256');

        return (object)[
            'jwt'       => $jwt,
            'expiresAt' => date('c', $payload['exp']),
            'userDn'    => $user['dn'],
            'roles'     => $roles,
        ];
    }

    // ====================================================
    // getUserProfile — AHORA BUSCA EN AD REAL
    // ====================================================
    public function getUserProfile(object $params): object
    {
        $uid = $params->uid ?? '';

        // Necesitamos bind de servicio primero
        $this->ad->bindAsService(
            $_ENV['AD_SERVICE_USER'],
            $_ENV['AD_SERVICE_PASS']
        );

        $user = $this->ad->findUser($uid);
        if ($user === null) {
            throw new \SoapFault('Client', "Usuario no encontrado: {$uid}");
        }

        $roles = $this->mapGroupsToRoles($user['groups']);
        $primaryGroup = !empty($user['groups']) ? $user['groups'][0] : 'Usuarios';

        return (object)[
            'uid'          => $user['uid'],
            'dn'           => $user['dn'],
            'displayName'  => $user['displayName'],
            'email'        => $user['email'],
            'primaryGroup' => $primaryGroup,
            'quotaBytes'   => 5368709120, // 5 GB por defecto
            'homePath'     => "/home/{$user['uid']}",
            'gpgPublicKey' => '',
            'authorizedServices' => $this->servicesForRoles($roles),
        ];
    }

    // ====================================================
    // createUser — TODO: usar samba-tool vía API REST
    // Por ahora deja el mock; la creación real se hace
    // por línea de comando en la VM del AD.
    // ====================================================
    public function createUser(object $params): object
    {
        return (object)[
            'uid'          => $params->uid,
            'dn'           => "CN={$params->displayName},OU=Investigadores,DC=upbcientifica,DC=local",
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
    // validateToken — Sigue igual, valida JWT
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

    // ====================================================
    // Helpers
    // ====================================================
    private function mapGroupsToRoles(array $groups): array
    {
        $roles = [];
        foreach ($groups as $g) {
            $g = strtolower($g);
            if ($g === 'investigadores')   $roles[] = 'RESEARCHER';
            if ($g === 'docentes')         $roles[] = 'TEACHER';
            if ($g === 'estudiantes')      $roles[] = 'STUDENT';
            if ($g === 'administradores' || $g === 'domain admins')
                $roles[] = 'ADMIN';
        }
        return array_values(array_unique($roles)) ?: ['USER'];
    }

    private function servicesForRoles(array $roles): array
    {
        $base = ['file_sync', 'shared_file', 'photo_album', 'streaming'];
        if (in_array('RESEARCHER', $roles) || in_array('TEACHER', $roles) ||
            in_array('ADMIN', $roles)) {
            $base[] = 'mpi_jobs';
        }
        return $base;
    }
}