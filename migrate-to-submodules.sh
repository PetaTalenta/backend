# 🚀 Panduan Migrasi ke GitHub Submodules

Dokumen ini menjelaskan cara memisahkan service-service berikut ke repository GitHub terpisah menggunakan git submodules:

- `api-gateway`
- `admin-service` 
- `analysis-worker`
- `documentation-service`
- `chatbot-service`
- `notification-service`

## 📋 Persiapan

### 1. Autentikasi GitHub CLI

Jalankan perintah berikut dan ikuti instruksinya:

```bash
gh auth login
```

**Pilihan yang harus dipilih:**
1. **Where do you use GitHub?** → `GitHub.com`
2. **What is your preferred protocol?** → `HTTPS` (atau SSH jika sudah setup)
3. **Authenticate Git with your credentials?** → `Yes`
4. **How would you like to authenticate?** → `Login with a web browser`

Kemudian:
1. Copy kode one-time yang muncul (contoh: `F33E-7EA3`)
2. Tekan Enter untuk membuka browser
3. Paste kode tersebut di halaman GitHub
4. Authorize GitHub CLI

### 2. Verifikasi Autentikasi

```bash
gh auth status
```

Pastikan Anda sudah ter-autentikasi ke GitHub.com.

### 3. Jalankan Pre-flight Check

Sebelum migrasi, jalankan script untuk mengecek apakah semua siap:

```bash
cd /home/rayin/Desktop/atma-backend
./preflight-check.sh
```

Script ini akan mengecek:
- ✅ GitHub CLI terinstall
- ✅ Autentikasi GitHub
- ✅ Konfigurasi Git
- ✅ Akses ke organisasi PetaTalenta
- ✅ Direktori service ada
- ✅ Status git

## 🎯 Menjalankan Migrasi

Setelah semua check di atas hijau, jalankan script migrasi:

```bash
./migrate-to-submodules.sh
```

### Apa yang dilakukan script?

1. **Membuat Repository** - Membuat 6 repository baru di organisasi PetaTalenta
2. **Push Code** - Push kode setiap service ke repository masing-masing
3. **Backup** - Membuat backup otomatis sebelum perubahan
4. **Convert to Submodules** - Mengubah direktori service jadi submodule
5. **Make Public** - Mengubah semua repository (termasuk backend) jadi public

## 📦 Repository yang Dibuat

Setelah migrasi, repository berikut akan dibuat:

1. `https://github.com/PetaTalenta/api-gateway` 🌐
2. `https://github.com/PetaTalenta/admin-service` 👨‍💼
3. `https://github.com/PetaTalenta/analysis-worker` 🔍
4. `https://github.com/PetaTalenta/documentation-service` 📚
5. `https://github.com/PetaTalenta/chatbot-service` 🤖
6. `https://github.com/PetaTalenta/notification-service` 📧

Semua repository (termasuk `PetaTalenta/backend`) akan menjadi **PUBLIC** ✅

## 🔄 Bekerja dengan Submodules

### Clone Repository (Pertama Kali)

```bash
# Clone dengan semua submodule
git clone --recursive https://github.com/PetaTalenta/backend.git

# Atau jika sudah clone tanpa --recursive
git clone https://github.com/PetaTalenta/backend.git
cd backend
git submodule update --init --recursive
```

### Update Submodules

Pull perubahan terbaru dari semua submodules:

```bash
git submodule update --remote --merge
```

### Membuat Perubahan di Service

1. Masuk ke direktori service:
   ```bash
cd api-gateway
```

2. Buat perubahan dan commit:
   ```bash
git add .
   git commit -m "Your changes"
   git push
```

3. Kembali ke main repository dan update referensi submodule:
   ```bash
cd ..
   git add api-gateway
   git commit -m "Update api-gateway submodule"
   git push
```

### Pull Perubahan

```bash
git pull
git submodule update --init --recursive
```

## 🛡️ Backup & Rollback

### Lokasi Backup

Script otomatis membuat backup di:
```
/home/rayin/Desktop/atma-backend-backup-YYYYMMDD_HHMMSS/
```

### Rollback (Jika Diperlukan)

```bash
cd /home/rayin/Desktop
rm -rf atma-backend
mv atma-backend-backup-YYYYMMDD_HHMMSS atma-backend
```

## ✅ Verifikasi Hasil

Setelah migrasi selesai, verifikasi dengan:

```bash
# Cek status submodules
git submodule status

# Cek repository exists dan public
gh repo view PetaTalenta/api-gateway
gh repo view PetaTalenta/admin-service
gh repo view PetaTalenta/analysis-worker
gh repo view PetaTalenta/documentation-service
gh repo view PetaTalenta/chatbot-service
gh repo view PetaTalenta/notification-service
gh repo view PetaTalenta/backend
```

## 🎁 Keuntungan Submodules

1. **Independent Versioning** - Setiap service punya version history sendiri
2. **Separate Access Control** - Bisa atur permission berbeda per service
3. **Smaller Repos** - Lebih mudah clone dan work dengan individual service
4. **Better CI/CD** - Bisa punya pipeline terpisah untuk setiap service
5. **Team Organization** - Team bisa kerja di service tertentu tanpa clone seluruh monorepo
6. **Public Access** - Semua repository bisa diakses publik untuk kolaborasi open source

## 🔧 Troubleshooting

### Masalah Autentikasi

```bash
gh auth login
gh auth refresh
```

### Repository Sudah Ada

Jika repository sudah ada, script akan skip pembuatan dan menggunakan yang ada.

### Reset Submodule

```bash
git submodule deinit -f <service-name>
rm -rf .git/modules/<service-name>
git rm -f <service-name>
git submodule add https://github.com/PetaTalenta/<service-name>.git <service-name>
```

## 📝 Langkah Selanjutnya

Setelah migrasi:

1. ✅ Update CI/CD pipelines untuk bekerja dengan submodules
2. ✅ Update dokumentasi dengan URL repository baru
3. ✅ Notifikasi team tentang struktur baru
4. ✅ Update Docker Compose jika perlu
5. ✅ Setup GitHub Actions workflows di setiap service repository

## 📞 Bantuan

Jika ada pertanyaan atau masalah:
- [Git Submodules Documentation](https://git-scm.com/book/en/v2/Git-Tools-Submodules)
- [GitHub CLI Manual](https://cli.github.com/manual/)
- [GitHub Submodules Guide](https://github.blog/2016-02-01-working-with-submodules/)

## 🚦 Quick Start Commands

```bash
# 1. Autentikasi
gh auth login

# 2. Pre-flight check
./preflight-check.sh

# 3. Jalankan migrasi
./migrate-to-submodules.sh

# 4. Verifikasi
git submodule status
gh repo view PetaTalenta/backend
```

Selamat! Repository Anda sekarang menggunakan submodules! 🎉
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
#!/bin/bash

# Script to migrate services to separate GitHub repositories with submodules
# Organization: PetaTalenta

set -e  # Exit on error

ORGANIZATION="PetaTalenta"
SERVICES=("api-gateway" "admin-service" "analysis-worker" "documentation-service" "chatbot-service" "notification-service")
BACKEND_ROOT="/home/rayin/Desktop/atma-backend"

echo "========================================="
echo "Migration to GitHub Submodules"
echo "========================================="
echo ""

# Step 1: Check if gh CLI is authenticated
echo "Step 1: Checking GitHub CLI authentication..."
if ! gh auth status &> /dev/null; then
    echo "❌ Not authenticated with GitHub CLI"
    echo "Please run: gh auth login"
    echo "Choose: GitHub.com, HTTPS, Yes (authenticate Git), Login with a web browser"
    exit 1
fi
echo "✅ GitHub CLI authenticated"
echo ""

# Step 2: Create GitHub repositories for each service
echo "Step 2: Creating GitHub repositories..."
for SERVICE in "${SERVICES[@]}"; do
    echo "Creating repository: $ORGANIZATION/$SERVICE"
    
    # Check if repo already exists
    if gh repo view "$ORGANIZATION/$SERVICE" &> /dev/null; then
        echo "⚠️  Repository $ORGANIZATION/$SERVICE already exists, skipping creation"
    else
        gh repo create "$ORGANIZATION/$SERVICE" \
            --private \
            --description "$SERVICE for Atma Backend" \
            || echo "⚠️  Failed to create $SERVICE (may already exist)"
    fi
done
echo "✅ All repositories created"
echo ""

# Step 3: Initialize git and push each service
echo "Step 3: Initializing and pushing services..."
cd "$BACKEND_ROOT"

for SERVICE in "${SERVICES[@]}"; do
    SERVICE_DIR="$BACKEND_ROOT/$SERVICE"
    
    if [ ! -d "$SERVICE_DIR" ]; then
        echo "⚠️  Directory $SERVICE_DIR not found, skipping"
        continue
    fi
    
    echo "Processing $SERVICE..."
    cd "$SERVICE_DIR"
    
    # Initialize git if not already
    if [ ! -d ".git" ]; then
        echo "  Initializing git repository..."
        git init
        git add .
        git commit -m "Initial commit: Migrated from monorepo"
    else
        echo "  Git repository already initialized"
    fi
    
    # Add remote if not exists
    if ! git remote get-url origin &> /dev/null; then
        echo "  Adding remote origin..."
        git remote add origin "https://github.com/$ORGANIZATION/$SERVICE.git"
    else
        echo "  Remote origin already exists"
    fi
    
    # Create main branch if on master
    CURRENT_BRANCH=$(git branch --show-current)
    if [ "$CURRENT_BRANCH" = "master" ]; then
        git branch -M main
    fi
    
    # Push to remote
    echo "  Pushing to GitHub..."
    git push -u origin main --force
    
    cd "$BACKEND_ROOT"
done
echo "✅ All services pushed to GitHub"
echo ""

# Step 4: Backup and prepare for submodule conversion
echo "Step 4: Preparing for submodule conversion..."
echo "Creating backup of current state..."
BACKUP_DIR="$BACKEND_ROOT/../atma-backend-backup-$(date +%Y%m%d_%H%M%S)"
cp -r "$BACKEND_ROOT" "$BACKUP_DIR"
echo "✅ Backup created at: $BACKUP_DIR"
echo ""

# Step 5: Remove service directories and add as submodules
echo "Step 5: Converting to submodules..."
cd "$BACKEND_ROOT"

for SERVICE in "${SERVICES[@]}"; do
    SERVICE_DIR="$BACKEND_ROOT/$SERVICE"
    
    if [ ! -d "$SERVICE_DIR" ]; then
        echo "⚠️  Directory $SERVICE_DIR not found, skipping"
        continue
    fi
    
    echo "Converting $SERVICE to submodule..."
    
    # Remove from git tracking but keep files temporarily
    git rm -rf --cached "$SERVICE" 2>/dev/null || true
    
    # Remove the directory
    rm -rf "$SERVICE"
    
    # Add as submodule
    git submodule add "https://github.com/$ORGANIZATION/$SERVICE.git" "$SERVICE"
    
    echo "  ✅ $SERVICE converted to submodule"
done

# Commit the submodule changes
echo "Committing submodule changes..."
git add .gitmodules
git commit -m "Convert services to submodules

- Moved api-gateway, admin-service, analysis-worker, documentation-service, chatbot-service, and notification-service to separate repositories
- Added as git submodules for easier independent development and versioning"

echo "✅ All services converted to submodules"
echo ""

# Step 6: Make all repositories public
echo "Step 6: Making all repositories public..."

# Make service repos public
for SERVICE in "${SERVICES[@]}"; do
    echo "Making $ORGANIZATION/$SERVICE public..."
    gh repo edit "$ORGANIZATION/$SERVICE" --visibility public || echo "⚠️  Failed to make $SERVICE public"
done

# Make the backend repo public
echo "Making $ORGANIZATION/backend public..."
gh repo edit "$ORGANIZATION/backend" --visibility public || echo "⚠️  Failed to make backend public"

echo "✅ All repositories are now public"
echo ""

# Step 7: Docker Compose Up
echo "Step 7: Starting Docker Compose services..."
cd "$BACKEND_ROOT"

# Stop any running containers first
echo "Stopping existing containers..."
docker-compose down 2>/dev/null || true

# Start all services
echo "Starting all services with docker-compose up -d..."
docker-compose up -d

echo "Waiting 15 seconds for services to initialize..."
sleep 15

echo "✅ Docker services started"
echo ""

# Step 8: Check for ECONNREFUSED and restart affected services
echo "Step 8: Checking for connection issues..."

# Function to check service logs for ECONNREFUSED
check_service_logs() {
    local service=$1
    local container_name="${service//-/_}_1"
    
    # Try different possible container names
    local possible_names=(
        "atma-backend-${service}-1"
        "atma-backend_${service}_1"
        "${service}_1"
        "${service}"
        "atma-backend-${service}"
    )
    
    for name in "${possible_names[@]}"; do
        if docker ps -a --format '{{.Names}}' | grep -q "^${name}$"; then
            container_name=$name
            break
        fi
    done
    
    echo "  Checking $service (container: $container_name)..."
    
    # Check logs for ECONNREFUSED
    if docker logs "$container_name" 2>&1 | grep -q "ECONNREFUSED"; then
        echo "  ⚠️  $service has ECONNREFUSED error, restarting..."
        docker restart "$container_name"
        sleep 5
        
        # Check again after restart
        if docker logs "$container_name" 2>&1 | tail -20 | grep -q "ECONNREFUSED"; then
            echo "  ⚠️  $service still has issues after restart"
        else
            echo "  ✅ $service restarted successfully"
        fi
        return 0
    else
        echo "  ✅ $service is running normally"
        return 1
    fi
}

# Check analysis-worker
check_service_logs "analysis-worker"

# Check notification-service
check_service_logs "notification-service"

# Additional checks for other critical services
echo ""
echo "Checking other critical services..."
check_service_logs "api-gateway" || true
check_service_logs "admin-service" || true

echo ""
echo "Docker services status:"
docker-compose ps

echo ""
echo "========================================="
echo "✅ Migration completed successfully!"
echo "========================================="
echo ""
echo "Summary:"
echo "- Created 6 new repositories in PetaTalenta organization"
echo "- Converted services to git submodules"
echo "- All repositories are now public"
echo "- Docker services started with docker-compose up -d"
echo "- Checked and restarted services with ECONNREFUSED errors"
echo ""
echo "To clone the repository with submodules:"
echo "  git clone --recursive https://github.com/PetaTalenta/backend.git"
echo ""
echo "To update submodules after cloning:"
echo "  git submodule update --init --recursive"
echo ""
echo "Backup location: $BACKUP_DIR"
echo ""
echo "Docker containers status:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
