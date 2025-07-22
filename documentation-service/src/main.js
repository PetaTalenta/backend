import { marked } from 'marked';
import hljs from 'highlight.js';

// Configure marked with highlight.js
marked.setOptions({
    highlight: function(code, lang) {
        if (lang && hljs.getLanguage(lang)) {
            try {
                return hljs.highlight(code, { language: lang }).value;
            } catch (err) {}
        }
        return hljs.highlightAuto(code).value;
    },
    breaks: true,
    gfm: true
});

// API Documentation content (will be loaded from external file)
const apiDocumentation = `# ATMA API Gateway - External API Documentation

## Overview
ATMA API Gateway adalah entry point tunggal untuk semua komunikasi dengan backend services. Gateway ini mengelola routing, authentication, rate limiting, dan security untuk seluruh sistem ATMA (AI-Driven Talent Mapping Assessment).

**Gateway Information:**
- **Service Name:** api-gateway
- **Port:** 3000
- **Base URL:** \`http://localhost:3000\`
- **Version:** 1.0.0

## 🏗️ Architecture Overview

\`\`\`
Client Application
       ↓
API Gateway (Port 3000)
       ↓
┌─────────────────┬─────────────────┬─────────────────┬─────────────────┐
│  Auth Service   │ Archive Service │Assessment Service│Notification Svc │
│   (Port 3001)   │   (Port 3002)   │   (Port 3003)   │   (Port 3005)   │
└─────────────────┴─────────────────┴─────────────────┴─────────────────┘
\`\`\`

## 🔐 Authentication

### JWT Token Authentication
Sebagian besar endpoint memerlukan JWT token yang diperoleh dari login.

**Header Required:**
\`\`\`
Authorization: Bearer <jwt_token>
\`\`\`

### Internal Service Authentication
Untuk komunikasi antar service (tidak untuk client):
\`\`\`
X-Service-Key: <internal_service_key>
X-Internal-Service: true
\`\`\`

## 📊 Rate Limiting

| Endpoint Type | Limit | Window |
|---------------|-------|--------|
| General Gateway | 5000 requests | 15 minutes |
| Auth Endpoints | 2500 requests | 15 minutes |
| Admin Endpoints | 1000 requests | 15 minutes |
| Assessment Endpoints | 1000 requests | 15 minutes |
| Archive Endpoints | 5000 requests | 15 minutes |

## 🌐 CORS Configuration

**Allowed Origins:** All origins (\`*\`) - Unlimited access
**Allowed Methods:** GET, POST, PUT, DELETE, OPTIONS
**Allowed Headers:** Content-Type, Authorization, X-Service-Key, X-Internal-Service

---

## 🔐 Authentication & User Management

### Public Authentication Endpoints

#### Register User
\`\`\`http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "myPassword1"
}
\`\`\`

**Validation Rules:**
- **email**: Valid email format, maximum 255 characters, required
- **password**: Minimum 8 characters, must contain at least one letter and one number, required

#### Batch Register Users
\`\`\`http
POST /api/auth/register/batch
Content-Type: application/json

{
  "users": [
    {"email": "user1@example.com", "password": "myPassword1"},
    {"email": "user2@example.com", "password": "anotherPass2"}
  ]
}
\`\`\`

**Validation Rules:**
- **users**: Array of user objects, maximum 50 users per batch, required
- Each user object follows same validation as single registration
- Duplicate emails within batch are not allowed

#### User Login
\`\`\`http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "myPassword1"
}
\`\`\`

**Validation Rules:**
- **email**: Valid email format, required
- **password**: Required (no specific format validation for login)

**Response:**
\`\`\`json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "user_type": "user",
      "token_balance": 100
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
\`\`\`

### Protected User Endpoints

#### Get User Profile
\`\`\`http
GET /api/auth/profile
Authorization: Bearer <token>
\`\`\`

#### Update User Profile
\`\`\`http
PUT /api/auth/profile
Authorization: Bearer <token>
Content-Type: application/json

{
  "username": "johndoe",
  "full_name": "John Doe",
  "school_id": 1,
  "date_of_birth": "1990-01-15",
  "gender": "male"
}
\`\`\`

**Validation Rules:**
- **username**: Alphanumeric only, 3-100 characters, optional
- **email**: Valid email format, maximum 255 characters, optional
- **full_name**: Maximum 100 characters, optional
- **school_id**: Positive integer, optional
- **date_of_birth**: ISO date format (YYYY-MM-DD), cannot be future date, optional
- **gender**: Must be one of: "male", "female", optional

#### Delete User Profile
\`\`\`http
DELETE /api/auth/profile
Authorization: Bearer <token>
\`\`\`

**Response:**
\`\`\`json
{
  "success": true,
  "message": "Profile deleted successfully"
}
\`\`\`

**⚠️ Note:** This endpoint only deletes the user profile (user_profiles table), not the user account itself. For complete user account deletion, use the DELETE /api/auth/account endpoint.

#### Delete User Account
\`\`\`http
DELETE /api/auth/account
Authorization: Bearer <token>
\`\`\`

**Response:**
\`\`\`json
{
  "success": true,
  "message": "Account deleted successfully",
  "data": {
    "deletedAt": "2024-01-15T10:30:00.000Z",
    "originalEmail": "user@example.com"
  }
}
\`\`\`

**⚠️ Important Notes:**
- This endpoint performs **soft delete** by changing the user's email to format \`deleted_{timestamp}_{original_email}\`
- User's token balance will be reset to 0
- User's \`is_active\` status will be set to \`false\`
- User profile will also be automatically deleted
- This operation cannot be undone, ensure confirmation before deleting account
- After account deletion, user cannot login with this account anymore

#### Change Password
\`\`\`http
POST /api/auth/change-password
Authorization: Bearer <token>
Content-Type: application/json

{
  "currentPassword": "oldPassword1",
  "newPassword": "newPassword2"
}
\`\`\`

**Validation Rules:**
- **currentPassword**: Required
- **newPassword**: Minimum 8 characters, must contain at least one letter and one number, required

#### Logout
\`\`\`http
POST /api/auth/logout
Authorization: Bearer <token>
\`\`\`

#### Get Token Balance
\`\`\`http
GET /api/auth/token-balance
Authorization: Bearer <token>
\`\`\`

### School Management

#### Get Schools
\`\`\`http
GET /api/auth/schools
Authorization: Bearer <token>
\`\`\`

#### Create School
\`\`\`http
POST /api/auth/schools
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "SMA Negeri 1 Jakarta",
  "address": "Jl. Sudirman No. 1",
  "city": "Jakarta",
  "province": "DKI Jakarta"
}
\`\`\`

**Validation Rules:**
- **name**: Maximum 200 characters, required
- **address**: Optional
- **city**: Maximum 100 characters, optional
- **province**: Maximum 100 characters, optional

#### Get Schools by Location
\`\`\`http
GET /api/auth/schools/by-location?city=Jakarta
Authorization: Bearer <token>
\`\`\`

#### Get School Users
\`\`\`http
GET /api/auth/schools/:schoolId/users
Authorization: Bearer <token>
\`\`\`

---

## 👨‍💼 Admin Management

### Admin Authentication

#### Admin Login
\`\`\`http
POST /api/admin/login
Content-Type: application/json

{
  "username": "admin",
  "password": "Admin123!"
}
\`\`\`

**Validation Rules:**
- **username**: Required (can be username or email)
- **password**: Required (no specific format validation for login)

### Protected Admin Endpoints

#### Get Admin Profile
\`\`\`http
GET /api/admin/profile
Authorization: Bearer <admin_token>
\`\`\`

#### Register New Admin (Superadmin only)
\`\`\`http
POST /api/admin/register
Authorization: Bearer <superadmin_token>
Content-Type: application/json

{
  "username": "newadmin",
  "email": "newadmin@atma.com",
  "password": "NewAdmin123!",
  "full_name": "New Admin",
  "user_type": "admin"
}
\`\`\`

**Validation Rules:**
- **username**: Alphanumeric only, 3-100 characters, required
- **email**: Valid email format, maximum 255 characters, required
- **password**: Minimum 8 characters, maximum 128 characters, must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&), required
- **full_name**: Maximum 255 characters, optional
- **user_type**: Must be one of: "admin", "superadmin", "moderator", defaults to "admin"

---

## 🚀 Getting Started

### 1. Register & Login
\`\`\`javascript
// Register
const registerResponse = await fetch('/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'myPassword1'  // Must contain letter + number, min 8 chars
  })
});

// Login
const loginResponse = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'myPassword1'
  })
});

const { data } = await loginResponse.json();
const token = data.token;
\`\`\`

### 2. Submit Assessment
\`\`\`javascript
const assessmentResponse = await fetch('/api/assessment/submit', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': \`Bearer \${token}\`,
    'X-Idempotency-Key': 'unique-key-123'
  },
  body: JSON.stringify({
    assessmentName: 'AI-Driven Talent Mapping',
    riasec: {
      realistic: 75, investigative: 80, artistic: 65,
      social: 70, enterprising: 85, conventional: 60
    },
    ocean: {
      openness: 80, conscientiousness: 75, extraversion: 70,
      agreeableness: 85, neuroticism: 40
    },
    viaIs: {
      creativity: 80, curiosity: 85, judgment: 75,
      loveOfLearning: 90, perspective: 70, bravery: 65,
      perseverance: 80, honesty: 85, zest: 75,
      love: 80, kindness: 85, socialIntelligence: 75,
      teamwork: 80, fairness: 85, leadership: 70,
      forgiveness: 75, humility: 80, prudence: 75,
      selfRegulation: 80, appreciationOfBeauty: 70,
      gratitude: 85, hope: 80, humor: 75, spirituality: 60
    }
  })
});

const { data } = await assessmentResponse.json();
const jobId = data.jobId;
\`\`\`

---

**Last Updated:** 2024-01-21
**API Version:** 1.0.0
**Gateway Version:** 1.0.0
`;

// Navigation structure
const navigationStructure = [
    { id: 'overview', title: 'Overview', level: 1 },
    { id: 'architecture-overview', title: 'Architecture Overview', level: 1 },
    { id: 'authentication', title: 'Authentication', level: 1 },
    { id: 'rate-limiting', title: 'Rate Limiting', level: 1 },
    { id: 'cors-configuration', title: 'CORS Configuration', level: 1 },
    { id: 'authentication--user-management', title: 'Authentication & User Management', level: 1 },
    { id: 'public-authentication-endpoints', title: 'Public Authentication Endpoints', level: 2 },
    { id: 'register-user', title: 'Register User', level: 3 },
    { id: 'batch-register-users', title: 'Batch Register Users', level: 3 },
    { id: 'user-login', title: 'User Login', level: 3 },
    { id: 'protected-user-endpoints', title: 'Protected User Endpoints', level: 2 },
    { id: 'get-user-profile', title: 'Get User Profile', level: 3 },
    { id: 'update-user-profile', title: 'Update User Profile', level: 3 },
    { id: 'delete-user-profile', title: 'Delete User Profile', level: 3 },
    { id: 'delete-user-account', title: 'Delete User Account', level: 3 },
    { id: 'change-password', title: 'Change Password', level: 3 },
    { id: 'logout', title: 'Logout', level: 3 },
    { id: 'get-token-balance', title: 'Get Token Balance', level: 3 },
    { id: 'school-management', title: 'School Management', level: 2 },
    { id: 'get-schools', title: 'Get Schools', level: 3 },
    { id: 'create-school', title: 'Create School', level: 3 },
    { id: 'get-schools-by-location', title: 'Get Schools by Location', level: 3 },
    { id: 'get-school-users', title: 'Get School Users', level: 3 },
    { id: 'admin-management', title: 'Admin Management', level: 1 },
    { id: 'admin-authentication', title: 'Admin Authentication', level: 2 },
    { id: 'admin-login', title: 'Admin Login', level: 3 },
    { id: 'protected-admin-endpoints', title: 'Protected Admin Endpoints', level: 2 },
    { id: 'get-admin-profile', title: 'Get Admin Profile', level: 3 },
    { id: 'register-new-admin-superadmin-only', title: 'Register New Admin (Superadmin only)', level: 3 },
    { id: 'getting-started', title: 'Getting Started', level: 1 },
    { id: '1-register--login', title: '1. Register & Login', level: 2 },
    { id: '2-submit-assessment', title: '2. Submit Assessment', level: 2 }
];

// DOM elements
const navMenu = document.getElementById('nav-menu');
const contentBody = document.getElementById('content-body');
const searchInput = document.getElementById('search-input');
const menuToggle = document.getElementById('menu-toggle');
const sidebar = document.querySelector('.sidebar');

// Generate navigation
function generateNavigation() {
    let navHTML = '';
    let currentSection = '';

    navigationStructure.forEach(item => {
        if (item.level === 1) {
            if (currentSection) {
                navHTML += '</div>'; // Close previous section
            }
            navHTML += `<div class="nav-section">`;
            navHTML += `<div class="nav-section-title">${item.title}</div>`;
            currentSection = item.title;
        }

        const indent = item.level > 1 ? `style="padding-left: ${1.5 + (item.level - 2) * 0.5}rem"` : '';
        navHTML += `<a href="#${item.id}" class="nav-item" ${indent}>${item.title}</a>`;
    });

    if (currentSection) {
        navHTML += '</div>'; // Close last section
    }

    navMenu.innerHTML = navHTML;
}

// Generate content
function generateContent() {
    contentBody.innerHTML = marked(apiDocumentation);

    // Add IDs to headings for navigation
    const headings = contentBody.querySelectorAll('h1, h2, h3, h4, h5, h6');
    headings.forEach(heading => {
        const text = heading.textContent;
        const id = text.toLowerCase()
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/--+/g, '-')
            .trim();
        heading.id = id;
    });
}

// Search functionality
function setupSearch() {
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const navItems = document.querySelectorAll('.nav-item');

        navItems.forEach(item => {
            const text = item.textContent.toLowerCase();
            if (text.includes(searchTerm)) {
                item.style.display = 'block';
            } else {
                item.style.display = 'none';
            }
        });

        // Also highlight content
        if (searchTerm) {
            highlightSearchResults(searchTerm);
        } else {
            removeHighlights();
        }
    });
}

// Highlight search results in content
function highlightSearchResults(searchTerm) {
    removeHighlights();

    const walker = document.createTreeWalker(
        contentBody,
        NodeFilter.SHOW_TEXT,
        null,
        false
    );

    const textNodes = [];
    let node;

    while (node = walker.nextNode()) {
        textNodes.push(node);
    }

    textNodes.forEach(textNode => {
        const text = textNode.textContent;
        const regex = new RegExp(`(${searchTerm})`, 'gi');

        if (regex.test(text)) {
            const highlightedText = text.replace(regex, '<mark class="highlight">$1</mark>');
            const wrapper = document.createElement('span');
            wrapper.innerHTML = highlightedText;
            textNode.parentNode.replaceChild(wrapper, textNode);
        }
    });
}

// Remove search highlights
function removeHighlights() {
    const highlights = contentBody.querySelectorAll('.highlight');
    highlights.forEach(highlight => {
        const parent = highlight.parentNode;
        parent.replaceChild(document.createTextNode(highlight.textContent), highlight);
        parent.normalize();
    });
}

// Navigation click handling
function setupNavigation() {
    navMenu.addEventListener('click', (e) => {
        if (e.target.classList.contains('nav-item')) {
            e.preventDefault();

            // Remove active class from all nav items
            document.querySelectorAll('.nav-item').forEach(item => {
                item.classList.remove('active');
            });

            // Add active class to clicked item
            e.target.classList.add('active');

            // Scroll to section
            const targetId = e.target.getAttribute('href').substring(1);
            const targetElement = document.getElementById(targetId);

            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }

            // Close sidebar on mobile
            if (window.innerWidth <= 768) {
                sidebar.classList.remove('open');
            }
        }
    });
}

// Mobile menu toggle
function setupMobileMenu() {
    menuToggle.addEventListener('click', () => {
        sidebar.classList.toggle('open');
    });

    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 768 &&
            !sidebar.contains(e.target) &&
            !menuToggle.contains(e.target)) {
            sidebar.classList.remove('open');
        }
    });
}

// Scroll spy for active navigation
function setupScrollSpy() {
    const headings = contentBody.querySelectorAll('h1, h2, h3, h4, h5, h6');

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const id = entry.target.id;
                const navItem = document.querySelector(`a[href="#${id}"]`);

                if (navItem) {
                    // Remove active class from all nav items
                    document.querySelectorAll('.nav-item').forEach(item => {
                        item.classList.remove('active');
                    });

                    // Add active class to current item
                    navItem.classList.add('active');
                }
            }
        });
    }, {
        rootMargin: '-20% 0px -70% 0px'
    });

    headings.forEach(heading => {
        observer.observe(heading);
    });
}

// Initialize the application
function init() {
    generateNavigation();
    generateContent();
    setupSearch();
    setupNavigation();
    setupMobileMenu();
    setupScrollSpy();
}

// Start the application when DOM is loaded
document.addEventListener('DOMContentLoaded', init);
