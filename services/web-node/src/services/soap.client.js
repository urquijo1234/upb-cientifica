const soap = require('soap');

const WSDL_URL = process.env.SOAP_WSDL_URL ||
    'http://localhost:8080/?wsdl';

let soapClient = null;

async function getClient() {
    if (!soapClient) {
        soapClient = await soap.createClientAsync(WSDL_URL);
    }
    return soapClient;
}

async function authenticate(username, password) {
    const client = await getClient();
    const [result] = await client.authenticateAsync({
        credentials: { username, password }
    });
    return result;
}

async function getUserProfile(uid) {
    const client = await getClient();
    const [result] = await client.getUserProfileAsync({ uid });
    return result;
}

async function validateToken(jwt) {
    const client = await getClient();
    const [result] = await client.validateTokenAsync({ jwt });
    return result;
}

module.exports = { authenticate, getUserProfile, validateToken };