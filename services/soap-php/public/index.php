<?php
require_once __DIR__ . '/../vendor/autoload.php';

use UPBCientifica\Server\UserDirectoryServer;

// Ruta al WSDL
$wsdlPath = __DIR__ . '/../../../contracts/wsdl/userdirectory/v1/UserDirectoryService.wsdl';

// Si piden el WSDL, servirlo directamente
if (isset($_GET['wsdl'])) {
    header('Content-Type: text/xml');
    echo file_get_contents($wsdlPath);
    exit;
}

// Health check
if ($_SERVER['REQUEST_URI'] === '/health') {
    header('Content-Type: application/json');
    echo json_encode(['status' => 'ok', 'service' => 'soap-php']);
    exit;
}

// Servidor SOAP
$server = new \SoapServer($wsdlPath, [
    'uri' => 'http://upb-cientifica.edu.co/soap/userdirectory/v1',
]);
$server->setClass(UserDirectoryServer::class);
$server->handle();