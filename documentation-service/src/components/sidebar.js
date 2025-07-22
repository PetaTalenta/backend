export function renderSidebar(apiData, currentSection) {
  const sections = [
    { key: 'overview', title: 'Overview', icon: '📋' },
    { key: 'authentication', title: 'Authentication', icon: '🔐' },
    { key: 'schools', title: 'School Management', icon: '🏫' },
    { key: 'admin', title: 'Admin Management', icon: '👨‍💼' },
    { key: 'assessment', title: 'Assessment Service', icon: '🎯' },
    { key: 'archive', title: 'Archive Service', icon: '📊' },
    { key: 'websocket', title: 'WebSocket', icon: '🔔' },
    { key: 'health', title: 'Health & Monitoring', icon: '🔍' },
    { key: 'errors', title: 'Error Handling', icon: '❌' }
  ]

  return `
    <div class="sidebar-header">
      <h1>ATMA API</h1>
      <p>Documentation v1.0.0</p>
    </div>
    
    <nav class="sidebar-nav">
      <div class="nav-section">
        <div class="nav-section-title">API Documentation</div>
        ${sections.map(section => `
          <a href="#" 
             class="nav-link ${currentSection === section.key ? 'active' : ''}" 
             data-section="${section.key}">
            <span class="nav-icon">${section.icon}</span>
            ${section.title}
          </a>
        `).join('')}
      </div>
    </nav>
  `
}
