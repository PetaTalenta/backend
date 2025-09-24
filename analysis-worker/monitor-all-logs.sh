#!/bin/bash

# Nama container analysis worker
docker_container_name="analysis-worker"

# Mengecek apakah container berjalan
container_status=$(docker ps --filter "name=$docker_container_name" --format "{{.Names}}")

if [ "$container_status" == "$docker_container_name" ]; then
    echo "Container '$docker_container_name' sedang berjalan. Menampilkan log..."
    # Menampilkan log secara real-time
    docker logs -f $docker_container_name
else
    echo "Container '$docker_container_name' tidak ditemukan atau tidak berjalan."
    echo "Pastikan container sudah dijalankan."
fi