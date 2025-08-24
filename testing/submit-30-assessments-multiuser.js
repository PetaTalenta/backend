#!/usr/bin/env node

/**
 * Load test: submit N assessments concurrently via API Gateway
 * Strategy:
 * 1) Try to register 1 user and top-up token via internal endpoint (if INTERNAL_SERVICE_KEY provided)
 * 2) If top-up fails, register multiple users and distribute submissions across their default token balances
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000/api';
const INTERNAL_SERVICE_KEY = process.env.INTERNAL_SERVICE_KEY; // require explicit env; no default to avoid mismatch
const TOTAL = parseInt(process.env.COUNT || '30', 10);

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

function generateAssessment() {
  // vary scores to avoid idempotency cache
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
  const password = 'AtmaTest123!';
  const body = await jsonFetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  const { token, user } = body.data;
  return { token, user };
}

async function topUpTokenBalance(userId, amount) {
  if (!INTERNAL_SERVICE_KEY) {
    throw new Error('INTERNAL_SERVICE_KEY not provided');
  }
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
  const payload = generateAssessment();
  const idk = `loadtest-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 8)}`;
  const res = await jsonFetch(`${BASE_URL}/assessment/submit`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'X-Idempotency-Key': idk,
    },
    body: JSON.stringify(payload),
  });
  return res.data; // { jobId, status, ... }
}

async function planMultiUserSubmissions(total) {
  const users = [];
  let remaining = total;

  while (remaining > 0) {
    const u = await registerUser();
    users.push(u);
    const available = Number(u.user.token_balance ?? 3);
    remaining -= available;
  }

  // Build assignment list
  const assignments = [];
  let toAssign = total;
  for (const u of users) {
    if (toAssign <= 0) break;
    const avail = Number(u.user.token_balance ?? 3);
    const take = Math.min(avail, toAssign);
    for (let i = 0; i < take; i++) {
      assignments.push({ token: u.token });
    }
    toAssign -= take;
  }
  return { users, assignments };
}

(async () => {
  const started = Date.now();
  console.log(`[INFO] Target base URL: ${BASE_URL}`);
  console.log(`[INFO] Target submissions: ${TOTAL}`);

  let tokensForSubmissions = [];
  let registeredUsers = [];

  // Attempt single-user + top-up path
  let usedSingleUserPath = false;
  try {
    const u = await registerUser();
    registeredUsers.push(u);
    console.log(`[INFO] Registered user: ${u.user.email} (${u.user.id}) with initial tokens=${u.user.token_balance}`);

    try {
      await topUpTokenBalance(u.user.id, Math.max(0, TOTAL - (u.user.token_balance || 0)) + 10);
      usedSingleUserPath = true;
      tokensForSubmissions = Array.from({ length: TOTAL }, () => u.token);
      console.log('[INFO] Top up successful. Using single-user strategy.');
    } catch (e) {
      console.warn('[WARN] Top up failed, falling back to multi-user strategy:', e.status || '', e.body || e.message);
    }
  } catch (e) {
    console.error('[ERROR] Initial user registration failed:', e.status || '', e.body || e.message);
    process.exit(1);
  }

  if (!usedSingleUserPath) {
    console.log('[INFO] Planning multi-user registrations to cover token needs ...');
    const plan = await planMultiUserSubmissions(TOTAL);
    registeredUsers = plan.users;
    tokensForSubmissions = plan.assignments.map(a => a.token);
    console.log(`[INFO] Registered ${registeredUsers.length} users to cover ${TOTAL} submissions`);
  }

  console.log(`[INFO] Submitting ${TOTAL} assessments concurrently ...`);
  const tasks = tokensForSubmissions.map((token, i) =>
    submitAssessment(token, i).then(
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
  console.log(`Total: ${TOTAL}, Success: ${successes.length}, Fail: ${failures.length}`);
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

