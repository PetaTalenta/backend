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
    case 'adminUserManagement':
    case 'schools':
    case 'assessment':
    case 'archive':
    case 'chatbot':
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

    ${data.serviceInfo ? `
      <div class="endpoint-section">
        <h2>Service Information</h2>
        <div class="info-grid">
          <div class="info-box">
            <h4>Service Name</h4>
            <code>${data.serviceInfo.serviceName}</code>
          </div>
          <div class="info-box">
            <h4>Internal Port</h4>
            <code>${data.serviceInfo.internalPort}</code>
          </div>
          <div class="info-box">
            <h4>External Access</h4>
            <code>${data.serviceInfo.externalAccess}</code>
          </div>
          <div class="info-box">
            <h4>Base URL</h4>
            <code>${data.serviceInfo.baseUrl}</code>
          </div>
          <div class="info-box">
            <h4>Version</h4>
            <code>${data.serviceInfo.version}</code>
          </div>
        </div>
      </div>
    ` : ''}

    ${data.rateLimiting ? `
      <div class="endpoint-section">
        <h2>Rate Limiting</h2>
        ${typeof data.rateLimiting === 'string' ? `
          <p><strong>Archive Endpoints:</strong> ${data.rateLimiting}</p>
        ` : `
          <ul>
            ${data.rateLimiting.freeModelEndpoints ? `<li><strong>Free Model Endpoints:</strong> ${data.rateLimiting.freeModelEndpoints}</li>` : ''}
            ${data.rateLimiting.messageEndpoints ? `<li><strong>Message Endpoints:</strong> ${data.rateLimiting.messageEndpoints}</li>` : ''}
            ${data.rateLimiting.generalAPI ? `<li><strong>General API:</strong> ${data.rateLimiting.generalAPI}</li>` : ''}
            ${data.rateLimiting.burstProtection ? `<li><strong>Burst Protection:</strong> ${data.rateLimiting.burstProtection}</li>` : ''}
          </ul>
        `}
      </div>
    ` : ''}

    ${data.authentication && typeof data.authentication === 'string' ? `
      <div class="endpoint-section">
        <h2>Authentication</h2>
        <p>${data.authentication}</p>
      </div>
    ` : ''}

    ${data.features ? `
      <div class="endpoint-section">
        <h2>Features</h2>
        <ul>
          ${data.features.map(feature => `<li>${feature}</li>`).join('')}
        </ul>
      </div>
    ` : ''}

    ${data.modelSupport ? `
      <div class="endpoint-section">
        <h2>Model Support</h2>
        <div class="info-grid">
          <div class="info-box">
            <h4>Primary Model</h4>
            <code>${data.modelSupport.primaryModel}</code>
          </div>
          <div class="info-box">
            <h4>Fallback Model</h4>
            <code>${data.modelSupport.fallbackModel}</code>
          </div>
        </div>
        <ul>
          ${data.modelSupport.features.map(feature => `<li>${feature}</li>`).join('')}
        </ul>
      </div>
    ` : ''}

    ${data.errorCodes ? `
      <div class="endpoint-section">
        <h2>Error Codes</h2>
        <ul>
          ${data.errorCodes.map(error => `<li>${error}</li>`).join('')}
        </ul>
      </div>
    ` : ''}

    ${data.relatedServices ? `
      <div class="endpoint-section">
        <h2>Related Services</h2>
        <ul>
          ${data.relatedServices.map(service => `<li>${service}</li>`).join('')}
        </ul>
      </div>
    ` : ''}

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

      ${endpoint.authentication || endpoint.rateLimit || endpoint.service ? `
        <div class="endpoint-meta">
          ${endpoint.authentication ? `
            <div class="meta-item">
              <strong>Authentication:</strong> ${endpoint.authentication}
            </div>
          ` : ''}
          ${endpoint.rateLimit ? `
            <div class="meta-item">
              <strong>Rate Limit:</strong> ${endpoint.rateLimit}
            </div>
          ` : ''}
          ${endpoint.service ? `
            <div class="meta-item">
              <strong>Service:</strong> ${endpoint.service}
            </div>
          ` : ''}
        </div>
      ` : ''}

      ${endpoint.headers ? `
        <h4>Headers</h4>
        <div class="code-block">
          <button class="copy-btn">Copy</button>
          <pre><code>${endpoint.headers.join('\n')}</code></pre>
        </div>
      ` : ''}

      ${endpoint.pathParams ? `
        <h4>Path Parameters</h4>
        <ul>
          ${endpoint.pathParams.map(param => `<li>${param}</li>`).join('')}
        </ul>
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

      ${endpoint.fieldDescriptions ? `
        <div class="field-descriptions">
          <h4>Field Descriptions</h4>
          <ul>
            ${endpoint.fieldDescriptions.map(desc => `<li>${desc}</li>`).join('')}
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

    ${data.authServiceErrors ? `
      <div class="endpoint-section">
        <h2>Auth Service Error Codes</h2>
        <ul>
          ${data.authServiceErrors.map(error => `<li>${error}</li>`).join('')}
        </ul>
      </div>
    ` : ''}

    ${data.rateLimiting ? `
      <div class="endpoint-section">
        <h2>${data.rateLimiting.title}</h2>
        <p>${data.rateLimiting.description}</p>
        <ul>
          ${data.rateLimiting.limits.map(limit => `<li>${limit}</li>`).join('')}
        </ul>
      </div>
    ` : ''}

    ${data.securityFeatures ? `
      <div class="endpoint-section">
        <h2>Security Features</h2>
        <ul>
          ${data.securityFeatures.map(feature => `<li>${feature}</li>`).join('')}
        </ul>
      </div>
    ` : ''}

    ${data.validationNotes ? `
      <div class="endpoint-section">
        <h2>${data.validationNotes.title}</h2>

        <h3>Password Validation</h3>
        <ul>
          ${data.validationNotes.passwordValidation.map(note => `<li>${note}</li>`).join('')}
        </ul>

        <h3>Token Balance</h3>
        <ul>
          ${data.validationNotes.tokenBalance.map(note => `<li>${note}</li>`).join('')}
        </ul>

        <h3>Batch Registration</h3>
        <ul>
          ${data.validationNotes.batchRegistration.map(note => `<li>${note}</li>`).join('')}
        </ul>
      </div>
    ` : ''}
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
