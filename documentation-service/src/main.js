import './style.css'
import { apiData } from './data/apiData.js'
import { renderSidebar } from './components/sidebar.js'
import { renderContent } from './components/content.js'

class ApiDocumentation {
  constructor() {
    this.currentSection = 'overview'
    this.init()
  }

  init() {
    this.render()
    this.bindEvents()
  }

  render() {
    const app = document.getElementById('app')
    app.innerHTML = `
      <div class="documentation-container">
        <aside class="sidebar">
          ${renderSidebar(apiData, this.currentSection)}
        </aside>
        <main class="content">
          ${renderContent(apiData, this.currentSection)}
        </main>
      </div>
    `
  }

  bindEvents() {
    // Sidebar navigation
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('nav-link')) {
        e.preventDefault()
        const section = e.target.dataset.section
        this.navigateToSection(section)
      }
    })

    // Copy code button
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('copy-btn')) {
        const codeBlock = e.target.nextElementSibling.querySelector('code')
        navigator.clipboard.writeText(codeBlock.textContent)
        
        e.target.textContent = 'Copied!'
        setTimeout(() => {
          e.target.textContent = 'Copy'
        }, 2000)
      }
    })
  }

  navigateToSection(section) {
    this.currentSection = section
    
    // Update sidebar active state
    document.querySelectorAll('.nav-link').forEach(link => {
      link.classList.remove('active')
    })
    document.querySelector(`[data-section="${section}"]`).classList.add('active')
    
    // Update content
    document.querySelector('.content').innerHTML = renderContent(apiData, section)
  }
}

// Initialize the app
new ApiDocumentation()
