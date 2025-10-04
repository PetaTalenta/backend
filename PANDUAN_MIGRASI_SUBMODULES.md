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
6. **Docker Compose Up** - Menjalankan `docker-compose up -d` untuk start semua services
7. **Fix ECONNREFUSED** - Otomatis restart analysis-worker & notification-service jika ada error koneksi

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

### Docker Services Error (ECONNREFUSED)

Jika setelah migrasi ada service yang error dengan ECONNREFUSED:

```bash
# Jalankan script otomatis untuk fix
./fix-docker-econnrefused.sh

# Atau manual restart service tertentu
docker-compose restart analysis-worker
docker-compose restart notification-service

# Cek logs service
docker-compose logs -f analysis-worker
docker-compose logs -f notification-service

# Restart semua jika perlu
docker-compose down
docker-compose up -d
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
