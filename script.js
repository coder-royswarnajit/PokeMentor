// Application State Management
class AppState {
    constructor() {
        this.currentTab = 'documentation';
        this.githubConnected = false;
        this.githubToken = '';
        this.selectedRepo = '';
        this.selectedBranch = '';
        this.uploadedFiles = [];
        this.qualityFile = null;
        this.generatedContent = '';
        this.currentPurpose = 'readme';
        this.theme = localStorage.getItem('theme') || 'light';
    }

    updateState(key, value) {
        this[key] = value;
        this.notifyStateChange(key, value);
    }

    notifyStateChange(key, value) {
        // Emit custom event for state changes
        window.dispatchEvent(new CustomEvent('stateChange', {
            detail: { key, value }
        }));
    }
}

// API Configuration
const API_CONFIG = {
    baseUrl: 'http://localhost:8501', // Streamlit backend URL
    endpoints: {
        generateDocs: '/generate-docs',
        analyzeQuality: '/analyze-quality',
        connectGithub: '/github/connect',
        getRepos: '/github/repos',
        getBranches: '/github/branches',
        createPR: '/github/create-pr'
    }
};

// Utility Functions
class Utils {
    static formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    static getFileExtension(filename) {
        return filename.split('.').pop().toLowerCase();
    }

    static getFileIcon(filename) {
        const ext = Utils.getFileExtension(filename);
        const iconMap = {
            'py': 'fab fa-python',
            'js': 'fab fa-js-square',
            'jsx': 'fab fa-react',
            'ts': 'fab fa-js-square',
            'tsx': 'fab fa-react',
            'java': 'fab fa-java',
            'html': 'fab fa-html5',
            'css': 'fab fa-css3-alt',
            'php': 'fab fa-php',
            'rb': 'fas fa-gem',
            'go': 'fab fa-golang',
            'rs': 'fab fa-rust',
            'swift': 'fab fa-swift',
            'kt': 'fas fa-code',
            'zip': 'fas fa-file-archive',
            'c': 'fas fa-code',
            'cpp': 'fas fa-code',
            'cs': 'fas fa-code'
        };
        return iconMap[ext] || 'fas fa-file-code';
    }

    static showToast(message, type = 'info', duration = 5000) {
        const toastContainer = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const iconMap = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };

        toast.innerHTML = `
            <i class="toast-icon ${iconMap[type]}"></i>
            <div class="toast-message">${message}</div>
        `;

        toastContainer.appendChild(toast);

        // Auto remove
        setTimeout(() => {
            toast.style.animation = 'slideIn 0.3s ease-out reverse';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, duration);
    }

    static showLoading(text = 'Processing...', subtext = 'Please wait while we analyze your code') {
        const overlay = document.getElementById('loadingOverlay');
        const loadingText = document.getElementById('loadingText');
        const loadingSubtext = document.getElementById('loadingSubtext');
        
        loadingText.textContent = text;
        loadingSubtext.textContent = subtext;
        overlay.classList.add('active');
    }

    static hideLoading() {
        const overlay = document.getElementById('loadingOverlay');
        overlay.classList.remove('active');
    }

    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    static async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            Utils.showToast('Copied to clipboard!', 'success');
        } catch (err) {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            Utils.showToast('Copied to clipboard!', 'success');
        }
    }
}

// Theme Manager
class ThemeManager {
    constructor() {
        this.init();
    }

    init() {
        const themeToggle = document.getElementById('themeToggle');
        const savedTheme = localStorage.getItem('theme') || 'light';
        
        this.setTheme(savedTheme);
        
        themeToggle.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
            const newTheme = currentTheme === 'light' ? 'dark' : 'light';
            this.setTheme(newTheme);
        });
    }

    setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        
        const themeToggle = document.getElementById('themeToggle');
        const icon = themeToggle.querySelector('i');
        
        if (theme === 'dark') {
            icon.className = 'fas fa-sun';
        } else {
            icon.className = 'fas fa-moon';
        }
    }
}

// Tab Manager
class TabManager {
    constructor(appState) {
        this.appState = appState;
        this.init();
    }

    init() {
        const navTabs = document.querySelectorAll('.nav-tab');
        navTabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                const tabName = e.currentTarget.dataset.tab;
                this.switchTab(tabName);
            });
        });
    }

    switchTab(tabName) {
        // Update nav tabs
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(tabName).classList.add('active');

        this.appState.updateState('currentTab', tabName);
    }
}

// File Upload Manager
class FileUploadManager {
    constructor(appState) {
        this.appState = appState;
        this.init();
    }

    init() {
        // Documentation file upload
        this.setupUploadZone('uploadZone', 'fileInput', false);
        
        // Quality analysis file upload
        this.setupUploadZone('qualityUploadZone', 'qualityFileInput', true);

        // Purpose radio buttons
        const purposeRadios = document.querySelectorAll('input[name="purpose"]');
        purposeRadios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.appState.updateState('currentPurpose', e.target.value);
            });
        });
    }

    setupUploadZone(zoneId, inputId, isQuality) {
        const uploadZone = document.getElementById(zoneId);
        const fileInput = document.getElementById(inputId);

        // Click to upload
        uploadZone.addEventListener('click', () => {
            fileInput.click();
        });

        // Drag and drop
        uploadZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadZone.classList.add('dragover');
        });

        uploadZone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            uploadZone.classList.remove('dragover');
        });

        uploadZone.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadZone.classList.remove('dragover');
            this.handleFiles(e.dataTransfer.files, isQuality);
        });

        // File input change
        fileInput.addEventListener('change', (e) => {
            this.handleFiles(e.target.files, isQuality);
        });
    }

    handleFiles(files, isQuality = false) {
        if (isQuality) {
            if (files.length > 0) {
                this.appState.updateState('qualityFile', files[0]);
                this.displayQualityFile(files[0]);
                document.getElementById('analyzeBtn').disabled = false;
            }
        } else {
            const newFiles = Array.from(files).filter(file => 
                !this.appState.uploadedFiles.find(f => f.name === file.name)
            );
            
            this.appState.uploadedFiles.push(...newFiles);
            this.displayUploadedFiles();
        }
    }

    displayUploadedFiles() {
        const container = document.getElementById('uploadedFiles');
        container.innerHTML = '';

        this.appState.uploadedFiles.forEach((file, index) => {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';
            fileItem.innerHTML = `
                <div class="file-info">
                    <div class="file-icon">
                        <i class="${Utils.getFileIcon(file.name)}"></i>
                    </div>
                    <div class="file-details">
                        <h4>${file.name}</h4>
                        <p>${Utils.formatFileSize(file.size)}</p>
                    </div>
                </div>
                <button class="file-remove" onclick="fileUploadManager.removeFile(${index})">
                    <i class="fas fa-times"></i>
                </button>
            `;
            container.appendChild(fileItem);
        });
    }

    displayQualityFile(file) {
        const container = document.getElementById('qualityUploadedFiles');
        container.innerHTML = `
            <div class="file-item">
                <div class="file-info">
                    <div class="file-icon">
                        <i class="${Utils.getFileIcon(file.name)}"></i>
                    </div>
                    <div class="file-details">
                        <h4>${file.name}</h4>
                        <p>${Utils.formatFileSize(file.size)}</p>
                    </div>
                </div>
                <button class="file-remove" onclick="fileUploadManager.removeQualityFile()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
    }

    removeFile(index) {
        this.appState.uploadedFiles.splice(index, 1);
        this.displayUploadedFiles();
    }

    removeQualityFile() {
        this.appState.updateState('qualityFile', null);
        document.getElementById('qualityUploadedFiles').innerHTML = '';
        document.getElementById('analyzeBtn').disabled = true;
    }
}

// Documentation Manager
class DocumentationManager {
    constructor(appState) {
        this.appState = appState;
        this.init();
    }

    init() {
        const generateBtn = document.getElementById('generateBtn');
        const downloadBtn = document.getElementById('downloadBtn');
        const copyBtn = document.getElementById('copyBtn');

        generateBtn.addEventListener('click', () => this.generateDocumentation());
        downloadBtn.addEventListener('click', () => this.downloadDocumentation());
        copyBtn.addEventListener('click', () => this.copyDocumentation());
    }

    async generateDocumentation() {
        if (this.appState.uploadedFiles.length === 0) {
            Utils.showToast('Please upload at least one file', 'error');
            return;
        }

        const projectName = document.getElementById('projectName').value;
        const customInstructions = document.getElementById('customInstructions').value;

        if (this.appState.currentPurpose === 'readme' && !projectName) {
            Utils.showToast('Please enter a project name for README generation', 'error');
            return;
        }

        Utils.showLoading('Generating documentation...', 'AI is analyzing your code and creating documentation');

        try {
            // Since we're connecting to Streamlit backend, we'll simulate the API call
            // In a real implementation, you'd need to create API endpoints in your Streamlit app
            // or use a separate Flask/FastAPI backend
            
            // Simulate API delay
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            // Mock response for demonstration
            const mockContent = this.generateMockContent(projectName, this.appState.currentPurpose);
            
            this.appState.updateState('generatedContent', mockContent);
            this.displayPreview(mockContent, this.appState.currentPurpose);
            
            document.getElementById('downloadBtn').disabled = false;
            document.getElementById('copyBtn').disabled = false;
            
            Utils.showToast('Documentation generated successfully!', 'success');

        } catch (error) {
            console.error('Error generating documentation:', error);
            Utils.showToast('Failed to generate documentation. Please try again.', 'error');
        } finally {
            Utils.hideLoading();
        }
    }

    generateMockContent(projectName, purpose) {
        if (purpose === 'readme') {
            return `# ${projectName}

## Overview
${projectName} is a modern application built with cutting-edge technologies. This project demonstrates best practices in software development and provides a solid foundation for scalable applications.

## Features
- 🚀 High performance and optimized code
- 📱 Responsive design for all devices
- 🔒 Security-first approach
- 🧪 Comprehensive testing suite
- 📚 Well-documented codebase

## Installation

\`\`\`bash
# Clone the repository
git clone https://github.com/username/${projectName.toLowerCase()}.git

# Navigate to project directory
cd ${projectName.toLowerCase()}

# Install dependencies
npm install

# Start development server
npm run dev
\`\`\`

## Usage
Detailed usage instructions and examples will be provided here.

## Contributing
We welcome contributions! Please read our contributing guidelines before submitting pull requests.

## License
This project is licensed under the MIT License - see the LICENSE file for details.`;
        } else {
            return `// Enhanced code with AI-generated comments
// This file demonstrates best practices and includes detailed explanations

/**
 * Main application entry point
 * Initializes the application and sets up core functionality
 */
function initializeApp() {
    // Application initialization logic
    console.log('Application starting...');
    
    // Set up event listeners and core components
    setupEventListeners();
    initializeComponents();
    
    console.log('Application initialized successfully');
}

/**
 * Sets up global event listeners for the application
 * Handles user interactions and system events
 */
function setupEventListeners() {
    // Event listener setup code
    document.addEventListener('DOMContentLoaded', handleDOMReady);
    window.addEventListener('resize', handleWindowResize);
}

// Additional commented code would appear here...`;
        }
    }

    displayPreview(content, purpose) {
        const previewContainer = document.getElementById('previewContainer');
        
        if (purpose === 'readme') {
            previewContainer.innerHTML = `<div class="markdown-preview">${this.parseMarkdown(content)}</div>`;
        } else {
            previewContainer.innerHTML = `<div class="code-preview">${this.escapeHtml(content)}</div>`;
        }
    }

    parseMarkdown(markdown) {
        return markdown
            .replace(/^# (.*$)/gim, '<h1>$1</h1>')
            .replace(/^## (.*$)/gim, '<h2>$1</h2>')
            .replace(/^### (.*$)/gim, '<h3>$1</h3>')
            .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/gim, '<em>$1</em>')
            .replace(/```([\s\S]*?)```/gim, '<pre><code>$1</code></pre>')
            .replace(/`([^`]*)`/gim, '<code>$1</code>')
            .replace(/^\* (.*$)/gim, '<li>$1</li>')
            .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
            .replace(/\n/gim, '<br>');
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    downloadDocumentation() {
        if (!this.appState.generatedContent) {
            Utils.showToast('No content to download', 'error');
            return;
        }

        const filename = this.appState.currentPurpose === 'readme' ? 'README.md' : 'commented_code.txt';
        const blob = new Blob([this.appState.generatedContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        Utils.showToast('File downloaded successfully!', 'success');
    }

    copyDocumentation() {
        if (!this.appState.generatedContent) {
            Utils.showToast('No content to copy', 'error');
            return;
        }

        Utils.copyToClipboard(this.appState.generatedContent);
    }
}

// GitHub Manager
class GitHubManager {
    constructor(appState) {
        this.appState = appState;
        this.init();
    }

    init() {
        const connectBtn = document.getElementById('connectGithubBtn');
        const repoSelect = document.getElementById('repoSelect');
        const createPrBtn = document.getElementById('createPrBtn');

        connectBtn.addEventListener('click', () => this.connectToGitHub());
        repoSelect.addEventListener('change', () => this.loadBranches());
        createPrBtn.addEventListener('click', () => this.createPullRequest());
    }

    async connectToGitHub() {
        const token = document.getElementById('githubToken').value;
        
        if (!token) {
            Utils.showToast('Please enter a GitHub token', 'error');
            return;
        }

        Utils.showLoading('Connecting to GitHub...', 'Validating your access token');

        try {
            // Simulate GitHub connection
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            this.appState.updateState('githubConnected', true);
            this.appState.updateState('githubToken', token);
            
            this.updateConnectionStatus(true);
            await this.loadRepositories();
            
            Utils.showToast('Successfully connected to GitHub!', 'success');

        } catch (error) {
            console.error('GitHub connection error:', error);
            Utils.showToast('Failed to connect to GitHub. Please check your token.', 'error');
        } finally {
            Utils.hideLoading();
        }
    }

    updateConnectionStatus(connected) {
        const statusElement = document.getElementById('githubStatus');
        const githubRepos = document.getElementById('githubRepos');
        const prForm = document.getElementById('prForm');
        const prPlaceholder = document.getElementById('prPlaceholder');

        if (connected) {
            statusElement.classList.add('connected');
            statusElement.innerHTML = '<div class="status-dot"></div><span>Connected</span>';
            githubRepos.style.display = 'block';
            
            if (this.appState.generatedContent) {
                prForm.style.display = 'block';
                prPlaceholder.style.display = 'none';
            }
        } else {
            statusElement.classList.remove('connected');
            statusElement.innerHTML = '<div class="status-dot"></div><span>Disconnected</span>';
            githubRepos.style.display = 'none';
            prForm.style.display = 'none';
            prPlaceholder.style.display = 'block';
        }
    }

    async loadRepositories() {
        try {
            // Mock repositories
            const repos = ['user/repo1', 'user/repo2', 'user/awesome-project'];
            const repoSelect = document.getElementById('repoSelect');
            
            repoSelect.innerHTML = '<option value="">Choose a repository...</option>';
            repos.forEach(repo => {
                const option = document.createElement('option');
                option.value = repo;
                option.textContent = repo;
                repoSelect.appendChild(option);
            });

        } catch (error) {
            console.error('Error loading repositories:', error);
            Utils.showToast('Failed to load repositories', 'error');
        }
    }

    async loadBranches() {
        const selectedRepo = document.getElementById('repoSelect').value;
        
        if (!selectedRepo) {
            return;
        }

        this.appState.updateState('selectedRepo', selectedRepo);

        try {
            // Mock branches
            const branches = ['main', 'develop', 'feature/new-feature'];
            const branchSelect = document.getElementById('branchSelect');
            
            branchSelect.innerHTML = '<option value="">Choose a branch...</option>';
            branches.forEach(branch => {
                const option = document.createElement('option');
                option.value = branch;
                option.textContent = branch;
                branchSelect.appendChild(option);
            });

        } catch (error) {
            console.error('Error loading branches:', error);
            Utils.showToast('Failed to load branches', 'error');
        }
    }

    async createPullRequest() {
        if (!this.appState.generatedContent) {
            Utils.showToast('Generate documentation first', 'error');
            return;
        }

        const selectedBranch = document.getElementById('branchSelect').value;
        const prTitle = document.getElementById('prTitle').value;
        const prDescription = document.getElementById('prDescription').value;
        const commitMessage = document.getElementById('commitMessage').value;

        if (!this.appState.selectedRepo || !selectedBranch) {
            Utils.showToast('Please select a repository and branch', 'error');
            return;
        }

        if (!prTitle || !commitMessage) {
            Utils.showToast('Please fill in PR title and commit message', 'error');
            return;
        }

        Utils.showLoading('Creating pull request...', 'Pushing changes and creating PR');

        try {
            // Simulate PR creation
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            const prUrl = `https://github.com/${this.appState.selectedRepo}/pull/123`;
            Utils.showToast(`Pull request created successfully! <a href="${prUrl}" target="_blank" style="color: var(--primary-color); text-decoration: underline;">View PR</a>`, 'success', 8000);

        } catch (error) {
            console.error('Error creating PR:', error);
            Utils.showToast('Failed to create pull request', 'error');
        } finally {
            Utils.hideLoading();
        }
    }
}

// Quality Analysis Manager
class QualityAnalysisManager {
    constructor(appState) {
        this.appState = appState;
        this.init();
    }

    init() {
        const analyzeBtn = document.getElementById('analyzeBtn');
        analyzeBtn.addEventListener('click', () => this.analyzeCode());
    }

    async analyzeCode() {
        if (!this.appState.qualityFile) {
            Utils.showToast('Please upload a file to analyze', 'error');
            return;
        }

        Utils.showLoading('Analyzing code quality...', 'AI is examining your code for issues and improvements');

        try {
            // Simulate analysis
            await new Promise(resolve => setTimeout(resolve, 4000));
            
            const mockResults = this.generateMockAnalysis();
            this.displayResults(mockResults);
            
            Utils.showToast('Code analysis completed!', 'success');

        } catch (error) {
            console.error('Error analyzing code:', error);
            Utils.showToast('Failed to analyze code. Please try again.', 'error');
        } finally {
            Utils.hideLoading();
        }
    }

    generateMockAnalysis() {
        return {
            summary: "Your code shows good structure with room for improvement in error handling and documentation.",
            metrics: {
                "Code Quality": "B+",
                "Maintainability": "85%",
                "Security Score": "92%",
                "Performance": "Good",
                "Test Coverage": "78%",
                "Documentation": "65%"
            },
            issues: [
                {
                    line: 15,
                    message: "Consider adding error handling for this function call",
                    severity: "warning",
                    type: "error_handling"
                },
                {
                    line: 32,
                    message: "This variable name could be more descriptive",
                    severity: "info",
                    type: "naming"
                },
                {
                    line: 45,
                    message: "Potential security vulnerability: input validation needed",
                    severity: "error",
                    type: "security"
                }
            ],
            suggestions: [
                "Add comprehensive error handling throughout the codebase",
                "Improve variable and function naming for better readability",
                "Consider adding unit tests for critical functions",
                "Add JSDoc comments for better documentation"
            ]
        };
    }

    displayResults(results) {
        const resultsContainer = document.getElementById('resultsContainer');
        
        let html = '';

        // Display summary
        if (results.summary) {
            html += `
                <div class="quality-summary" style="margin-bottom: var(--spacing-xl); padding: var(--spacing-lg); background: var(--bg-secondary); border-radius: var(--radius-lg); border-left: 4px solid var(--primary-color);">
                    <h4 style="margin-bottom: var(--spacing-sm); color: var(--text-primary);">Summary</h4>
                    <p style="color: var(--text-secondary);">${results.summary}</p>
                </div>
            `;
        }

        // Display metrics
        if (results.metrics) {
            html += '<div class="quality-metrics">';
            Object.entries(results.metrics).forEach(([key, value]) => {
                html += `
                    <div class="metric-card">
                        <div class="metric-value">${value}</div>
                        <div class="metric-label">${key}</div>
                    </div>
                `;
            });
            html += '</div>';
        }

        // Display issues
        if (results.issues && results.issues.length > 0) {
            html += '<div class="issues-section"><h4 style="margin-bottom: var(--spacing-lg); color: var(--text-primary);">Issues Found</h4>';
            results.issues.forEach(issue => {
                const severity = issue.severity ? issue.severity.toLowerCase() : 'info';
                html += `
                    <div class="issue-item ${severity}">
                        <div class="issue-severity ${severity}">${issue.severity || 'INFO'}</div>
                        <div class="issue-content">
                            <div class="issue-message">${issue.message || 'No description available'}</div>
                            <div class="issue-line">Line ${issue.line || 'N/A'} • ${issue.type || 'General'}</div>
                        </div>
                    </div>
                `;
            });
            html += '</div>';
        } else {
            html += `
                <div class="no-issues" style="text-align: center; padding: var(--spacing-2xl); color: var(--success-color);">
                    <h4 style="margin-bottom: var(--spacing-sm);">🎉 No issues found!</h4>
                    <p>Your code looks great!</p>
                </div>
            `;
        }

        // Display suggestions
        if (results.suggestions && results.suggestions.length > 0) {
            html += `
                <div class="suggestions-section" style="margin-top: var(--spacing-xl);">
                    <h4 style="margin-bottom: var(--spacing-lg); color: var(--text-primary);">Suggestions</h4>
                    <ul style="margin-left: var(--spacing-lg);">
            `;
            results.suggestions.forEach(suggestion => {
                html += `<li style="margin-bottom: var(--spacing-sm); color: var(--text-secondary);">${suggestion}</li>`;
            });
            html += '</ul></div>';
        }

        resultsContainer.innerHTML = html;
    }
}

// Application Initialization
class PokeMentorApp {
    constructor() {
        this.appState = new AppState();
        this.init();
    }

    init() {
        // Initialize managers
        this.themeManager = new ThemeManager();
        this.tabManager = new TabManager(this.appState);
        this.fileUploadManager = new FileUploadManager(this.appState);
        this.documentationManager = new DocumentationManager(this.appState);
        this.githubManager = new GitHubManager(this.appState);
        this.qualityAnalysisManager = new QualityAnalysisManager(this.appState);

        // Set up global event listeners
        this.setupGlobalEventListeners();

        // Set default values
        this.setDefaultValues();

        console.log('PokeMentor application initialized successfully!');
    }

    setupGlobalEventListeners() {
        // Listen for state changes
        window.addEventListener('stateChange', (e) => {
            const { key, value } = e.detail;
            this.handleStateChange(key, value);
        });

        // Handle keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case 'k':
                        e.preventDefault();
                        // Focus search or upload
                        document.getElementById('fileInput').click();
                        break;
                    case 'Enter':
                        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                            // Handle form submission
                            const generateBtn = document.getElementById('generateBtn');
                            if (!generateBtn.disabled) {
                                generateBtn.click();
                            }
                        }
                        break;
                }
            }
        });
    }

    handleStateChange(key, value) {
        switch (key) {
            case 'githubConnected':
                this.githubManager.updateConnectionStatus(value);
                break;
            case 'generatedContent':
                if (value && this.appState.githubConnected) {
                    document.getElementById('prForm').style.display = 'block';
                    document.getElementById('prPlaceholder').style.display = 'none';
                }
                break;
        }
    }

    setDefaultValues() {
        // Set default PR values
        document.getElementById('prTitle').value = 'docs: add AI-generated documentation';
        document.getElementById('prDescription').value = 'This PR adds comprehensive documentation generated by AI to improve code understanding and maintainability.';
        document.getElementById('commitMessage').value = 'docs: add AI-generated documentation';
    }
}

// Global instances for external access
let app;
let fileUploadManager;

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    app = new PokeMentorApp();
    fileUploadManager = app.fileUploadManager; // For global access in HTML onclick handlers
});

// Export for potential module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PokeMentorApp, Utils };
}