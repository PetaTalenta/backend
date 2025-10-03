import './styles/main.css';
import './styles/prism.css';
import Prism from 'prismjs';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-http';

// Import service data
import { authServiceData } from './data/auth-service.js';
import { authV2ServiceData } from './data/auth-v2-service.js';
import { assessmentServiceData } from './data/assessment-service.js';
import { archiveServiceData } from './data/archive-service.js';
import { archiveServiceSharingDocs } from './data/archive-service-sharing-docs.js';
import { chatbotServiceData } from './data/chatbot-service.js';
import { notificationServiceData } from './data/notification-service.js';
import { adminServiceData } from './data/admin-service.js';
import { globalEndpointsData } from './data/global-endpoints.js';

class DocumentationApp {
  constructor() {
    this.services = {
      'global-endpoints': globalEndpointsData,
      'auth-service': authServiceData,
      'auth-v2-service': authV2ServiceData,
      'assessment-service': assessmentServiceData,
      'archive-service': archiveServiceData,
      'archive-service-sharing': archiveServiceSharingDocs,
      'chatbot-service': chatbotServiceData,
  // Pindahkan admin-service agar muncul setelah chatbot-service
  'admin-service': adminServiceData,
  'notification-service': notificationServiceData
    };

    this.currentTheme = localStorage.getItem('theme') || 'light';
    this.init();
  }

  init() {
    this.initializeTheme();
    this.setupThemeToggle();
    this.setupNavigation();
    this.setupTabs();
    this.loadServices();
    this.applySyntaxHighlighting();
    this.setupSmoothScrolling();
    this.setupSearchFunctionality();
  }

  initializeTheme() {
    // Apply the saved theme on page load
    document.documentElement.setAttribute('data-theme', this.currentTheme);
    this.updateThemeToggleIcon();
  }

  setupThemeToggle() {
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
      themeToggle.addEventListener('click', () => {
        this.toggleTheme();
      });

      // Add keyboard support for accessibility
      themeToggle.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.toggleTheme();
        }
      });
    }
  }

  toggleTheme() {
    this.currentTheme = this.currentTheme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', this.currentTheme);
    localStorage.setItem('theme', this.currentTheme);
    this.updateThemeToggleIcon();
  }

  updateThemeToggleIcon() {
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
      themeToggle.textContent = this.currentTheme === 'light' ? '🌙' : '☀️';
      themeToggle.title = this.currentTheme === 'light' ? 'Switch to dark mode' : 'Switch to light mode';
    }
  }

  setupNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');

    navLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = link.getAttribute('href').substring(1);
        const targetElement = document.getElementById(targetId);

        if (targetElement) {
          targetElement.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });

          // Update active nav link
          navLinks.forEach(l => l.classList.remove('active'));
          link.classList.add('active');
        }
      });
    });
  }

  setupTabs() {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabPanes = document.querySelectorAll('.tab-pane');

    tabButtons.forEach(button => {
      button.addEventListener('click', () => {
        const targetTab = button.getAttribute('data-tab');
        
        // Remove active class from all buttons and panes
        tabButtons.forEach(btn => btn.classList.remove('active'));
        tabPanes.forEach(pane => pane.classList.remove('active'));
        
        // Add active class to clicked button and corresponding pane
        button.classList.add('active');
        document.getElementById(targetTab).classList.add('active');
      });
    });
  }

  loadServices() {
    const servicesContainer = document.getElementById('services-content');

    if (!servicesContainer) {
      console.error('Services container not found!');
      return;
    }

    Object.entries(this.services).forEach(([serviceKey, serviceData]) => {
      console.log(`Loading service: ${serviceKey}`, serviceData ? 'OK' : 'MISSING');
      if (!serviceData) {
        console.error(`Service data is null/undefined for ${serviceKey}`);
        return;
      }

      const serviceSection = this.createServiceSection(serviceKey, serviceData);
      servicesContainer.appendChild(serviceSection);
    });
  }

  createServiceSection(serviceKey, serviceData) {
    const section = document.createElement('section');
    section.id = serviceKey;
    section.className = 'section service-section';

    // Handle sharing docs format
    if (serviceData.sections) {
      return this.createSharingDocsSection(serviceKey, serviceData);
    }

      // Start with simple content first
      const title = document.createElement('h2');
      title.textContent = serviceData.name || 'Unknown Service';
      section.appendChild(title);

      const description = document.createElement('p');
      description.className = 'service-description';
      description.textContent = serviceData.description || 'No description available';
      section.appendChild(description);

      // Add service info
      const serviceInfo = document.createElement('div');
      serviceInfo.className = 'service-info';

      let serviceInfoHTML = `
        <div class="info-card">
          <h4>Base URL</h4>
          <code>${serviceData.baseUrl || 'N/A'}</code>
        </div>
        <div class="info-card">
          <h4>Version</h4>
          <code>${serviceData.version || 'N/A'}</code>
        </div>
        <div class="info-card">
          <h4>Port</h4>
          <code>${serviceData.port || 'N/A'}</code>
        </div>
      `;

      // Add WebSocket-specific info if available
      if (serviceData.websocket) {
        serviceInfoHTML = `
          <div class="info-card websocket-info">
            <h4>WebSocket URL</h4>
            <code>${serviceData.websocketUrl || 'N/A'}</code>
          </div>
          <div class="info-card websocket-info">
            <h4>Protocol</h4>
            <code>${serviceData.protocol || 'N/A'}</code>
          </div>
          <div class="info-card websocket-info">
            <h4>Authentication</h4>
            <code>${serviceData.authentication || 'N/A'}</code>
          </div>
        `;
      }

      serviceInfo.innerHTML = serviceInfoHTML;
      section.appendChild(serviceInfo);

      // Add WebSocket documentation if available
      if (serviceData.websocket) {
        this.renderWebSocketSection(section, serviceData.websocket);
      }

      // Add implementation guide if available
      if (serviceData.implementation) {
        this.renderImplementationSection(section, serviceData.implementation);
      }

      // Add troubleshooting guide if available
      if (serviceData.troubleshooting) {
        this.renderTroubleshootingSection(section, serviceData.troubleshooting);
      }

      // Add endpoints count for now
      const endpointsInfo = document.createElement('div');
      endpointsInfo.innerHTML = `<p><strong>Endpoints:</strong> ${serviceData.endpoints ? serviceData.endpoints.length : 0}</p>`;
      section.appendChild(endpointsInfo);

      // Add endpoints with full details
      if (serviceData.endpoints && serviceData.endpoints.length > 0) {
        const endpointsContainer = document.createElement('div');
        endpointsContainer.className = 'endpoints-container';

        serviceData.endpoints.forEach((endpoint) => {
          const endpointDiv = document.createElement('div');
          endpointDiv.className = 'endpoint';

          // Create endpoint header
          const header = document.createElement('div');
          header.className = 'endpoint-header';
          header.innerHTML = `
            <span class="method method-${endpoint.method.toLowerCase()}">${endpoint.method}</span>
            <span class="path">${endpoint.path}</span>
            <span class="endpoint-title">${endpoint.title}</span>
          `;
          endpointDiv.appendChild(header);

          // Create endpoint content
          const content = document.createElement('div');
          content.className = 'endpoint-content';

          // Description
          const desc = document.createElement('p');
          desc.className = 'endpoint-description';
          desc.textContent = endpoint.description;
          content.appendChild(desc);

          // Authentication
          if (endpoint.authentication) {
            const authDiv = document.createElement('div');
            authDiv.className = 'auth-required';
            authDiv.innerHTML = `
              <span class="auth-badge">🔐 Authentication Required</span>
              <p>${endpoint.authentication}</p>
            `;
            content.appendChild(authDiv);
          }

          // Rate limit
          if (endpoint.rateLimit) {
            const rateDiv = document.createElement('div');
            rateDiv.className = 'rate-limit';
            rateDiv.innerHTML = `
              <span class="rate-badge">⏱️ Rate Limit</span>
              <p>${endpoint.rateLimit}</p>
            `;
            content.appendChild(rateDiv);
          }

          // Parameters
          if (endpoint.parameters && endpoint.parameters.length > 0) {
            const paramsDiv = document.createElement('div');
            paramsDiv.className = 'parameters-section';
            paramsDiv.innerHTML = `
              <h4>Parameters</h4>
              <table class="params-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Type</th>
                    <th>Required</th>
                    <th>Description</th>
                  </tr>
                </thead>
                <tbody>
                  ${endpoint.parameters.map(param => `
                    <tr>
                      <td><code>${param.name}</code></td>
                      <td><span class="param-type">${param.type}</span></td>
                      <td><span class="param-required ${param.required ? 'required' : 'optional'}">${param.required ? 'Yes' : 'No'}</span></td>
                      <td>${param.description}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            `;
            content.appendChild(paramsDiv);
          }

          // Request body
          if (endpoint.requestBody) {
            const requestDiv = document.createElement('div');
            requestDiv.className = 'request-section';
            requestDiv.innerHTML = `
              <h4>Request Body</h4>
              <div class="code-block">
                <pre><code class="language-json">${JSON.stringify(endpoint.requestBody, null, 2)}</code></pre>
              </div>
            `;
            content.appendChild(requestDiv);
          }

          // Response
          if (endpoint.response) {
            const responseDiv = document.createElement('div');
            responseDiv.className = 'response-section';
            responseDiv.innerHTML = `
              <h4>Response</h4>
              <div class="code-block">
                <pre><code class="language-json">${JSON.stringify(endpoint.response, null, 2)}</code></pre>
              </div>
            `;
            content.appendChild(responseDiv);
          }

          // Example
          if (endpoint.example) {
            const exampleDiv = document.createElement('div');
            exampleDiv.className = 'example-section';
            exampleDiv.innerHTML = `
              <h4>Example</h4>
              <div class="code-block">
                <pre><code class="language-bash">${endpoint.example}</code></pre>
              </div>
            `;
            content.appendChild(exampleDiv);
          }

          endpointDiv.appendChild(content);
          endpointsContainer.appendChild(endpointDiv);
        });

        section.appendChild(endpointsContainer);
      }

    return section;
  }

  applySyntaxHighlighting() {
    // Apply syntax highlighting to all code blocks
    Prism.highlightAll();
  }

  createEndpointsHTML(endpoints) {
    return endpoints.map(endpoint => `
      <div class="endpoint">
        <div class="endpoint-header">
          <span class="method method-${endpoint.method.toLowerCase()}">${endpoint.method}</span>
          <span class="path">${endpoint.path}</span>
          <span class="endpoint-title">${endpoint.title}</span>
        </div>
        
        <div class="endpoint-content">
          <p class="endpoint-description">${endpoint.description}</p>
          
          ${endpoint.authentication ? `
            <div class="auth-required">
              <span class="auth-badge">🔐 Authentication Required</span>
              <p>${endpoint.authentication}</p>
            </div>
          ` : ''}
          
          ${endpoint.rateLimit ? `
            <div class="rate-limit">
              <span class="rate-badge">⏱️ Rate Limit</span>
              <p>${endpoint.rateLimit}</p>
            </div>
          ` : ''}
          
          ${endpoint.requestBody ? `
            <div class="request-section">
              <h4>Request Body</h4>
              <div class="code-block">
                <pre><code class="language-json">${JSON.stringify(endpoint.requestBody, null, 2)}</code></pre>
              </div>
            </div>
          ` : ''}
          
          ${endpoint.parameters ? `
            <div class="parameters-section">
              <h4>Parameters</h4>
              <table class="params-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Type</th>
                    <th>Required</th>
                    <th>Description</th>
                  </tr>
                </thead>
                <tbody>
                  ${endpoint.parameters.map(param => `
                    <tr>
                      <td><code>${param.name}</code></td>
                      <td><span class="param-type">${param.type}</span></td>
                      <td><span class="param-required ${param.required ? 'required' : 'optional'}">${param.required ? 'Yes' : 'No'}</span></td>
                      <td>${param.description}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          ` : ''}
          
          <div class="response-section">
            <h4>Response</h4>
            <div class="code-block">
              <pre><code class="language-json">${JSON.stringify(endpoint.response, null, 2)}</code></pre>
            </div>
          </div>
          
          ${endpoint.example ? `
            <div class="example-section">
              <h4>Example</h4>
              <div class="code-block">
                <pre><code class="language-bash">${endpoint.example}</code></pre>
              </div>
            </div>
          ` : ''}
        </div>
      </div>
    `).join('');
  }

  setupSmoothScrolling() {
    // Intersection Observer for active nav highlighting
    const sections = document.querySelectorAll('.section');
    const navLinks = document.querySelectorAll('.nav-link');
    
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const id = entry.target.id;
          navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${id}`) {
              link.classList.add('active');
            }
          });
        }
      });
    }, {
      threshold: 0.3,
      rootMargin: '-100px 0px -50% 0px'
    });
    
    sections.forEach(section => observer.observe(section));
  }

  highlightCode() {
    // Initial highlighting
    Prism.highlightAll();
    
    // Re-highlight when new content is added
    const observer = new MutationObserver(() => {
      Prism.highlightAll();
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  setupSearchFunctionality() {
    // Add search functionality
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = 'Search endpoints...';
    searchInput.className = 'search-input';
    
    const headerContent = document.querySelector('.header-content');
    headerContent.appendChild(searchInput);
    
    searchInput.addEventListener('input', (e) => {
      this.filterEndpoints(e.target.value);
    });
  }

  filterEndpoints(searchTerm) {
    const endpoints = document.querySelectorAll('.endpoint');
    const term = searchTerm.toLowerCase();

    endpoints.forEach(endpoint => {
      const title = endpoint.querySelector('.endpoint-title').textContent.toLowerCase();
      const path = endpoint.querySelector('.path').textContent.toLowerCase();
      const description = endpoint.querySelector('.endpoint-description').textContent.toLowerCase();

      const matches = title.includes(term) || path.includes(term) || description.includes(term);
      endpoint.style.display = matches ? 'block' : 'none';
    });
  }

  renderWebSocketSection(section, websocketData) {
    const websocketSection = document.createElement('div');
    websocketSection.className = 'websocket-section';

    let websocketHTML = `
      <h3>🔌 WebSocket Connection</h3>
      <p class="websocket-description">${websocketData.description}</p>

      <div class="websocket-flow">
        <h4>Connection Flow</h4>
        <ol class="flow-list">
          ${websocketData.connectionFlow.map(step => `<li>${step}</li>`).join('')}
        </ol>
      </div>

      <div class="websocket-auth">
        <h4>Authentication Flow</h4>
        <ol class="flow-list">
          ${websocketData.authenticationFlow.map(step => `<li>${step}</li>`).join('')}
        </ol>
      </div>

      <div class="websocket-connection-example">
        <h4>Connection Example</h4>
        <div class="code-block">
          <pre><code class="language-javascript">${websocketData.connectionExample}</code></pre>
        </div>
      </div>
    `;

    if (websocketData.events && websocketData.events.length > 0) {
      websocketHTML += `
        <div class="websocket-events">
          <h4>WebSocket Events</h4>
          ${websocketData.events.map(event => `
            <div class="websocket-event">
              <div class="event-header">
                <span class="event-name">${event.name}</span>
                <span class="event-description">${event.description}</span>
              </div>
              <div class="event-content">
                <div class="event-data">
                  <h5>Event Data Structure</h5>
                  <div class="code-block">
                    <pre><code class="language-json">${JSON.stringify(event.data, null, 2)}</code></pre>
                  </div>
                </div>
                <div class="event-example">
                  <h5>Implementation Example</h5>
                  <div class="code-block">
                    <pre><code class="language-javascript">${event.example}</code></pre>
                  </div>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      `;
    }

    websocketSection.innerHTML = websocketHTML;
    section.appendChild(websocketSection);
  }

  renderImplementationSection(section, implementationData) {
    const implementationSection = document.createElement('div');
    implementationSection.className = 'implementation-section';

    let implementationHTML = `
      <h3>💻 ${implementationData.title}</h3>
      <p class="implementation-description">${implementationData.description}</p>
    `;

    if (implementationData.reactExample) {
      implementationHTML += `
        <div class="implementation-example">
          <h4>React Implementation</h4>
          <div class="code-block">
            <pre><code class="language-javascript">${implementationData.reactExample}</code></pre>
          </div>
        </div>
      `;
    }

    if (implementationData.vueExample) {
      implementationHTML += `
        <div class="implementation-example">
          <h4>Vue.js Implementation</h4>
          <div class="code-block">
            <pre><code class="language-javascript">${implementationData.vueExample}</code></pre>
          </div>
        </div>
      `;
    }

    implementationSection.innerHTML = implementationHTML;
    section.appendChild(implementationSection);
  }

  renderTroubleshootingSection(section, troubleshootingData) {
    const troubleshootingSection = document.createElement('div');
    troubleshootingSection.className = 'troubleshooting-section';

    let troubleshootingHTML = `
      <h3>🔧 ${troubleshootingData.title}</h3>
    `;

    if (troubleshootingData.commonIssues && troubleshootingData.commonIssues.length > 0) {
      troubleshootingHTML += `
        <div class="common-issues">
          <h4>Common Issues</h4>
          <div class="issues-list">
            ${troubleshootingData.commonIssues.map(issue => `
              <div class="issue-item">
                <div class="issue-title">❌ ${issue.issue}</div>
                <div class="issue-solution">✅ ${issue.solution}</div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    if (troubleshootingData.debugSteps && troubleshootingData.debugSteps.length > 0) {
      troubleshootingHTML += `
        <div class="debug-steps">
          <h4>Debug Steps</h4>
          <ol class="debug-list">
            ${troubleshootingData.debugSteps.map(step => `<li>${step}</li>`).join('')}
          </ol>
        </div>
      `;
    }

    troubleshootingSection.innerHTML = troubleshootingHTML;
    section.appendChild(troubleshootingSection);
  }

  createSharingDocsSection(serviceKey, serviceData) {
    const section = document.createElement('section');
    section.id = serviceKey;
    section.className = 'section service-section';

    // Title
    const title = document.createElement('h2');
    title.textContent = serviceData.title || 'Sharing Documentation';
    section.appendChild(title);

    // Render each section
    serviceData.sections.forEach(sectionData => {
      const subsection = document.createElement('div');
      subsection.className = 'sharing-section';

      // Section title with emoji
      const sectionTitle = document.createElement('h3');
      sectionTitle.innerHTML = `${sectionData.emoji || '📄'} ${sectionData.title}`;
      subsection.appendChild(sectionTitle);

      // Section content
      if (sectionData.content) {
        const content = document.createElement('p');
        content.textContent = sectionData.content;
        subsection.appendChild(content);
      }

      // Subsections
      if (sectionData.subsections) {
        sectionData.subsections.forEach(sub => {
          const subTitle = document.createElement('h4');
          subTitle.textContent = sub.title;
          subsection.appendChild(subTitle);

          if (sub.content) {
            const subContent = document.createElement('ul');
            sub.content.forEach(item => {
              const li = document.createElement('li');
              li.textContent = item;
              subContent.appendChild(li);
            });
            subsection.appendChild(subContent);
          }
        });
      }

      // API Endpoints
      if (sectionData.subsections && sectionData.subsections.some(s => s.method)) {
        const endpointsDiv = document.createElement('div');
        endpointsDiv.className = 'endpoints-container';

        sectionData.subsections.forEach(endpoint => {
          if (endpoint.method) {
            const endpointDiv = document.createElement('div');
            endpointDiv.className = 'endpoint';

            const header = document.createElement('div');
            header.className = 'endpoint-header';
            header.innerHTML = `
              <span class="method method-${endpoint.method.toLowerCase()}">${endpoint.method}</span>
              <span class="path">${endpoint.path}</span>
            `;
            endpointDiv.appendChild(header);

            const content = document.createElement('div');
            content.className = 'endpoint-content';

            const desc = document.createElement('p');
            desc.textContent = endpoint.description;
            content.appendChild(desc);

            // Request body
            if (endpoint.requestBody) {
              const bodyDiv = document.createElement('div');
              bodyDiv.innerHTML = `
                <h5>Request Body:</h5>
                <pre><code class="language-json">${JSON.stringify(endpoint.requestBody, null, 2)}</code></pre>
              `;
              content.appendChild(bodyDiv);
            }

            // Response
            if (endpoint.response) {
              const responseDiv = document.createElement('div');
              responseDiv.innerHTML = `
                <h5>Response:</h5>
                <pre><code class="language-json">${JSON.stringify(endpoint.response, null, 2)}</code></pre>
              `;
              content.appendChild(responseDiv);
            }

            endpointDiv.appendChild(content);
            endpointsDiv.appendChild(endpointDiv);
          }
        });

        subsection.appendChild(endpointsDiv);
      }

      // Examples
      if (sectionData.examples) {
        const examplesDiv = document.createElement('div');
        examplesDiv.className = 'examples-section';

        const examplesTitle = document.createElement('h4');
        examplesTitle.textContent = 'Usage Examples';
        examplesDiv.appendChild(examplesTitle);

        sectionData.examples.forEach(example => {
          const exampleDiv = document.createElement('div');
          exampleDiv.className = 'example';

          const exampleTitle = document.createElement('h5');
          exampleTitle.textContent = example.title;
          exampleDiv.appendChild(exampleTitle);

          const codeBlock = document.createElement('pre');
          codeBlock.innerHTML = `<code class="language-bash">${example.code}</code>`;
          exampleDiv.appendChild(codeBlock);

          examplesDiv.appendChild(exampleDiv);
        });

        subsection.appendChild(examplesDiv);
      }

      // Cases
      if (sectionData.cases) {
        const casesDiv = document.createElement('div');
        casesDiv.className = 'use-cases';

        const casesTitle = document.createElement('h4');
        casesTitle.textContent = 'Use Cases';
        casesDiv.appendChild(casesTitle);

        const casesList = document.createElement('ul');
        sectionData.cases.forEach(caseItem => {
          const li = document.createElement('li');
          li.innerHTML = `<strong>${caseItem.title}:</strong> ${caseItem.description}`;
          casesList.appendChild(li);
        });
        casesDiv.appendChild(casesList);
        subsection.appendChild(casesDiv);
      }

      // Notes
      if (sectionData.notes) {
        const notesDiv = document.createElement('div');
        notesDiv.className = 'important-notes';

        sectionData.notes.forEach(note => {
          const noteDiv = document.createElement('div');
          noteDiv.className = 'note';

          const noteTitle = document.createElement('h4');
          noteTitle.textContent = note.title;
          noteDiv.appendChild(noteTitle);

          if (note.items) {
            const itemsList = document.createElement('ul');
            note.items.forEach(item => {
              const li = document.createElement('li');
              li.textContent = item;
              itemsList.appendChild(li);
            });
            noteDiv.appendChild(itemsList);
          }

          notesDiv.appendChild(noteDiv);
        });

        subsection.appendChild(notesDiv);
      }

      // Practices
      if (sectionData.practices) {
        const practicesDiv = document.createElement('div');
        practicesDiv.className = 'best-practices';

        const practicesTitle = document.createElement('h4');
        practicesTitle.textContent = 'Best Practices';
        practicesDiv.appendChild(practicesTitle);

        sectionData.practices.forEach(practice => {
          const practiceDiv = document.createElement('div');
          practiceDiv.className = 'practice';

          const practiceTitle = document.createElement('h5');
          practiceTitle.textContent = practice.title;
          practiceDiv.appendChild(practiceTitle);

          if (practice.items) {
            const itemsList = document.createElement('ul');
            practice.items.forEach(item => {
              const li = document.createElement('li');
              li.textContent = item;
              itemsList.appendChild(li);
            });
            practiceDiv.appendChild(itemsList);
          }

          practicesDiv.appendChild(practiceDiv);
        });

        subsection.appendChild(practicesDiv);
      }

      section.appendChild(subsection);
    });

    return section;
  }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new DocumentationApp();
});

// Add copy to clipboard functionality
class ClipboardManager {
  static addCopyButtons() {
    const codeBlocks = document.querySelectorAll('.code-block pre');

    codeBlocks.forEach(block => {
      const button = document.createElement('button');
      button.className = 'copy-button';
      button.innerHTML = '📋 Copy';
      button.title = 'Copy to clipboard';

      button.addEventListener('click', async () => {
        const code = block.textContent;
        try {
          await navigator.clipboard.writeText(code);
          button.innerHTML = '✅ Copied!';
          button.classList.add('copied');

          setTimeout(() => {
            button.innerHTML = '📋 Copy';
            button.classList.remove('copied');
          }, 2000);
        } catch (err) {
          console.error('Failed to copy:', err);
          button.innerHTML = '❌ Failed';
          setTimeout(() => {
            button.innerHTML = '📋 Copy';
          }, 2000);
        }
      });

      block.parentElement.style.position = 'relative';
      block.parentElement.appendChild(button);
    });
  }
}

// Initialize clipboard functionality after DOM loads
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    ClipboardManager.addCopyButtons();
  }, 1000);
});

// Export for potential external use
export default DocumentationApp;
