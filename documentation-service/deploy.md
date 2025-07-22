# Deployment Guide

## Build untuk Production

```bash
npm run build
```

File hasil build akan tersimpan di folder `dist/`.

## Preview Production Build

```bash
npm run preview
```

## Deployment Options

### 1. Static Hosting (Recommended)

Karena ini adalah aplikasi static, Anda bisa deploy ke:

#### Netlify
1. Connect repository ke Netlify
2. Set build command: `npm run build`
3. Set publish directory: `dist`
4. Deploy

#### Vercel
1. Import project ke Vercel
2. Framework preset akan otomatis terdeteksi sebagai Vite
3. Deploy

#### GitHub Pages
1. Build project: `npm run build`
2. Push folder `dist` ke branch `gh-pages`
3. Enable GitHub Pages di repository settings

### 2. Server Deployment

#### Nginx
```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        root /path/to/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }
}
```

#### Apache
```apache
<VirtualHost *:80>
    ServerName your-domain.com
    DocumentRoot /path/to/dist
    
    <Directory /path/to/dist>
        AllowOverride All
        Require all granted
    </Directory>
</VirtualHost>
```

### 3. Docker

```dockerfile
FROM nginx:alpine
COPY dist/ /usr/share/nginx/html/
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

Build dan run:
```bash
docker build -t atma-docs .
docker run -p 80:80 atma-docs
```

## Environment Configuration

Untuk production, pastikan:
1. Base URL sesuai dengan environment
2. HTTPS enabled
3. Proper caching headers
4. Gzip compression enabled

## Performance Optimization

1. **Minification**: Sudah otomatis dengan Vite
2. **Tree Shaking**: Sudah otomatis dengan Vite
3. **Code Splitting**: Bisa ditambahkan jika diperlukan
4. **CDN**: Deploy assets ke CDN untuk performa lebih baik

## Monitoring

Setelah deployment, monitor:
1. Page load time
2. Error rates
3. User engagement
4. Mobile responsiveness
