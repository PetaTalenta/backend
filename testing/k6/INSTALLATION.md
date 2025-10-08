# K6 Installation Guide

## Quick Installation (Ubuntu/Xubuntu)

### Method 1: Using Snap (Recommended for Ubuntu)

```bash
sudo snap install k6
```

### Method 2: Using APT Repository

```bash
# Add K6 GPG key
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69

# Add K6 repository
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list

# Update and install
sudo apt-get update
sudo apt-get install k6
```

### Method 3: Using Docker (No Installation Required)

```bash
# Pull K6 image
docker pull grafana/k6:latest

# Run tests using Docker
docker run --rm -v $(pwd):/tests grafana/k6:latest run /tests/scripts/smoke-test.js
```

## Verify Installation

```bash
k6 version
```

Expected output:
```
k6 v0.48.0 (go1.21.5, linux/amd64)
```

## Post-Installation Setup

1. Make scripts executable:
   ```bash
   cd testing/k6
   chmod +x run-all-tests.sh
   ```

2. Create results directory:
   ```bash
   mkdir -p results
   ```

3. Test installation with smoke test:
   ```bash
   k6 run scripts/smoke-test.js --duration 10s
   ```

## Troubleshooting

### Issue: Command 'k6' not found

**Solution 1**: Install using snap
```bash
sudo snap install k6
```

**Solution 2**: Use Docker instead
```bash
alias k6='docker run --rm -v $(pwd):/tests grafana/k6:latest'
```

### Issue: Permission denied

**Solution**: Make scripts executable
```bash
chmod +x run-all-tests.sh
chmod +x scripts/*.js
```

### Issue: Cannot connect to API

**Solution**: Check if services are running
```bash
# Check API Gateway
curl https://api.futureguide.id/health

# Check services in Docker
docker ps | grep atma
```

## Next Steps

After installation, proceed to:
1. Read [README.md](README.md) for usage instructions
2. Run smoke test: `k6 run scripts/smoke-test.js`
3. Run E2E test: `k6 run scripts/e2e-full-flow.js`
4. Run load tests: `./run-all-tests.sh`

## Additional Resources

- [K6 Official Documentation](https://k6.io/docs/)
- [K6 Installation Guide](https://k6.io/docs/getting-started/installation/)
- [K6 Docker Guide](https://k6.io/docs/getting-started/running-k6/#docker)

