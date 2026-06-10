const axios = require('axios');

const BRIDGE_URL = process.env.RMI_BRIDGE_URL || 'http://localhost:7071';

/**
 * Construye headers con JWT.
 * El JWT viene del req.cookies.jwt en cada request.
 */
function headers(jwt) {
    return {
        'Authorization': `Bearer ${jwt}`,
        'Content-Type': 'application/json'
    };
}

async function submitJob(jobSpec, jwt) {
    const { data } = await axios.post(
        `${BRIDGE_URL}/jobs`,
        jobSpec,
        { headers: headers(jwt) }
    );
    return data;
}

async function getJobStatus(jobId, jwt) {
    const { data } = await axios.get(
        `${BRIDGE_URL}/jobs/${jobId}/status`,
        { headers: headers(jwt) }
    );
    return data;
}

async function getJobResult(jobId, jwt) {
    const { data } = await axios.get(
        `${BRIDGE_URL}/jobs/${jobId}/result`,
        { headers: headers(jwt) }
    );
    return data;
}

async function cancelJob(jobId, jwt) {
    const { data } = await axios.delete(
        `${BRIDGE_URL}/jobs/${jobId}`,
        { headers: headers(jwt) }
    );
    return data;
}

module.exports = { submitJob, getJobStatus, getJobResult, cancelJob };