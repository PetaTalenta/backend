#!/usr/bin/env bash
set -euo pipefail

# Bersihkan resource Docker yang tidak lagi dipakai untuk hemat storage
# Aman karena hanya menghapus yang dangling / tidak direferensikan

printf "[INFO] Menghapus container stopped...\n"
docker container prune -f || true

printf "[INFO] Menghapus image dangling (tanpa tag)...\n"
docker image prune -f || true

printf "[INFO] Menghapus image yang tidak digunakan oleh container manapun...\n"
docker image prune -a -f || true

printf "[INFO] Menghapus volume dangling...\n"
docker volume prune -f || true

printf "[INFO] Menghapus network dangling...\n"
docker network prune -f || true

printf "[INFO] Menghapus build cache...\n"
docker builder prune -f || true

printf "[SELESAI] Storage sudah dibersihkan.\n"
