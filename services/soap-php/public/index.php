<?php
error_reporting(E_ALL);
ini_set('display_errors', '1');
ini_set('display_startup_errors', '1');

// Depuración de carga
error_log("Cargando autoloader...");
require_once __DIR__ . '/../vendor/autoload.php';

error_log("Autoloader cargado. Instanciando servidor...");
// ... resto de tu código

use UPBCientifica\Server\UserDirectoryServer;

// Cargar variables de entorno
$dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/..');
$dotenv->safeLoad();

// Ruta al WSDL
$wsdlPath = __DIR__ . '/../../../contracts/wsdl/userdirectory/v1/UserDirectoryService.wsdl';

if (isset($_GET['wsdl'])) {
    header('Content-Type: text/xml');
    echo file_get_contents($wsdlPath);
    exit;
}

if ($_SERVER['REQUEST_URI'] === '/health') {
    header('Content-Type: application/json');
    echo json_encode(['status' => 'ok', 'service' => 'soap-php']);
    exit;
}

try {
    $server = new \SoapServer($wsdlPath, [
        'uri' => 'http://upb-cientifica.edu.co/soap/userdirectory/v1',
    ]);
    $server->setClass(UserDirectoryServer::class);
    $server->handle();
} catch (\Exception $e) {
    error_log("ERROR DE SOAP: " . $e->getMessage());
    echo $e->getMessage();
}