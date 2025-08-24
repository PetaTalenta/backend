#!/usr/bin/env node

require('dotenv').config();
const axios = require('axios');

const BASE = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

(async () => {
  const ts = Date.now();
  const username = `smokeuser${ts}`;
  const email = `smoke_${ts}@example.com`;
  const password = 'Passw0rd1';

  const results = [];
  const record = (name, ok, extra) => {
    results.push({ name, ok, extra });
    console.log(`${ok ? '✅' : '❌'} ${name}${extra ? ' -> ' + JSON.stringify(extra) : ''}`);
  };

  try {
    // Register
    const reg = await axios.post(`${BASE}/auth/register`, { username, email, password });
    record('Register', reg.status === 201 && reg.data?.success === true);

    // Login with email
    const le = await axios.post(`${BASE}/auth/login`, { email, password });
    record('Login with email', le.status === 200 && le.data?.success === true && le.data?.data?.token);

    // Login with username
    const lu = await axios.post(`${BASE}/auth/login`, { username, password });
    record('Login with username', lu.status === 200 && lu.data?.success === true && lu.data?.data?.token);

    // Wrong password
    let lpErr;
    try {
      await axios.post(`${BASE}/auth/login`, { username, password: 'WrongPass1' });
    } catch (e) {
      lpErr = e.response;
    }
    record('Login wrong password', lpErr && lpErr.status === 401 && lpErr.data?.error?.code === 'INVALID_PASSWORD', lpErr?.data);

    // Wrong identifier
    let liErr;
    try {
      await axios.post(`${BASE}/auth/login`, { username: username + 'x', password });
    } catch (e) {
      liErr = e.response;
    }
    record('Login identifier not found', liErr && liErr.status === 404 && liErr.data?.error?.code === 'IDENTIFIER_NOT_FOUND', liErr?.data);

  } catch (err) {
    record('Unexpected error', false, { message: err.message, data: err.response?.data });
    process.exit(1);
  }

  const allOk = results.every(r => r.ok);
  if (!allOk) process.exit(2);
  process.exit(0);
})();

