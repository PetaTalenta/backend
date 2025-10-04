# 🚀 ATMA Backend - Migration to GitHub Submodules

Complete migration toolkit for converting backend services to independent GitHub repositories using git submodules, with automatic Docker management and ECONNREFUSED error handling.

## 📁 What's Included

### 🛠️ Scripts
- **`migration-tools-menu.sh`** - Interactive menu for all tools
- **`migrate-to-submodules.sh`** - Main migration script (includes Docker & error handling)
- **`preflight-check.sh`** - Pre-migration validation
- **`fix-docker-econnrefused.sh`** - Standalone Docker error recovery

### 📚 Documentation
- **`MIGRATION_SUMMARY.md`** - Complete overview (START HERE!)
- **`PANDUAN_MIGRASI_SUBMODULES.md`** - Full guide (Bahasa Indonesia)
- **`MIGRATION_TO_SUBMODULES.md`** - Full guide (English)
- **`DOCKER_ECONNREFUSED_FIX.md`** - Docker troubleshooting
- **`ARCHITECTURE_DIAGRAM.md`** - Visual architecture & diagrams
- **`QUICK_REFERENCE.txt`** - Quick command reference
- **`MIGRATION_CHECKLIST.txt`** - Step-by-step checklist

---

## ⚡ Quick Start (3 Steps)

### 1️⃣ Authenticate with GitHub
```bash
gh auth login
```
Choose: **GitHub.com** → **HTTPS** → **Yes** → **Login with browser**

### 2️⃣ Check Readiness
```bash
./preflight-check.sh
```
Ensure all checks pass ✅

### 3️⃣ Run Migration
```bash
./migrate-to-submodules.sh
```

**That's it!** The script will:
- ✅ Create 6 GitHub repositories
- ✅ Push code to each repository
- ✅ Convert directories to submodules
- ✅ Make all repositories public
- ✅ Start Docker services (`docker-compose up -d`)
- ✅ Fix ECONNREFUSED errors automatically

---

## 🎯 What Will Be Created

### GitHub Repositories (All Public)
1. `https://github.com/PetaTalenta/api-gateway`
2. `https://github.com/PetaTalenta/admin-service`
3. `https://github.com/PetaTalenta/analysis-worker`
4. `https://github.com/PetaTalenta/documentation-service`
5. `https://github.com/PetaTalenta/chatbot-service`
6. `https://github.com/PetaTalenta/notification-service`

**Plus:** Main `PetaTalenta/backend` repo made public

### Local Changes
- Services converted to git submodules
- `.gitmodules` file created
- Docker services running
- Backup created at `../atma-backend-backup-YYYYMMDD_HHMMSS/`

---

## 🖥️ Interactive Menu

For easy access to all tools:

```bash
./migration-tools-menu.sh
```

**Features:**
- Pre-flight check
- Run migration
- Fix Docker errors
- View service status
- View logs
- Access documentation
- And more!

---

## 🐳 Docker Management

### Automatic Handling
The migration script automatically:
1. Stops existing containers
2. Starts all services with `docker-compose up -d`
3. Waits for initialization
4. Checks for ECONNREFUSED errors
5. Restarts affected services (analysis-worker, notification-service)
6. Verifies the fix

### Manual Fix
If issues occur later:
```bash
./fix-docker-econnrefused.sh
```

### Common Commands
```bash
# Check status
docker-compose ps

# View logs
docker-compose logs -f analysis-worker
docker-compose logs -f notification-service

# Restart specific service
docker-compose restart analysis-worker

# Full restart
docker-compose down && docker-compose up -d
```

---

## 📖 Working with Submodules

### Clone Repository
```bash
# Clone with submodules
git clone --recursive https://github.com/PetaTalenta/backend.git

# Or if already cloned
git submodule update --init --recursive
```

### Update All Submodules
```bash
git submodule update --remote --merge
```

### Make Changes to a Service
```bash
# 1. Go to service
cd api-gateway

# 2. Make changes and push
git add .
git commit -m "Your changes"
git push

# 3. Update main repo
cd ..
git add api-gateway
git commit -m "Update api-gateway submodule"
git push
```

---

## ✅ Verification

After migration, verify everything:

```bash
# Check submodules
git submodule status

# Check GitHub repos
gh repo list PetaTalenta

# Check Docker services
docker-compose ps

# Check for errors
docker-compose logs analysis-worker | grep ECONNREFUSED
docker-compose logs notification-service | grep ECONNREFUSED
```

---

## 🛡️ Backup & Rollback

### Backup Location
Automatically created at: `../atma-backend-backup-YYYYMMDD_HHMMSS/`

### Rollback
```bash
cd /home/rayin/Desktop
rm -rf atma-backend
mv atma-backend-backup-YYYYMMDD_HHMMSS atma-backend
cd atma-backend
docker-compose up -d
```

---

## 🎁 Benefits

### Development
- ✅ Independent versioning per service
- ✅ Smaller repository clones
- ✅ Focused development per service
- ✅ Better CI/CD pipelines
- ✅ Clear service ownership

### Operations
- ✅ Public repositories for open source
- ✅ Separate access control per service
- ✅ Automatic Docker management
- ✅ Automatic error recovery
- ✅ Easy rollback with backup

---

## 🐛 Troubleshooting

### GitHub Authentication Issues
```bash
gh auth login
gh auth refresh
gh auth status
```

### Submodule Issues
```bash
# Update all submodules
git submodule update --init --recursive

# Reset a submodule
git submodule deinit -f api-gateway
rm -rf .git/modules/api-gateway
git rm -f api-gateway
git submodule add https://github.com/PetaTalenta/api-gateway.git api-gateway
```

### Docker Issues
```bash
# Run fix script
./fix-docker-econnrefused.sh

# Or manual
docker-compose restart analysis-worker notification-service
docker-compose logs -f analysis-worker notification-service

# Full restart
docker-compose down
docker-compose up -d

# Check dependencies
docker-compose ps rabbitmq mongodb redis
```

---

## 📋 Pre-Migration Checklist

Before running migration, ensure:
- [ ] GitHub CLI installed and authenticated
- [ ] Git configured (name and email)
- [ ] Access to PetaTalenta organization
- [ ] All service directories exist
- [ ] No uncommitted changes
- [ ] All devices ready
- [ ] Backup plan understood

---

## 📞 Quick Help

| Need to... | Command |
|-----------|---------|
| Run everything | `./migrate-to-submodules.sh` |
| Interactive menu | `./migration-tools-menu.sh` |
| Check readiness | `./preflight-check.sh` |
| Fix Docker errors | `./fix-docker-econnrefused.sh` |
| Check status | `docker-compose ps` |
| View logs | `docker-compose logs -f <service>` |
| Restart service | `docker-compose restart <service>` |
| Update submodules | `git submodule update --remote --merge` |

---

## 📚 Documentation Guide

| File | When to Read |
|------|-------------|
| **`MIGRATION_SUMMARY.md`** | First - Complete overview |
| **`MIGRATION_CHECKLIST.txt`** | During migration - Step tracker |
| **`QUICK_REFERENCE.txt`** | Daily use - Quick commands |
| **`PANDUAN_MIGRASI_SUBMODULES.md`** | Detailed guide (Bahasa) |
| **`MIGRATION_TO_SUBMODULES.md`** | Detailed guide (English) |
| **`DOCKER_ECONNREFUSED_FIX.md`** | When Docker issues occur |
| **`ARCHITECTURE_DIAGRAM.md`** | Understanding structure |

---

## 🚦 Migration Flow

```
1. Authenticate      → gh auth login
2. Pre-flight Check  → ./preflight-check.sh
3. Run Migration     → ./migrate-to-submodules.sh
   ├─ Create repos
   ├─ Push code
   ├─ Backup
   ├─ Convert to submodules
   ├─ Make public
   ├─ Docker compose up -d  ⭐ NEW
   └─ Fix ECONNREFUSED      ⭐ NEW
4. Verify            → git submodule status
5. Done! 🎉
```

---

## 🎯 Success Criteria

Migration is successful when:
- ✅ All 6 repositories created on GitHub
- ✅ All repositories are public
- ✅ Submodules properly configured
- ✅ `.gitmodules` file exists
- ✅ Docker services running
- ✅ No ECONNREFUSED errors in logs
- ✅ Backup created and noted

---

## 💡 Tips

1. **Run preflight check first** - Catch issues early
2. **Use interactive menu** - Easier than remembering commands
3. **Keep backup location noted** - In case rollback needed
4. **Check logs regularly** - `docker-compose logs -f`
5. **Read MIGRATION_SUMMARY.md** - Comprehensive overview

---

## 🎉 After Migration

Your backend is now:
- 🏗️ **Modular** - Independent service repositories
- 🌍 **Public** - Open for collaboration
- 🐳 **Running** - Docker services up and monitored
- 🛡️ **Safe** - Backup available for rollback
- 🚀 **Ready** - Team can start working with submodules

**Congratulations! Your migration is complete!** 🎊

---

## 📞 Support

For issues or questions:
- Check `MIGRATION_SUMMARY.md` for overview
- Check `DOCKER_ECONNREFUSED_FIX.md` for Docker issues
- Run `./migration-tools-menu.sh` for interactive help
- Refer to Git Submodules documentation
- Check GitHub CLI manual

---

## 🔗 Resources

- [Git Submodules Documentation](https://git-scm.com/book/en/v2/Git-Tools-Submodules)
- [GitHub CLI Manual](https://cli.github.com/manual/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [GitHub Submodules Best Practices](https://github.blog/2016-02-01-working-with-submodules/)

---

**Ready to start? Run:** `./migration-tools-menu.sh` **or** `./migrate-to-submodules.sh`
