# Cloudflare Zero Trust Tunnel Setup

Setup ini akan mengekspos:
- `localhost:3000` (API Gateway) → `https://api.chhrone.web.id`
- `localhost:8080` (Documentation) → `https://docs.chhrone.web.id`

## Prerequisites

1. Domain `chhrone.web.id` sudah terdaftar di Cloudflare
2. Docker dan Docker Compose terinstall
3. Akses ke Cloudflare Zero Trust Dashboard

## Quick Setup

### 1. Dapatkan Tunnel Token

1. Login ke [Cloudflare Zero Trust Dashboard](https://one.dash.cloudflare.com/)
2. Pergi ke **Access** → **Tunnels**
3. Klik **Create a tunnel**
4. Pilih **Cloudflared**
5. Nama tunnel: `atma-tunnel`
6. Klik **Save tunnel**
7. **SKIP** langkah "Install connector"
8. Di bagian **Route traffic**, tambahkan:

   **Route 1:**
   - Subdomain: `api`
   - Domain: `chhrone.web.id`
   - Type: `HTTP`
   - URL: `api-gateway:3000`

   **Route 2:**
   - Subdomain: `docs`
   - Domain: `chhrone.web.id`
   - Type: `HTTP`
   - URL: `documentation-service:80`

9. Copy **tunnel token** yang ditampilkan

### 2. Jalankan Setup Script

**Windows (PowerShell):**
```powershell
.\setup-tunnel.ps1 "YOUR_TUNNEL_TOKEN_HERE"
```

**Linux/Mac:**
```bash
chmod +x setup-tunnel.sh
./setup-tunnel.sh "YOUR_TUNNEL_TOKEN_HERE"
```

**Manual Setup:**
```bash
# Update .env file
echo "CLOUDFLARE_TUNNEL_TOKEN=YOUR_TUNNEL_TOKEN_HERE" > .env

# Start services
docker-compose up -d
```

## Verifikasi

1. Check tunnel status:
   ```bash
   docker-compose logs cloudflared
   ```

2. Test endpoints:
   - API: https://api.chhrone.web.id
   - Docs: https://docs.chhrone.web.id

## Troubleshooting

### Tunnel tidak connect
```bash
# Check logs
docker-compose logs cloudflared

# Restart tunnel
docker-compose restart cloudflared
```

### Domain tidak bisa diakses
1. Pastikan DNS records sudah terbuat di Cloudflare
2. Tunggu propagasi DNS (5-10 menit)
3. Check tunnel status di Cloudflare dashboard

### Service tidak respond
```bash
# Check individual services
docker-compose logs api-gateway
docker-compose logs documentation-service

# Restart specific service
docker-compose restart api-gateway
```

## Security Features

- ✅ HTTPS otomatis (SSL/TLS termination di Cloudflare)
- ✅ Traffic encryption end-to-end
- ✅ Tidak perlu expose port ke internet
- ✅ DDoS protection dari Cloudflare
- ✅ Access policies bisa diatur di Cloudflare

## Management Commands

```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# Restart tunnel only
docker-compose restart cloudflared

# View logs
docker-compose logs -f cloudflared
docker-compose logs -f api-gateway

# Update tunnel token
echo "CLOUDFLARE_TUNNEL_TOKEN=new_token" > .env
docker-compose restart cloudflared
```

## Architecture

```
Internet → Cloudflare Edge → Tunnel → Docker Network
                                   ├── api-gateway:3000
                                   └── documentation-service:80
```

## Files Added/Modified

- `docker-compose.yml` - Added cloudflared service
- `.env` - Tunnel token storage
- `setup-tunnel.ps1` - Windows setup script
- `setup-tunnel.sh` - Linux/Mac setup script
- `cloudflare-tunnel-config.yml` - Tunnel configuration (reference)
- `setup-cloudflare-tunnel.md` - Detailed setup guide
