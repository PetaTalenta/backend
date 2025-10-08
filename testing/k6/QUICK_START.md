# K6 Testing Quick Start Guide

Get started with ATMA Backend testing in 5 minutes!

## 🚀 Quick Setup

### Step 1: Install K6

Choose one method:

**Option A: Snap (Easiest)**
```bash
sudo snap install k6
```

**Option B: Docker (No Installation)**
```bash
docker pull grafana/k6:latest
alias k6='docker run --rm -v $(pwd):/tests grafana/k6:latest'
```

**Option C: APT Repository**
```bash
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

### Step 2: Verify Installation

```bash
k6 version
```

Expected output: `k6 v0.48.0 (go1.21.5, linux/amd64)`

### Step 3: Navigate to Testing Directory

```bash
cd testing/k6
```

### Step 4: Make Scripts Executable

```bash
chmod +x run-all-tests.sh
```

## 🧪 Run Your First Test

### Smoke Test (30 seconds)

Quick health check of all services:

```bash
k6 run scripts/smoke-test.js
```

**Expected Output**:
```
✓ API Gateway Health passed
✓ Auth V2 Health passed
✓ Assessment Health passed
✓ Login test passed
✓ Authenticated endpoints test passed

checks.........................: 100.00% ✓ 10  ✗ 0
http_req_duration..............: avg=250ms min=100ms med=200ms max=500ms p(95)=450ms
http_reqs......................: 10
```

### E2E Full Flow Test (10 minutes)

Complete user journey from registration to logout:

```bash
k6 run scripts/e2e-full-flow.js
```

**Expected Output**:
```
✓ Phase 1: User Registration passed
✓ Phase 2: First Logout passed
✓ Phase 3: Re-login passed
...
✓ Phase 14: Final Logout passed

Total Duration: 487s
Job ID: 550e8400-e29b-41d4-a716-446655440000
Result ID: 550e8400-e29b-41d4-a716-446655440001
```

### Load Test Level 1 (10 minutes)

Baseline performance with 1 user:

```bash
k6 run scripts/load-test-level1.js
```

## 📊 Understanding Results

### Console Output

```
     ✓ Phase 1: User Registration passed
     ✓ Phase 2: First Logout passed
     
     checks.........................: 100.00% ✓ 28  ✗ 0
     data_received..................: 45 kB   4.5 kB/s
     data_sent......................: 12 kB   1.2 kB/s
     http_req_duration..............: avg=1.2s min=200ms med=1s max=3s p(95)=2.5s
     http_req_failed................: 0.00%   ✓ 0   ✗ 28
     http_reqs......................: 28      2.8/s
     iteration_duration.............: avg=8m  min=8m   med=8m max=8m
     iterations.....................: 1       0.1/s
     vus............................: 1       min=1 max=1
```

### Key Metrics Explained

- **checks**: Percentage of successful validations
- **http_req_duration**: Response time statistics
- **http_req_failed**: Error rate
- **http_reqs**: Total HTTP requests made
- **iterations**: Number of complete test runs

### Success Indicators

✅ **Good**:
- checks: 95-100%
- http_req_failed: 0-5%
- http_req_duration p(95): < 5s (baseline)

⚠️ **Warning**:
- checks: 90-95%
- http_req_failed: 5-10%
- http_req_duration p(95): 5-10s

❌ **Critical**:
- checks: < 90%
- http_req_failed: > 10%
- http_req_duration p(95): > 10s

## 🎯 Common Use Cases

### 1. Quick Health Check

Before deploying or after changes:

```bash
k6 run scripts/smoke-test.js --duration 10s
```

### 2. Single User Test

Test complete flow with one user:

```bash
k6 run scripts/e2e-full-flow.js --iterations 1
```

### 3. Light Load Test

Test with 5 concurrent users:

```bash
k6 run scripts/load-test-level2.js
```

### 4. Custom Configuration

Override default settings:

```bash
# Custom duration
k6 run scripts/smoke-test.js --duration 1m

# Custom VUs
k6 run scripts/e2e-full-flow.js --vus 3 --duration 5m

# Custom base URL
k6 run scripts/smoke-test.js --env BASE_URL=http://localhost:3000
```

## 🔧 Troubleshooting

### Issue: "Command 'k6' not found"

**Solution**: Install K6 using snap or Docker

```bash
sudo snap install k6
```

### Issue: "Connection timeout"

**Solution**: Check if services are running

```bash
# Check API Gateway
curl https://api.futureguide.id/health

# Check Docker containers
docker ps | grep atma
```

### Issue: "Authentication failed"

**Solution**: Verify test credentials

```bash
# Test login manually
curl -X POST https://api.futureguide.id/api/auth/v2/login \
  -H "Content-Type: application/json" \
  -d '{"email":"kasykoi@gmail.com","password":"Anjas123"}'
```

### Issue: "High error rate"

**Solution**: Check service logs

```bash
# View logs
docker logs atma-api-gateway
docker logs atma-auth-v2-service
docker logs atma-assessment-service
```

## 📈 Progressive Testing Strategy

### Day 1: Smoke Test
```bash
k6 run scripts/smoke-test.js
```
**Goal**: Verify all services are healthy

### Day 2: E2E Test
```bash
k6 run scripts/e2e-full-flow.js
```
**Goal**: Verify complete user flow works

### Day 3: Baseline Load
```bash
k6 run scripts/load-test-level1.js
```
**Goal**: Establish baseline metrics

### Week 1: Light Load
```bash
k6 run scripts/load-test-level2.js
```
**Goal**: Test basic concurrency

### Week 2: Medium Load
```bash
k6 run scripts/load-test-level3.js
```
**Goal**: Test realistic usage

### Week 3: High Load
```bash
k6 run scripts/load-test-level4.js
```
**Goal**: Stress test system

### Week 4: Peak Load
```bash
k6 run scripts/load-test-level5.js
```
**Goal**: Find breaking point

## 🎓 Next Steps

1. **Read Full Documentation**:
   ```bash
   cat README.md
   ```

2. **Run All Tests**:
   ```bash
   ./run-all-tests.sh
   ```

3. **View Results**:
   ```bash
   ls -la results/
   ```

4. **Analyze Metrics**:
   - Open `results/TIMESTAMP/index.html` in browser
   - Review JSON summaries
   - Identify bottlenecks

5. **Optimize and Repeat**:
   - Fix identified issues
   - Re-run tests
   - Compare results

## 📚 Additional Resources

- [Full README](README.md)
- [Installation Guide](INSTALLATION.md)
- [Testing Plan](../COMPREHENSIVE_TESTING_PLAN.md)
- [Implementation Report](../../docs/K6_TESTING_IMPLEMENTATION_REPORT.md)
- [K6 Documentation](https://k6.io/docs/)

## 💡 Tips

1. **Start Small**: Begin with smoke test, then E2E, then load tests
2. **Monitor Resources**: Watch CPU, memory, and network during tests
3. **Run During Off-Peak**: For accurate results, test during low traffic
4. **Save Results**: Keep results for comparison over time
5. **Iterate**: Test → Analyze → Optimize → Repeat

## 🆘 Need Help?

1. Check [README.md](README.md) for detailed documentation
2. Review [INSTALLATION.md](INSTALLATION.md) for setup issues
3. Read [K6 Documentation](https://k6.io/docs/)
4. Check service logs for errors
5. Verify all Docker containers are running

---

**Happy Testing! 🚀**

