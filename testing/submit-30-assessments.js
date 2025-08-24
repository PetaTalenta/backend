#!/usr/bin/env node

/**
 * Load test: submit 30 assessments concurrently via API Gateway
 * - Registers a fresh user
 * - Tops up token balance via internal service endpoint
 * - Submits 30 assessment payloads concurrently
 * - Prints a concise summary
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000/api';
const INTERNAL_SERVICE_KEY = process.env.INTERNAL_SERVICE_KEY || 'internal_service_secret_key_change_in_production';

async function jsonFetch(url, opts = {}) {
  const res = await fetch(url, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(opts.headers || {}),
    },
  });
  let body;
  try {
    body = await res.json();
  } catch (e) {
    body = { raw: await res.text() };
  }
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status} ${res.statusText}`);
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return body;
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateAssessment(seed = 0) {
  // Slightly vary scores to avoid idempotency duplicate hits
  const r = () => randInt(40, 95);
  return {
    assessmentName: 'AI-Driven Talent Mapping',
    riasec: {
      realistic: r(),
      investigative: r(),
      artistic: r(),
      social: r(),
      enterprising: r(),
      conventional: r(),
    },
    ocean: {
      openness: r(),
      conscientiousness: r(),
      extraversion: r(),
      agreeableness: r(),
      neuroticism: r(),
    },
    viaIs: {
      creativity: r(),
      curiosity: r(),
      judgment: r(),
      loveOfLearning: r(),
      perspective: r(),
      bravery: r(),
      perseverance: r(),
      honesty: r(),
      zest: r(),
      love: r(),
      kindness: r(),
      socialIntelligence: r(),
      teamwork: r(),
      fairness: r(),
      leadership: r(),
      forgiveness: r(),
      humility: r(),
      prudence: r(),
      selfRegulation: r(),
      appreciationOfBeauty: r(),
      gratitude: r(),
      hope: r(),
      humor: r(),
      spirituality: r(),
    },
  };
}

async function registerUser() {
  const email = `loadtest_${Date.now()}_${Math.floor(Math.random()*100000)}@example.com`;
  const password = 'AtmaTest123!'; // >=8 chars, letters+numbers
  const body = await jsonFetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  const { token, user } = body.data;
  return { token, user };
}

async function topUpTokenBalance(userId, amount = 1000) {
  const body = await jsonFetch(`${BASE_URL}/auth/token-balance`, {
    method: 'PUT',
    headers: {
      'X-Internal-Service': 'true',
      'X-Service-Key': INTERNAL_SERVICE_KEY,
    },
    body: JSON.stringify({ userId, amount, operation: 'add' }),
  });
  return body.data;
}

async function submitAssessment(token, idx) {
  const payload = generateAssessment(idx);
  const idk = `loadtest-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 8)}`;
  const res = await jsonFetch(`${BASE_URL}/assessment/submit`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'X-Idempotency-Key': idk,
    },
    body: JSON.stringify(payload),
  });
  return res.data; // expect { jobId, status, ... }
}

(async () => {
  const started = Date.now();
  console.log(`[INFO] Registering a fresh test user at ${BASE_URL} ...`);
  let userInfo;
  try {
    userInfo = await registerUser();
  } catch (e) {
    console.error('[ERROR] Failed to register user:', e.status, e.body || e.message);
    process.exit(1);
  }
  console.log(`[INFO] Registered user: ${userInfo.user.email} (${userInfo.user.id})`);

  console.log('[INFO] Topping up token balance via internal service ...');
  try {
    await topUpTokenBalance(userInfo.user.id, 2000);
  } catch (e) {
    console.error('[ERROR] Failed to top up token balance:', e.status, e.body || e.message);
    process.exit(1);
  }
  console.log('[INFO] Top up successful.');

  const CONCURRENCY = parseInt(process.env.COUNT || '30', 10);
  console.log(`[INFO] Submitting ${CONCURRENCY} assessments concurrently ...`);

  const tasks = Array.from({ length: CONCURRENCY }, (_, i) =>
    submitAssessment(userInfo.token, i).then(
      (data) => ({ ok: true, data }),
      (err) => ({ ok: false, err })
    )
  );

  const results = await Promise.allSettled(tasks);

  const successes = [];
  const failures = [];
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') {
      const v = r.value;
      if (v.ok) successes.push({ index: i, ...v.data });
      else failures.push({ index: i, error: v.err });
    } else {
      failures.push({ index: i, error: r.reason });
    }
  });

  console.log('--- Results Summary ---');
  console.log(`Total: ${CONCURRENCY}, Success: ${successes.length}, Fail: ${failures.length}`);
  if (successes.length) {
    console.log('Some jobIds:');
    successes.slice(0, 5).forEach((s) => console.log(`  [${s.index}] jobId=${s.jobId} status=${s.status}`));
  }
  if (failures.length) {
    console.log('Sample failures (first 5):');
    failures.slice(0, 5).forEach((f) => console.log(`  [${f.index}]`, f.error?.status || '', f.error?.body || String(f.error)));
  }

  const took = ((Date.now() - started) / 1000).toFixed(2);
  console.log(`[INFO] Done in ${took}s`);
})();

