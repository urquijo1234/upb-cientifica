<?php
namespace UPBCientifica\Server;

use UPBCientifica\Ldap\AdClient;
use UPBCientifica\Jwt\JwtIssuer;

class UserDirectoryServer
{
    private JwtIssuer $jwt;
    private AdClient $ad;

    public function __construct()
    {
        // Inicializar JwtIssuer con paths absolutos
        $baseDir = __DIR__ . '/../..';
        $privateKeyPath = $baseDir . '/' . ($_ENV['JWT_PRIVATE_KEY_PATH'] ?? '../../infrastructure/keys/jwt_private.pem');
        $publicKeyPath  = $baseDir . '/' . ($_ENV['JWT_PUBLIC_KEY_PATH']  ?? '../../infrastructure/keys/jwt_public.pem');

        $this->jwt = new JwtIssuer(
            realpath($privateKeyPath),
            realpath($publicKeyPath),
            (int)($_ENV['JWT_EXP_HOURS'] ?? 8)
        );

        $this->ad = new AdClient(
            host:   $_ENV['AD_HOST']      ?? '192.168.56.10',
            port:   (int)($_ENV['AD_PORT'] ?? 389),
            baseDn: $_ENV['AD_BASE_DN']    ?? 'DC=upbcientifica,DC=local',
            domain: $_ENV['AD_DOMAIN']     ?? 'upbcientifica.local'
        );
    }

    public function authenticate(object $params): object
    {
        $username = $params->credentials->username ?? '';
        $password = $params->credentials->password ?? '';

        if (empty($username) || empty($password)) {
            throw new \SoapFault('Client', 'Usuario y contraseña requeridos');
        }

        $user = $this->ad->authenticate($username, $password);
        if ($user === null) {
            throw new \SoapFault('Client', 'Credenciales inválidas');
        }

        $roles = $this->mapGroupsToRoles($user['groups']);

        // Emitir JWT con RS256
        $jwt = $this->jwt->issue([
            'sub'   => $user['uid'],
            'dn'    => $user['dn'],
            'email' => $user['email'],
            'roles' => $roles,
        ]);

        return (object)[
            'jwt'       => $jwt,
            'expiresAt' => date('c', time() + ($this->jwt->getExpHours() * 3600)),
            'userDn'    => $user['dn'],
            'roles'     => $roles,
        ];
    }

    public function validateToken(object $params): object
    {
        $decoded = $this->jwt->validate($params->jwt);

        if ($decoded === null) {
            return (object)[
                'valid' => false,
                'uid'   => '',
                'roles' => [],
            ];
        }

        return (object)[
            'valid' => true,
            'uid'   => $decoded['sub'] ?? '',
            'roles' => $decoded['roles'] ?? [],
        ];
    }

    // getUserProfile, createUser, mapGroupsToRoles, servicesForRoles
    // se quedan igual...

    public function getUserProfile(object $params): object
    {
        $uid = $params->uid ?? '';
        $this->ad->bindAsService($_ENV['AD_SERVICE_USER'], $_ENV['AD_SERVICE_PASS']);
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
            'quotaBytes'   => 5368709120,
            'homePath'     => "/home/{$user['uid']}",
            'gpgPublicKey' => '',
            'authorizedServices' => $this->servicesForRoles($roles),
        ];
    }

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
            'authorizedServices' => ['file_sync', 'shared_file', 'photo_album', 'streaming', 'mpi_jobs'],
        ];
    }

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