<?php
namespace UPBCientifica\Ldap;

/**
 * Cliente LDAP para Active Directory (Samba AD).
 * Encapsula bind, búsqueda y autenticación contra AD.
 */
class AdClient
{
    private $connection = null;

    public function __construct(
        private string $host,         // ej: "192.168.56.10"
        private int    $port = 389,
        private string $baseDn = "DC=upbcientifica,DC=local",
        private string $domain = "upbcientifica.local"
    ) {}

    /**
     * Conectar a AD (sin bind aún)
     */
    private function connect(): void
    {
        if ($this->connection !== null) return;

        $this->connection = ldap_connect("ldap://{$this->host}:{$this->port}");
        if (!$this->connection) {
            throw new \RuntimeException("No se pudo conectar a AD en {$this->host}");
        }

        ldap_set_option($this->connection, LDAP_OPT_PROTOCOL_VERSION, 3);
        ldap_set_option($this->connection, LDAP_OPT_REFERRALS, 0);
        ldap_set_option($this->connection, LDAP_OPT_NETWORK_TIMEOUT, 5);
    }

    /**
     * Intenta autenticar con username + password.
     * Si tiene éxito, retorna el DN del usuario.
     * Si falla, retorna null.
     */
public function authenticate(string $username, string $password): ?array
{
    $this->connect();

    // Usaremos el formato DOMINIO\usuario que es más robusto en Samba AD
    $upn = "UPBCIENTIFICA\\" . $username;

    $bind = @ldap_bind($this->connection, $upn, $password);
    if (!$bind) {
        error_log("FALLO BIND PARA " . $upn . ": " . ldap_error($this->connection));
        return null;
    }

    return $this->findUser($username);
}

    /**
     * Busca un usuario por sAMAccountName y retorna sus atributos.
     */
    public function findUser(string $username): ?array
    {
        $this->connect();

        $filter = "(&(objectClass=user)(sAMAccountName={$username}))";
        $attrs = [
            'dn', 'cn', 'sAMAccountName', 'mail',
            'displayName', 'memberOf', 'distinguishedName',
            'givenName', 'sn'
        ];

        $result = @ldap_search($this->connection, $this->baseDn, $filter, $attrs);
        if (!$result) return null;

        $entries = ldap_get_entries($this->connection, $result);
        if ($entries['count'] === 0) return null;

        $e = $entries[0];

        // Extraer los grupos del campo memberOf
        $groups = [];
        if (isset($e['memberof'])) {
            for ($i = 0; $i < $e['memberof']['count']; $i++) {
                if (preg_match('/CN=([^,]+)/', $e['memberof'][$i], $m)) {
                    $groups[] = $m[1];
                }
            }
        }

        return [
            'uid'         => $e['samaccountname'][0] ?? $username,
            'dn'          => $e['dn'] ?? $e['distinguishedname'][0] ?? '',
            'displayName' => $e['displayname'][0] ?? ($e['cn'][0] ?? $username),
            'email'       => $e['mail'][0] ?? '',
            'givenName'   => $e['givenname'][0] ?? '',
            'surname'     => $e['sn'][0] ?? '',
            'groups'      => $groups,
        ];
    }

    /**
     * Bind con credenciales de servicio (para hacer búsquedas
     * sin requerir las credenciales del usuario final).
     */
    public function bindAsService(string $serviceUser, string $servicePass): bool
    {
        $this->connect();
        $upn = "{$serviceUser}@{$this->domain}";
        return @ldap_bind($this->connection, $upn, $servicePass);
    }

    public function close(): void
    {
        if ($this->connection) {
            ldap_unbind($this->connection);
            $this->connection = null;
        }
    }
}