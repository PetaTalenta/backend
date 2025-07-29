@echo off

echo Melakukan rebuild container...
docker-compose build archive-service documentation-service chatbot-service api-gateway assessment-service notification-service auth-service analysis-worker1 analysis-worker2
docker-compose up -d archive-service documentation-service chatbot-service api-gateway assessment-service notification-service auth-service analysis-worker

echo Memulai log monitoring untuk container...

start "archive" cmd /k docker logs -f a6e1ceb4d93c
start "doc" cmd /k docker logs -f 9cfad668bbb8
start "chatbot" cmd /k docker logs -f 3c098d326b49
start "gateway" cmd /k docker logs -f 81fa96b9a668
start "assessment" cmd /k docker logs -f 53a6a1cb3388
start "notif" cmd /k docker logs -f 0517f689aa40
start "auth" cmd /k docker logs -f a8adf089c86c
start "worker2" cmd /k docker logs -f 9e072e785398
start "worker1" cmd /k docker logs -f f428624fcba3

echo Semua log telah dibuka di jendela terpisah.
