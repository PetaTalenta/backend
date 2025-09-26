# ATMA API Documentation Service

Interactive documentation service for the AI-Driven Talent Mapping Assessment (ATMA) backend ecosystem. This service provides comprehensive API documentation for all ATMA services with an intuitive, searchable interface.

## 🚀 Features

- **Interactive API Documentation** - Browse all ATMA API endpoints with detailed examples
- **Real-time Search** - Find endpoints quickly with intelligent search functionality
- **Syntax Highlighting** - Beautiful code highlighting for all programming languages
- **Copy to Clipboard** - One-click copying of code examples and endpoints
- **Responsive Design** - Works perfectly on desktop, tablet, and mobile devices
- **Service Overview** - Comprehensive overview of the ATMA ecosystem architecture

## 📋 Services Documented

### 🔐 Auth Service (Port 3001)
- User registration and authentication
- JWT token management
- Profile management
- Password changes and account deletion

### 🎯 Assessment Service (Port 3003)
- AI-driven personality assessments
- RIASEC, OCEAN, and VIA-IS frameworks
- Job queue monitoring and status tracking
- Assessment submission and processing

### 📊 Archive Service (Port 3002)
- Assessment results retrieval
- Historical data and statistics
- Data export functionality
- Result management and deletion

### 💬 Chatbot Service (Port 3004)
- AI-powered career guidance conversations
- Assessment interpretation and recommendations
- Conversation management
- Intelligent suggestion system

### 🔧 Admin Service (Port 3007)
- Admin orchestrator and proxy service
- Centralized admin authentication and management
- User management and token balance operations
- Proxies requests to auth-service and archive-service

## 🛠 Technology Stack

- **Frontend**: Vanilla JavaScript with Vite
- **Styling**: Custom CSS with modern design principles
- **Syntax Highlighting**: PrismJS
- **Build Tool**: Vite for fast development and optimized builds
- **Base URL**: `api.futureguide.id`

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### Installation

1. **Clone or navigate to the documentation service directory**
   ```bash
   cd documentation-service
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   Navigate to `http://localhost:3007`

### Build for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

### Preview Production Build

```bash
npm run preview
```

## 📁 Project Structure

```
documentation-service/
├── public/
│   └── favicon.svg              # Service favicon
├── src/
│   ├── data/                    # API documentation data
│   │   ├── auth-service.js      # Auth service endpoints
│   │   ├── assessment-service.js # Assessment service endpoints
│   │   ├── archive-service.js   # Archive service endpoints
│   │   ├── chatbot-service.js   # Chatbot service endpoints
│   │   └── admin-service.js     # Admin service endpoints
│   ├── styles/
│   │   ├── main.css            # Main application styles
│   │   └── prism.css           # Syntax highlighting styles
│   └── main.js                 # Main application logic
├── index.html                  # Main HTML file
├── vite.config.js             # Vite configuration
├── package.json               # Project dependencies
└── README.md                  # This file
```

## 🎨 Features Overview

### Navigation
- **Sticky sidebar** with service navigation
- **Smooth scrolling** to sections
- **Active section highlighting** based on scroll position
- **Responsive mobile menu** for smaller screens

### Search Functionality
- **Real-time filtering** of endpoints
- **Search across** endpoint titles, paths, and descriptions
- **Instant results** with no page reload

### Code Examples
- **Multiple language examples** (JavaScript, Python, cURL)
- **Syntax highlighting** for all code blocks
- **Copy to clipboard** functionality
- **Tabbed interface** for different programming languages

### Interactive Elements
- **Collapsible sections** for better organization
- **Hover effects** and smooth transitions
- **Method badges** with color coding (GET, POST, PUT, DELETE)
- **Authentication indicators** for protected endpoints

## 🔧 Configuration

### Base URL Configuration
The base URL is configured to `api.futureguide.id` and can be updated in the service data files if needed.

### Rate Limiting Information
Each service has different rate limits:
- **Auth Service**: 2500 requests per 15 minutes
- **Assessment Service**: 1000 requests per 1 hour
- **Archive Service**: 2000 requests per 15 minutes
- **Chatbot Service**: 200 requests per 15 minutes

### Development Server
The development server runs on port 3007 by default. This can be changed in `vite.config.js`.

## 📚 API Documentation Structure

Each service documentation includes:
- **Service overview** with description and technical details
- **Authentication requirements** and token usage
- **Rate limiting information** for each endpoint
- **Request/response examples** with real data
- **Parameter documentation** with types and validation rules
- **Error handling** with common error codes and responses

## 🤝 Contributing

To add new endpoints or update existing documentation:

1. **Update service data files** in `src/data/`
2. **Follow the existing structure** for consistency
3. **Test the changes** in development mode
4. **Ensure all examples work** with the actual API

## 📄 License

This documentation service is part of the ATMA backend ecosystem.

## 🔗 Related Services

- **Auth Service**: User authentication and management
- **Assessment Service**: AI-driven personality assessments
- **Archive Service**: Data storage and retrieval
- **Chatbot Service**: AI-powered career guidance
- **Admin Service**: Admin orchestrator and user management

## 📞 Support

For questions about the API documentation or to report issues, please contact the ATMA development team.

---

**Built with ❤️ for the ATMA ecosystem**
