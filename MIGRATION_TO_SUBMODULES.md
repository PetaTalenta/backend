# Migration to GitHub Submodules

This document describes the process of migrating the following services to separate GitHub repositories using git submodules:

- `api-gateway`
- `admin-service`
- `analysis-worker`
- `documentation-service`
- `chatbot-service`
- `notification-service`

## Prerequisites

1. **GitHub CLI installed** ✅ (already installed)
2. **GitHub authentication** (needs to be done)
3. **Git configured** with your GitHub credentials

## Step-by-Step Instructions

### 1. Authenticate with GitHub CLI

Run the following command and follow the prompts:

```bash
gh auth login
```

Choose the following options:
- **What account do you want to log into?** GitHub.com
- **What is your preferred protocol for Git operations?** HTTPS
- **Authenticate Git with your GitHub credentials?** Yes
- **How would you like to authenticate GitHub CLI?** Login with a web browser

Follow the browser prompts to complete authentication.

### 2. Verify Authentication

```bash
gh auth status
```

You should see that you're logged into GitHub.com.

### 3. Run the Migration Script

```bash
./migrate-to-submodules.sh
```

This script will:
1. ✅ Check GitHub CLI authentication
2. 📦 Create 6 new repositories in the PetaTalenta organization
3. 🚀 Initialize git and push each service to its repository
4. 💾 Create a backup of your current state
5. 🔗 Convert service directories to git submodules
6. 🌍 Make all repositories (including the main backend) public

### 4. Verify the Migration

After the script completes:

```bash
# Check submodules
git submodule status

# Check that repositories exist
gh repo view PetaTalenta/api-gateway
gh repo view PetaTalenta/admin-service
gh repo view PetaTalenta/analysis-worker
gh repo view PetaTalenta/documentation-service
gh repo view PetaTalenta/chatbot-service
gh repo view PetaTalenta/notification-service
gh repo view PetaTalenta/backend
```

## What Changes?

### Repository Structure

**Before:**
```
atma-backend/
├── api-gateway/
├── admin-service/
├── analysis-worker/
├── documentation-service/
├── chatbot-service/
├── notification-service/
└── ... (other files)
```

**After:**
```
atma-backend/
├── api-gateway/          (submodule → PetaTalenta/api-gateway)
├── admin-service/        (submodule → PetaTalenta/admin-service)
├── analysis-worker/      (submodule → PetaTalenta/analysis-worker)
├── documentation-service/ (submodule → PetaTalenta/documentation-service)
├── chatbot-service/      (submodule → PetaTalenta/chatbot-service)
├── notification-service/ (submodule → PetaTalenta/notification-service)
├── .gitmodules          (new file - tracks submodules)
└── ... (other files)
```

### New Repositories Created

1. `https://github.com/PetaTalenta/api-gateway`
2. `https://github.com/PetaTalenta/admin-service`
3. `https://github.com/PetaTalenta/analysis-worker`
4. `https://github.com/PetaTalenta/documentation-service`
5. `https://github.com/PetaTalenta/chatbot-service`
6. `https://github.com/PetaTalenta/notification-service`

All repositories (including `PetaTalenta/backend`) are now **public**.

## Working with Submodules

### Cloning the Repository

When cloning for the first time, use `--recursive` to also clone all submodules:

```bash
git clone --recursive https://github.com/PetaTalenta/backend.git
```

Or if already cloned:

```bash
git clone https://github.com/PetaTalenta/backend.git
cd backend
git submodule update --init --recursive
```

### Updating Submodules

To pull latest changes from all submodules:

```bash
git submodule update --remote --merge
```

### Making Changes to a Service

1. Navigate to the service directory:
   ```bash
   cd api-gateway
   ```

2. Make your changes and commit:
   ```bash
   git add .
   git commit -m "Your changes"
   git push
   ```

3. Go back to the main repository and update the submodule reference:
   ```bash
   cd ..
   git add api-gateway
   git commit -m "Update api-gateway submodule"
   git push
   ```

### Pulling Changes

When pulling changes from the main repository:

```bash
git pull
git submodule update --init --recursive
```

## Benefits of This Approach

1. **Independent Versioning**: Each service has its own version history
2. **Separate Access Control**: Can set different permissions per service
3. **Smaller Repositories**: Easier to clone and work with individual services
4. **Better CI/CD**: Can have separate pipelines for each service
5. **Team Organization**: Teams can work on specific services without cloning the entire monorepo

## Rollback Plan

If something goes wrong, a backup has been created at:
```
../atma-backend-backup-YYYYMMDD_HHMMSS/
```

To rollback:
```bash
cd /home/rayin/Desktop
rm -rf atma-backend
mv atma-backend-backup-YYYYMMDD_HHMMSS atma-backend
```

## Troubleshooting

### Authentication Issues

If you see authentication errors:
```bash
gh auth login
gh auth refresh
```

### Repository Already Exists

If a repository already exists, the script will skip creation and use the existing one.

### Submodule Issues

To reset a submodule:
```bash
git submodule deinit -f <service-name>
rm -rf .git/modules/<service-name>
git rm -f <service-name>
git submodule add https://github.com/PetaTalenta/<service-name>.git <service-name>
```

## Next Steps

1. Update your CI/CD pipelines to work with submodules
2. Update documentation with new repository URLs
3. Notify team members about the new structure
4. Update Docker Compose files if needed to reference submodules correctly
5. Consider setting up GitHub Actions workflows in each service repository

## Support

For issues or questions, please refer to:
- [Git Submodules Documentation](https://git-scm.com/book/en/v2/Git-Tools-Submodules)
- [GitHub CLI Documentation](https://cli.github.com/manual/)
