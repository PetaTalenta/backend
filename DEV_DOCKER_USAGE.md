# Development Docker Setup

File ini menjelaskan cara pakai setup dev dengan bind mount agar edit kode langsung reflect tanpa rebuild image.

## Menjalankan Environment Development

Pastikan file `.env` sudah terisi variable yang dibutuhkan seperti di `docker-compose.yml`.

Jalankan:

```
docker compose up --build
```

`docker compose` otomatis memuat `docker-compose.override.yml` sehingga:
- Kode service Node dimount ke container (`./service:/app`)
- `node_modules` tetap pakai layer container (anonymous volume `/app/node_modules`) agar dependency tidak ketimpa host
- Command service berubah ke `npm run dev` (nodemon) sehingga reload otomatis saat file berubah
- Dev dependencies ikut di-install karena arg `INCLUDE_DEV_DEPS=true`

Kalau ingin jalankan tanpa override (simulasi production lokal):
```
docker compose -f docker-compose.yml up --build
```

## Menambah Service Baru
1. Pastikan Dockerfile baru mengikuti pola ARG:
   ```dockerfile
   ARG INCLUDE_DEV_DEPS=false
   COPY package*.json ./
   RUN if [ "$INCLUDE_DEV_DEPS" = "true" ]; then npm ci && npm cache clean --force; else npm ci --only=production && npm cache clean --force; fi
   ```
2. Tambahkan entry di `docker-compose.override.yml` mirip service lain.

## Membersihkan Resource Docker Lama
Script disediakan: `scripts/docker-clean.sh`

Jalankan:
```
./scripts/docker-clean.sh
```
Akan menghapus:
- Stopped containers
- Dangling / unused images
- Dangling volumes & networks
- Build cache

## Tips Performa di Linux
- Pastikan gunakan Docker Engine terbaru.
- Gunakan format logging default (sudah json-file dengan limit di beberapa service).
- Jika nodemon terasa lambat, bisa batasi watch path via `nodemon.json` (optional improvement).

## Troubleshooting
- Perubahan tidak reload: pastikan file tersimpan dan service pakai `npm run dev` (lihat `docker compose ps`).
- Module hilang / error require: hapus anonymous volume service: `docker compose down -v` lalu `docker compose up --build`.
- Port conflict: ubah mapping host di `docker-compose.override.yml` jika perlu.

Selamat ngoding cepat tanpa rebuild tiap edit! 🎯
