# Cloudflare Tunnel Setup Guide

Panduan lengkap untuk menggunakan Cloudflare Tunnel untuk mengekspos aplikasi lokal ke internet dan mengatur DNS di Cloudflare.

## Prerequisites

- Akun Cloudflare (gratis)
- Domain yang sudah ditambahkan ke Cloudflare
- Aplikasi yang berjalan di localhost (misalnya port 3000, 8000, dll)

## 1. Install Cloudflare Tunnel (cloudflared)

### Windows
```bash
# Download dari GitHub releases
# https://github.com/cloudflare/cloudflared/releases
# Atau gunakan winget
winget install --id Cloudflare.cloudflared
```

### macOS
```bash
brew install cloudflared
```

### Linux
```bash
# Ubuntu/Debian
wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared-linux-amd64.deb

# CentOS/RHEL
wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.rpm
sudo rpm -i cloudflared-linux-amd64.rpm
```

## 2. Login ke Cloudflare

```bash
cloudflared tunnel login
```

Perintah ini akan membuka browser dan meminta Anda untuk login ke akun Cloudflare. Setelah login, pilih domain yang ingin digunakan.

## 3. Membuat Tunnel

```bash
# Buat tunnel baru dengan nama yang mudah diingat
cloudflared tunnel create atma-tunnel

# Catat Tunnel ID yang muncul, Anda akan membutuhkannya nanti
```

## 4. Konfigurasi Tunnel

Buat file konfigurasi `config.yml` di direktori cloudflared:

### Windows
Lokasi: `%USERPROFILE%\.cloudflared\config.yml`

### macOS/Linux
Lokasi: `~/.cloudflared/config.yml`

### Contoh config.yml

```yaml
tunnel: <TUNNEL_ID_ANDA>
credentials-file: /path/to/your/tunnel/credentials.json

ingress:
  # Untuk aplikasi backend (API)
  - hostname: api.yourdomain.com
    service: http://localhost:8000
  
  # Untuk aplikasi frontend
  - hostname: app.yourdomain.com
    service: http://localhost:3000
  
  # Untuk subdomain lain
  - hostname: admin.yourdomain.com
    service: http://localhost:3001
  
  # Catch-all rule (wajib ada di akhir)
  - service: http_status:404
```

## 5. Mengatur DNS di Cloudflare Dashboard

### Metode 1: Otomatis via CLI
```bash
# Untuk setiap hostname yang ada di config.yml
cloudflared tunnel route dns <TUNNEL_ID> api.yourdomain.com
cloudflared tunnel route dns <TUNNEL_ID> app.yourdomain.com
cloudflared tunnel route dns <TUNNEL_ID> admin.yourdomain.com
```

### Metode 2: Manual via Dashboard
1. Login ke [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Pilih domain Anda
3. Pergi ke **DNS** > **Records**
4. Tambahkan record CNAME:
   - **Type**: CNAME
   - **Name**: api (untuk api.yourdomain.com)
   - **Target**: `<TUNNEL_ID>.cfargotunnel.com`
   - **Proxy status**: Proxied (orange cloud)

Ulangi untuk setiap subdomain yang ingin digunakan.

## 6. Menjalankan Tunnel

### Mode Development (sementara)
```bash
cloudflared tunnel run my-app-tunnel
```

### Mode Production (sebagai service)

#### Windows
```bash
# Install sebagai service
cloudflared service install

# Start service
cloudflared service start
```

#### macOS/Linux
```bash
# Install sebagai service
sudo cloudflared service install

# Start service
sudo systemctl start cloudflared
sudo systemctl enable cloudflared
```

## 7. Testing

Setelah tunnel berjalan dan DNS sudah dikonfigurasi:

1. Pastikan aplikasi lokal Anda berjalan (misalnya di port 8000)
2. Akses `https://api.yourdomain.com` di browser
3. Anda seharusnya bisa mengakses aplikasi lokal melalui internet

## 8. Konfigurasi Tambahan

### SSL/TLS Settings
1. Di Cloudflare Dashboard, pergi ke **SSL/TLS**
2. Set encryption mode ke **Full** atau **Full (strict)**

### Security Settings
1. **Firewall Rules**: Atur rules untuk membatasi akses jika diperlukan
2. **Access**: Gunakan Cloudflare Access untuk autentikasi tambahan
3. **Rate Limiting**: Atur rate limiting untuk mencegah abuse

## 9. Troubleshooting

### Tunnel tidak bisa connect
```bash
# Cek status tunnel
cloudflared tunnel list

# Cek log
cloudflared tunnel run my-app-tunnel --loglevel debug
```

### DNS tidak resolve
- Pastikan DNS record sudah propagasi (bisa memakan waktu hingga 24 jam)
- Cek dengan `nslookup yourdomain.com`
- Pastikan proxy status di Cloudflare dalam keadaan "Proxied"

### 502 Bad Gateway
- Pastikan aplikasi lokal berjalan di port yang benar
- Cek konfigurasi service URL di config.yml
- Pastikan tidak ada firewall yang memblokir koneksi lokal

## 10. Tips dan Best Practices

1. **Gunakan HTTPS**: Cloudflare secara otomatis menyediakan SSL certificate
2. **Monitor Usage**: Cek usage di Cloudflare Dashboard untuk memastikan tidak melebihi limit
3. **Backup Config**: Simpan file config.yml dan credentials di tempat yang aman
4. **Use Environment Variables**: Untuk production, gunakan environment variables untuk sensitive data
5. **Health Checks**: Setup health checks untuk memastikan service selalu berjalan

## 11. Contoh untuk ATMA Backend

Untuk project ATMA Backend yang berjalan di port 8000:

```yaml
tunnel: <TUNNEL_ID_ANDA>
credentials-file: ~/.cloudflared/<TUNNEL_ID>.json

ingress:
  - hostname: atma-api.yourdomain.com
    service: http://localhost:8000
  - service: http_status:404
```

DNS Record:
- **Type**: CNAME
- **Name**: atma-api
- **Target**: `<TUNNEL_ID>.cfargotunnel.com`
- **Proxy**: Enabled

Setelah setup, API ATMA bisa diakses di `https://atma-api.yourdomain.com`

## Resources

- [Cloudflare Tunnel Documentation](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/)
- [Cloudflared GitHub Repository](https://github.com/cloudflare/cloudflared)
- [Cloudflare Dashboard](https://dash.cloudflare.com)
