export function renderContent(apiData, section) {
  const data = apiData[section]
  
  if (!data) {
    return '<div class="content-header"><h1>Section not found</h1></div>'
  }

  switch (section) {
    case 'overview':
      return renderOverview(data)
    case 'authentication':
    case 'admin':
    case 'assessment':
    case 'archive':
      return renderEndpointSection(data)
    case 'websocket':
      return renderWebSocketSection(data)
    case 'errors':
      return renderErrorSection(data)
    default:
      return renderGenericSection(data)
  }
}

function renderOverview(data) {
  return `
    <div class="content-header">
      <h1 class="content-title">${data.title}</h1>
      <p class="content-description">${data.description}</p>
    </div>
    
    <div class="endpoint-section">
      <h2>Gateway Information</h2>
      <div class="info-box">
        <h4>Base URL</h4>
        <code>${data.baseUrl}</code>
      </div>
      <div class="info-box">
        <h4>Version</h4>
        <code>${data.version}</code>
      </div>
    </div>

    <div class="endpoint-section">
      <h2>${data.architecture.title}</h2>
      <p>${data.architecture.description}</p>
    </div>

    <div class="endpoint-section">
      <h2>Authentication</h2>
      <p>Sebagian besar endpoint memerlukan JWT token yang diperoleh dari login.</p>
      <div class="code-block">
        <button class="copy-btn">Copy</button>
        <pre><code>Authorization: Bearer &lt;jwt_token&gt;</code></pre>
      </div>
    </div>

    <div class="endpoint-section">
      <h2>Rate Limiting</h2>
      <ul>
        <li>General Gateway: 5000 requests / 15 minutes</li>
        <li>Auth Endpoints: 2500 requests / 15 minutes</li>
        <li>Admin Endpoints: 1000 requests / 15 minutes</li>
        <li>Assessment Endpoints: 1000 requests / 15 minutes</li>
        <li>Archive Endpoints: 5000 requests / 15 minutes</li>
      </ul>
    </div>

    <div class="endpoint-section">
      <h2>Getting Started</h2>
      <p>Untuk mulai menggunakan ATMA API, ikuti langkah-langkah berikut:</p>
      <ol>
        <li>Register user baru atau login dengan akun existing</li>
        <li>Dapatkan JWT token dari response login</li>
        <li>Gunakan token untuk mengakses protected endpoints</li>
        <li>Submit assessment data untuk mendapatkan analysis</li>
        <li>Monitor progress melalui WebSocket atau polling</li>
        <li>Retrieve hasil analysis dari archive service</li>
      </ol>
    </div>
  `
}

function renderEndpointSection(data) {
  return `
    <div class="content-header">
      <h1 class="content-title">${data.title}</h1>
      <p class="content-description">${data.description}</p>
    </div>
    
    ${data.endpoints.map(endpoint => renderEndpoint(endpoint)).join('')}
  `
}

function renderEndpoint(endpoint) {
  return `
    <div class="endpoint-section">
      <div class="endpoint-title">
        <span class="method-badge method-${endpoint.method.toLowerCase()}">${endpoint.method}</span>
        ${endpoint.title}
      </div>
      
      <div class="endpoint-url">
        <strong>${endpoint.method}</strong> ${endpoint.url}
      </div>
      
      <p>${endpoint.description}</p>
      
      ${endpoint.headers ? `
        <h4>Headers</h4>
        <div class="code-block">
          <button class="copy-btn">Copy</button>
          <pre><code>${endpoint.headers.join('\n')}</code></pre>
        </div>
      ` : ''}
      
      ${endpoint.queryParams ? `
        <h4>Query Parameters</h4>
        <ul>
          ${endpoint.queryParams.map(param => `<li>${param}</li>`).join('')}
        </ul>
      ` : ''}
      
      ${endpoint.body ? `
        <h4>Request Body</h4>
        <div class="code-block">
          <button class="copy-btn">Copy</button>
          <pre><code>${JSON.stringify(endpoint.body, null, 2)}</code></pre>
        </div>
      ` : ''}
      
      ${endpoint.validation ? `
        <div class="validation-rules">
          <h4>Validation Rules</h4>
          <ul>
            ${endpoint.validation.map(rule => `<li>${rule}</li>`).join('')}
          </ul>
        </div>
      ` : ''}
      
      ${endpoint.response ? `
        <h4>Response Example</h4>
        <div class="code-block">
          <button class="copy-btn">Copy</button>
          <pre><code>${JSON.stringify(endpoint.response, null, 2)}</code></pre>
        </div>
      ` : ''}

      ${endpoint.warning ? `
        <div class="warning-box">
          <h4>⚠️ Warning</h4>
          <p>${endpoint.warning}</p>
        </div>
      ` : ''}
    </div>
  `
}

function renderWebSocketSection(data) {
  return `
    <div class="content-header">
      <h1 class="content-title">${data.title}</h1>
      <p class="content-description">${data.description}</p>
    </div>
    
    <div class="endpoint-section">
      <h2>Connection Information</h2>
      <div class="info-box">
        <h4>Connection URL</h4>
        <code>${data.connection.url}</code>
      </div>
      <div class="info-box">
        <h4>Available Events</h4>
        <ul>
          ${data.connection.events.map(event => `<li><code>${event}</code></li>`).join('')}
        </ul>
      </div>
    </div>

    <div class="endpoint-section">
      <h2>Example Usage</h2>
      <div class="code-block">
        <button class="copy-btn">Copy</button>
        <pre><code>${data.connection.example}</code></pre>
      </div>
    </div>
  `
}

function renderErrorSection(data) {
  return `
    <div class="content-header">
      <h1 class="content-title">${data.title}</h1>
      <p class="content-description">${data.description}</p>
    </div>
    
    <div class="endpoint-section">
      <h2>Standard Error Response</h2>
      <div class="code-block">
        <button class="copy-btn">Copy</button>
        <pre><code>${JSON.stringify(data.standardResponse, null, 2)}</code></pre>
      </div>
    </div>

    <div class="endpoint-section">
      <h2>HTTP Status Codes</h2>
      <ul>
        ${data.statusCodes.map(code => `<li>${code}</li>`).join('')}
      </ul>
    </div>

    <div class="endpoint-section">
      <h2>Common Error Codes</h2>
      <ul>
        ${data.commonErrors.map(error => `<li>${error}</li>`).join('')}
      </ul>
    </div>
  `
}

function renderGenericSection(data) {
  return `
    <div class="content-header">
      <h1 class="content-title">${data.title}</h1>
      <p class="content-description">${data.description}</p>
    </div>
  `
}
