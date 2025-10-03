# Git Submodules Guide - ATMA Backend

**Last Updated:** October 3, 2025

---

## Current Submodules

The ATMA Backend project uses Git submodules for independent service management:

| Service | Repository URL | Current Commit |
|---------|---------------|----------------|
| **auth-service** | https://github.com/PetaTalenta/auth-service.git | `54eca507b3aff8b7a881de45ccf18192a19b0fbf` |
| **assessment-service** | https://github.com/PetaTalenta/assessment-service.git | `537fab94ef3ab375b37f202c3292cd48bc86bd86` |

---

## Quick Reference Commands

### Initial Setup

#### Clone Repository with Submodules
```bash
git clone --recursive https://github.com/PetaTalenta/backend.git
```

#### If Already Cloned Without Submodules
```bash
cd /path/to/backend
git submodule update --init --recursive
```

### Daily Workflow

#### Pull Latest Changes (Main + Submodules)
```bash
git pull
git submodule update --recursive
```

#### Check Submodule Status
```bash
git submodule status
```

#### Update Submodule to Latest
```bash
cd <submodule-directory>
git pull origin main
cd ..
git add <submodule-directory>
git commit -m "Update <submodule-name> to latest"
```

### Working on Submodules

#### Make Changes in Submodule
```bash
cd <submodule-directory>
# Make your changes
git add .
git commit -m "Your change description"
git push origin main
cd ..

# Update reference in main repo
git add <submodule-directory>
git commit -m "Update <submodule-name> reference"
git push
```

#### Switch Submodule Branch
```bash
cd <submodule-directory>
git checkout <branch-name>
git pull origin <branch-name>
cd ..
git add <submodule-directory>
git commit -m "Switch <submodule-name> to <branch-name>"
```

---

## Docker Integration

### No Changes Required
Submodules work seamlessly with Docker Compose:

```yaml
# docker-compose.yml excerpt
assessment-service:
  volumes:
    - ./assessment-service:/app  # Submodule mounted as normal directory
```

### Restart After Submodule Update
```bash
docker compose restart assessment-service
# or
docker compose up -d
```

---

## Troubleshooting

### Submodule Directory Empty
```bash
git submodule update --init --recursive
```

### Detached HEAD in Submodule
This is normal! Submodules track specific commits.

To work on latest:
```bash
cd <submodule-directory>
git checkout main
git pull origin main
```

### Submodule Changes Not Showing
```bash
# In main repository
git status
git add <submodule-directory>
git commit -m "Update submodule reference"
```

### Permission Issues (Docker)
```bash
# Fix log directory permissions
chmod -R 777 <submodule-directory>/logs/
docker compose restart <service-name>
```

---

## Best Practices

### ✅ DO
- Always commit submodule changes before committing main repo
- Document which commit/branch each submodule should be on
- Use `git submodule status` before pushing
- Keep submodules updated regularly
- Test after updating submodules

### ❌ DON'T
- Don't modify submodule files from main repo
- Don't forget to push submodule changes before main repo
- Don't assume others have latest submodules
- Don't commit submodule on detached HEAD without reason

---

## CI/CD Integration

### Update Deployment Script
Add submodule initialization:

```bash
#!/bin/bash
# deploy.sh

# Clone or pull main repo
git pull origin main

# Initialize and update submodules
git submodule update --init --recursive

# Continue with docker deployment
docker compose up -d
```

---

## Converting More Services

### Steps to Convert Service to Submodule

1. **Backup the service**
   ```bash
   cp -r <service-name> <service-name>-backup
   ```

2. **Create remote repository**
   - Create repo on GitHub: `https://github.com/PetaTalenta/<service-name>`

3. **Initialize and push**
   ```bash
   cd /tmp
   cp -r /path/to/backend/<service-name> .
   cd <service-name>
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/PetaTalenta/<service-name>.git
   git push -u origin main
   ```

4. **Add as submodule**
   ```bash
   cd /path/to/backend
   rm -rf <service-name>
   git submodule add https://github.com/PetaTalenta/<service-name>.git <service-name>
   git add .gitmodules <service-name>
   git commit -m "Convert <service-name> to git submodule"
   ```

5. **Test**
   ```bash
   docker compose up -d
   node test-end-to-end-flow.js
   ```

---

## Additional Resources

- **Main Documentation:** [docs/assessment-service-submodule-setup-report.md](./assessment-service-submodule-setup-report.md)
- **Git Submodules Official Docs:** https://git-scm.com/book/en/v2/Git-Tools-Submodules
- **Docker Compose:** [docker-compose.yml](../docker-compose.yml)

---

## Support

For issues with submodules:
1. Check this guide
2. Run `git submodule status` to verify state
3. Check service logs: `docker logs atma-<service-name>`
4. Refer to detailed setup report in docs/

---

**Maintained by:** DevOps Team  
**Last Verified:** October 3, 2025
