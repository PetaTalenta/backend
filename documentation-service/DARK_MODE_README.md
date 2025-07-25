# Dark Mode Implementation for ATMA API Documentation

## Overview
The ATMA API Documentation now supports both light and dark themes, providing a better user experience for developers working in different lighting conditions.

## Features

### 🌙 Theme Toggle
- **Location**: Top-right corner of the header, next to the Base URL
- **Icon**: 🌙 for light mode, ☀️ for dark mode
- **Functionality**: Click to toggle between light and dark themes

### 🎨 Visual Improvements
- **Smooth Transitions**: All theme changes are animated with smooth CSS transitions
- **Consistent Color Scheme**: All UI elements adapt to the selected theme
- **Code Block Theming**: Syntax highlighting adapts to the current theme
- **Persistent Preference**: Theme choice is saved in localStorage

### 🎯 Theme-Aware Components

#### Color Variables
- **Light Theme**: Clean whites and light grays with blue accents
- **Dark Theme**: Deep blues and grays with brighter accents for better contrast

#### Styled Elements
- Headers and navigation
- **Code blocks and syntax highlighting** (fully themed with Prism.js integration)
- Method badges (GET, POST, PUT, DELETE)
- Authentication and rate limit badges
- Parameter requirement indicators
- Tables and cards
- Scrollbars (WebKit browsers)

#### Enhanced Code Block Theming
- **Prism.js Integration**: Complete dark theme support for all syntax highlighting
- **Language-Specific Colors**: JSON, JavaScript, Python, Bash, and HTTP styling
- **Token-Level Theming**: Comments, strings, keywords, functions, etc.
- **Inline Code**: Proper dark theme styling for inline code elements
- **Selection Colors**: Theme-appropriate text selection colors

## Technical Implementation

### CSS Variables
The implementation uses CSS custom properties (variables) for easy theme switching:

```css
:root {
  /* Light theme variables */
  --background: #ffffff;
  --text-primary: #1e293b;
  /* ... */
}

[data-theme="dark"] {
  /* Dark theme variables */
  --background: #0f172a;
  --text-primary: #f1f5f9;
  /* ... */
}
```

### JavaScript Theme Management
- Theme state is managed in the `DocumentationApp` class
- User preference is stored in `localStorage`
- Theme is applied via `data-theme` attribute on the document element

### Key Methods
- `initializeTheme()`: Applies saved theme on page load
- `setupThemeToggle()`: Sets up the toggle button event listener
- `toggleTheme()`: Switches between themes and saves preference
- `updateThemeToggleIcon()`: Updates the toggle button icon and tooltip

## Usage

### For Users
1. **Toggle Theme**: Click the moon/sun icon in the top-right corner
2. **Automatic Persistence**: Your theme preference is automatically saved
3. **Consistent Experience**: Theme persists across page reloads and sessions

### For Developers
The theme system is easily extensible:

1. **Add New Theme Variables**: Define new CSS custom properties in both light and dark theme sections
2. **Apply to Components**: Use `var(--variable-name)` in your CSS
3. **Add Transitions**: Include `transition` properties for smooth theme changes

## Browser Support
- **Modern Browsers**: Full support with smooth transitions
- **Legacy Browsers**: Graceful fallback to light theme
- **Mobile Devices**: Fully responsive theme switching

## File Structure
```
documentation-service/
├── src/
│   ├── styles/
│   │   └── main.css          # Contains all theme variables and styles
│   └── main.js               # Theme management logic
├── index.html                # Theme toggle button
└── DARK_MODE_README.md       # This documentation
```

## Future Enhancements
- System theme detection (prefers-color-scheme)
- Additional theme variants (high contrast, etc.)
- Theme-specific syntax highlighting schemes
- Accessibility improvements for theme switching

## Testing
To test the dark mode implementation:

1. Start the development server: `npm run dev`
2. Open `http://localhost:3007/` in your browser
3. Click the theme toggle button to switch between light and dark modes
4. Verify that all UI elements adapt correctly
5. Refresh the page to confirm theme persistence

The dark mode implementation provides a modern, accessible, and user-friendly experience for the ATMA API documentation.
