const axios = require('axios');

const BRIDGE_URL = process.env.RMI_BRIDGE_URL ||
    'http://localhost:7070';

async function submitJob(jobSpec) {
    const { data } = await axios.post(`${BRIDGE_URL}/jobs`, jobSpec);
    return data;
}

async function getJobStatus(jobId) {
    const { data } = await axios.get(`${BRIDGE_URL}/jobs/${jobId}/status`);
    return data;
}

async function getJobResult(jobId) {
    const { data } = await axios.get(`${BRIDGE_URL}/jobs/${jobId}/result`);
    return data;
}

async function cancelJob(jobId) {
    const { data } = await axios.delete(`${BRIDGE_URL}/jobs/${jobId}`);
    return data;
}

module.exports = { submitJob, getJobStatus, getJobResult, cancelJob };