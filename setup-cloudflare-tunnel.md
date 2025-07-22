# Setup Cloudflare Zero Trust Tunnel

## Langkah-langkah Setup:

### 1. Login ke Cloudflare Zero Trust Dashboard
- Buka https://one.dash.cloudflare.com/
- Login dengan akun Cloudflare Anda

### 2. Buat Tunnel Baru
1. Pergi ke **Access** > **Tunnels**
2. Klik **Create a tunnel**
3. Pilih **Cloudflared**
4. Beri nama tunnel: `atma-tunnel`
5. Klik **Save tunnel**

### 3. Install Connector (Skip - kita pakai Docker)
- Skip langkah ini karena kita akan menggunakan Docker

### 4. Route Traffic
Tambahkan routing berikut:

**Route 1 - API Gateway:**
- **Subdomain:** `api`
- **Domain:** `chhrone.web.id`
- **Type:** `HTTP`
- **URL:** `api-gateway:3000`

**Route 2 - Documentation:**
- **Subdomain:** `docs`
- **Domain:** `chhrone.web.id`
- **Type:** `HTTP`
- **URL:** `documentation-service:80`

### 5. Copy Tunnel Token
1. Setelah membuat tunnel, copy **tunnel token**
2. Paste token ke file `.env`:
   ```
   CLOUDFLARE_TUNNEL_TOKEN=eyJhIjoiYWJjZGVmZ2hpams...
   ```

### 6. Update DNS Records (Otomatis)
Cloudflare akan otomatis membuat CNAME records:
- `api.chhrone.web.id` -> `<tunnel-id>.cfargotunnel.com`
- `docs.chhrone.web.id` -> `<tunnel-id>.cfargotunnel.com`

### 7. Jalankan Docker Compose
```bash
docker-compose up -d
```

### 8. Test Koneksi
- API: https://api.chhrone.web.id
- Docs: https://docs.chhrone.web.id

## Troubleshooting

### Jika tunnel tidak connect:
1. Pastikan token sudah benar di `.env`
2. Check logs: `docker-compose logs cloudflared`
3. Restart service: `docker-compose restart cloudflared`

### Jika subdomain tidak bisa diakses:
1. Pastikan DNS records sudah terbuat di Cloudflare
2. Tunggu propagasi DNS (5-10 menit)
3. Check tunnel status di Cloudflare dashboard

### Security Settings:
- Tunnel otomatis menggunakan HTTPS
- Traffic di-encrypt end-to-end
- Tidak perlu expose port ke internet
- Firewall rules bisa diatur di Cloudflare
