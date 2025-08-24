const axios = require('axios');

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://auth-service:3001';
const ARCHIVE_SERVICE_URL = process.env.ARCHIVE_SERVICE_URL || 'http://archive-service:3002';
const INTERNAL_SERVICE_KEY = process.env.INTERNAL_SERVICE_KEY || 'internal_service_secret_key_change_in_production';

const internalHeaders = (extra = {}) => ({
  'X-Internal-Service': 'true',
  'X-Service-Key': INTERNAL_SERVICE_KEY,
  'Content-Type': 'application/json',
  ...extra
});

const forward = async (baseUrl, path, opts, req, res) => {
  try {
    const url = `${baseUrl}${path}`;
    const method = opts.method || 'GET';
    const headers = opts.headers ? { ...internalHeaders(), ...opts.headers } : internalHeaders();

    const config = { method, url, headers, timeout: 15000 };
    if (opts.query) config.params = opts.query;
    if (opts.body) config.data = opts.body;

    const response = await axios(config);
    res.status(response.status).json(response.data);
  } catch (error) {
    const status = error.response?.status || 502;
    res.status(status).json({ success: false, error: { code: 'UPSTREAM_ERROR', message: error.response?.data?.error?.message || error.message } });
  }
};

const adminProxy = (path, opts, req, res) => forward(AUTH_SERVICE_URL, path, opts, req, res);
const usersProxy = (path, opts, req, res) => forward(ARCHIVE_SERVICE_URL, path, opts, req, res);
const tokenProxy = (path, opts, req, res) => forward(AUTH_SERVICE_URL, path, opts, req, res);

module.exports = { adminProxy, usersProxy, tokenProxy };

