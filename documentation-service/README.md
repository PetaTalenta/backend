# ATMA Documentation Service

Simple documentation service untuk menampilkan API documentation dari ATMA API Gateway menggunakan Vite, HTML, CSS, dan JavaScript.

## Features

- 📖 **Clean Documentation Display** - Menampilkan dokumentasi API dengan styling yang clean dan mudah dibaca
- 🔍 **Search Functionality** - Pencarian real-time di navigation dan content
- 📱 **Responsive Design** - Mobile-friendly dengan sidebar yang collapsible
- 🎯 **Navigation** - Auto-generated navigation dari struktur dokumentasi
- ✨ **Syntax Highlighting** - Code blocks dengan syntax highlighting menggunakan highlight.js
- 🔗 **Smooth Scrolling** - Navigation dengan smooth scrolling ke section yang dipilih
- 👁️ **Scroll Spy** - Active navigation berdasarkan section yang sedang dilihat

## Tech Stack

- **Vite** - Build tool dan dev server
- **Marked** - Markdown parser untuk mengkonversi markdown ke HTML
- **Highlight.js** - Syntax highlighting untuk code blocks
- **Vanilla JavaScript** - Untuk interaktivity
- **CSS3** - Styling dengan modern CSS features

## Installation & Setup

1. **Install dependencies:**
   ```bash
   cd documentation-service
   npm install
   ```

2. **Run development server:**
   ```bash
   npm run dev
   ```
   
   Server akan berjalan di `http://localhost:5173`

3. **Build for production:**
   ```bash
   npm run build
   ```

4. **Preview production build:**
   ```bash
   npm run preview
   ```

## Project Structure

```
documentation-service/
├── index.html          # Main HTML file
├── package.json        # Dependencies dan scripts
├── vite.config.js      # Vite configuration
├── README.md          # Documentation
└── src/
    ├── main.js        # Main JavaScript file dengan dokumentasi content
    └── style.css      # Styling untuk dokumentasi
```

## Features Detail

### Navigation
- Auto-generated dari struktur heading di dokumentasi
- Hierarchical navigation dengan indentation
- Active state berdasarkan scroll position
- Mobile-friendly dengan collapsible sidebar

### Search
- Real-time search di navigation items
- Highlight search results di content
- Case-insensitive search

### Responsive Design
- Desktop: Sidebar tetap terlihat
- Mobile: Sidebar collapsible dengan hamburger menu
- Optimized untuk berbagai ukuran screen

### Code Highlighting
- Automatic language detection
- Support untuk HTTP, JSON, JavaScript, dan bahasa lainnya
- Clean styling yang mudah dibaca

## Customization

### Mengganti Content
Edit bagian `apiDocumentation` di `src/main.js` untuk mengganti content dokumentasi.

### Styling
Edit `src/style.css` untuk mengubah appearance:
- Colors: Ubah color variables di bagian atas file
- Typography: Ubah font family dan sizes
- Layout: Ubah spacing dan dimensions

### Navigation Structure
Edit array `navigationStructure` di `src/main.js` untuk mengubah struktur navigation.

## Browser Support

- Chrome/Edge 88+
- Firefox 85+
- Safari 14+

## Performance

- Lightweight bundle size
- Fast loading dengan Vite
- Optimized CSS dan JavaScript
- Lazy loading untuk large content

## Development

Untuk development, jalankan:
```bash
npm run dev
```

File akan auto-reload saat ada perubahan.

## Production Deployment

1. Build project:
   ```bash
   npm run build
   ```

2. Deploy folder `dist/` ke web server atau hosting service.

3. Untuk static hosting (GitHub Pages, Netlify, Vercel), pastikan routing di-handle dengan benar.

## License

MIT License - Bebas digunakan untuk project ATMA.
