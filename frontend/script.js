// Global state management
const AppState = {
    currentTab: 'documentation',
    githubConnected: false,
    githubToken: '',
    selectedRepo: '',
    selectedBranch: '',
    uploadedFiles: [],
    qualityFile: null,
    generatedContent: '',
    currentPurpose: 'readme'
};

// API Configuration
const API_CONFIG = {
    baseUrl: 'http://localhost:8000', // This will need to be updated to match your Python backend
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
const Utils = {
    formatFileSize: (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },

    getFileExtension: (filename) => {
        return filename.split('.').pop().toLowerCase();
    },

    getFileIcon: (filename) => {
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
            'zip': 'fas fa-file-archive'
        };
        return iconMap[ext] || 'fas fa-file-code';
    },

    showToast: (message, type = 'info') => {
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
            <span class="toast-message">${message}</span>
        `;

        toastContainer.appendChild(toast);

        // Auto remove after 5 seconds
        setTimeout(() => {
            toast.style.animation = 'slideIn 0.3s ease-out reverse';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 5000);
    },

    showLoading: (text = 'Processing...') => {
        const overlay = document.getElementById('loadingOverlay');
        const loadingText = document.getElementById('loadingText');
        loadingText.textContent = text;
        overlay.classList.add('active');
    },

    hideLoading: () => {
        const overlay = document.getElementById('loadingOverlay');
        overlay.classList.remove('active');
    }
};

// Tab Management
const TabManager = {
    init: () => {
        const navButtons = document.querySelectorAll('.nav-btn');
        navButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tabName = e.currentTarget.dataset.tab;
                TabManager.switchTab(tabName);
            });
        });
    },

    switchTab: (tabName) => {
        // Update nav buttons
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(tabName).classList.add('active');

        AppState.currentTab = tabName;
    }
};

// File Upload Management
const FileUploadManager = {
    init: () => {
        // Documentation file upload
        const fileUploadArea = document.getElementById('fileUploadArea');
        const fileInput = document.getElementById('fileInput');
        const uploadedFilesContainer = document.getElementById('uploadedFiles');

        // Quality analysis file upload
        const qualityFileUploadArea = document.getElementById('qualityFileUploadArea');
        const qualityFileInput = document.getElementById('qualityFileInput');
        const qualityUploadedFilesContainer = document.getElementById('qualityUploadedFiles');

        // Setup drag and drop for documentation files
        FileUploadManager.setupDragAndDrop(fileUploadArea, fileInput, false);
        
        // Setup drag and drop for quality analysis
        FileUploadManager.setupDragAndDrop(qualityFileUploadArea, qualityFileInput, true);

        // File input change handlers
        fileInput.addEventListener('change', (e) => {
            FileUploadManager.handleFiles(e.target.files, false);
        });

        qualityFileInput.addEventListener('change', (e) => {
            FileUploadManager.handleFiles(e.target.files, true);
        });
    },

    setupDragAndDrop: (uploadArea, fileInput, isQuality) => {
        uploadArea.addEventListener('click', () => {
            fileInput.click();
        });

        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });

        uploadArea.addEventListener('dragleave', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            FileUploadManager.handleFiles(e.dataTransfer.files, isQuality);
        });
    },

    handleFiles: (files, isQuality = false) => {
        if (isQuality) {
            // Quality analysis only accepts single file
            if (files.length > 0) {
                AppState.qualityFile = files[0];
                FileUploadManager.displayQualityFile(files[0]);
                document.getElementById('analyzeBtn').disabled = false;
            }
        } else {
            // Documentation can accept multiple files
            Array.from(files).forEach(file => {
                if (!AppState.uploadedFiles.find(f => f.name === file.name)) {
                    AppState.uploadedFiles.push(file);
                }
            });
            FileUploadManager.displayUploadedFiles();
        }
    },

    displayUploadedFiles: () => {
        const container = document.getElementById('uploadedFiles');
        container.innerHTML = '';

        AppState.uploadedFiles.forEach((file, index) => {
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
                <button class="file-remove" onclick="FileUploadManager.removeFile(${index})">
                    <i class="fas fa-times"></i>
                </button>
            `;
            container.appendChild(fileItem);
        });
    },

    displayQualityFile: (file) => {
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
                <button class="file-remove" onclick="FileUploadManager.removeQualityFile()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
    },

    removeFile: (index) => {
        AppState.uploadedFiles.splice(index, 1);
        FileUploadManager.displayUploadedFiles();
    },

    removeQualityFile: () => {
        AppState.qualityFile = null;
        document.getElementById('qualityUploadedFiles').innerHTML = '';
        document.getElementById('analyzeBtn').disabled = true;
    }
};

// Documentation Generation
const DocumentationManager = {
    init: () => {
        const generateBtn = document.getElementById('generateBtn');
        const downloadBtn = document.getElementById('downloadBtn');
        const purposeRadios = document.querySelectorAll('input[name="purpose"]');

        generateBtn.addEventListener('click', DocumentationManager.generateDocumentation);
        downloadBtn.addEventListener('click', DocumentationManager.downloadDocumentation);

        purposeRadios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                AppState.currentPurpose = e.target.value;
            });
        });
    },

    generateDocumentation: async () => {
        if (AppState.uploadedFiles.length === 0) {
            Utils.showToast('Please upload at least one file', 'error');
            return;
        }

        const projectName = document.getElementById('projectName').value;
        const customInstructions = document.getElementById('customInstructions').value;

        if (AppState.currentPurpose === 'readme' && !projectName) {
            Utils.showToast('Please enter a project name for README generation', 'error');
            return;
        }

        Utils.showLoading('Generating documentation...');

        try {
            const formData = new FormData();
            
            // Add files
            AppState.uploadedFiles.forEach(file => {
                formData.append('files', file);
            });

            // Add metadata
            formData.append('purpose', AppState.currentPurpose);
            formData.append('project_name', projectName);
            formData.append('custom_instructions', customInstructions);

            // This is a placeholder for the actual API call
            // You'll need to implement the backend endpoint
            const response = await fetch(`${API_CONFIG.baseUrl}${API_CONFIG.endpoints.generateDocs}`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error('Failed to generate documentation');
            }

            const result = await response.json();
            AppState.generatedContent = result.content;
            
            DocumentationManager.displayPreview(result.content, AppState.currentPurpose);
            document.getElementById('downloadBtn').disabled = false;
            
            Utils.showToast('Documentation generated successfully!', 'success');

        } catch (error) {
            console.error('Error generating documentation:', error);
            Utils.showToast('Failed to generate documentation. Please try again.', 'error');
        } finally {
            Utils.hideLoading();
        }
    },

    displayPreview: (content, purpose) => {
        const previewContent = document.getElementById('previewContent');
        
        if (purpose === 'readme') {
            // Display as markdown
            previewContent.innerHTML = `<div class="markdown-preview">${DocumentationManager.parseMarkdown(content)}</div>`;
        } else {
            // Display as code
            previewContent.innerHTML = `<div class="code-preview">${DocumentationManager.escapeHtml(content)}</div>`;
        }
    },

    parseMarkdown: (markdown) => {
        // Simple markdown parser - you might want to use a library like marked.js for production
        return markdown
            .replace(/^# (.*$)/gim, '<h1>$1</h1>')
            .replace(/^## (.*$)/gim, '<h2>$1</h2>')
            .replace(/^### (.*$)/gim, '<h3>$1</h3>')
            .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
            .replace(/\*(.*)\*/gim, '<em>$1</em>')
            .replace(/```([\s\S]*?)```/gim, '<pre><code>$1</code></pre>')
            .replace(/`([^`]*)`/gim, '<code>$1</code>')
            .replace(/^\* (.*$)/gim, '<li>$1</li>')
            .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
            .replace(/\n/gim, '<br>');
    },

    escapeHtml: (text) => {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    downloadDocumentation: () => {
        if (!AppState.generatedContent) {
            Utils.showToast('No content to download', 'error');
            return;
        }

        const filename = AppState.currentPurpose === 'readme' ? 'README.md' : 'commented_code.txt';
        const blob = new Blob([AppState.generatedContent], { type: 'text/plain' });
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
};

// GitHub Integration
const GitHubManager = {
    init: () => {
        const connectBtn = document.getElementById('connectGithubBtn');
        const repoSelect = document.getElementById('repoSelect');
        const createPrBtn = document.getElementById('createPrBtn');

        connectBtn.addEventListener('click', GitHubManager.connectToGitHub);
        repoSelect.addEventListener('change', GitHubManager.loadBranches);
        createPrBtn.addEventListener('click', GitHubManager.createPullRequest);
    },

    connectToGitHub: async () => {
        const token = document.getElementById('githubToken').value;
        
        if (!token) {
            Utils.showToast('Please enter a GitHub token', 'error');
            return;
        }

        Utils.showLoading('Connecting to GitHub...');

        try {
            // This is a placeholder for the actual API call
            const response = await fetch(`${API_CONFIG.baseUrl}${API_CONFIG.endpoints.connectGithub}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ token })
            });

            if (!response.ok) {
                throw new Error('Failed to connect to GitHub');
            }

            const result = await response.json();
            
            if (result.success) {
                AppState.githubConnected = true;
                AppState.githubToken = token;
                
                GitHubManager.updateConnectionStatus(true);
                await GitHubManager.loadRepositories();
                
                Utils.showToast('Successfully connected to GitHub!', 'success');
            } else {
                throw new Error(result.error || 'Connection failed');
            }

        } catch (error) {
            console.error('GitHub connection error:', error);
            Utils.showToast('Failed to connect to GitHub. Please check your token.', 'error');
        } finally {
            Utils.hideLoading();
        }
    },

    updateConnectionStatus: (connected) => {
        const statusIndicator = document.getElementById('githubStatus');
        const githubRepos = document.getElementById('githubRepos');
        const prForm = document.getElementById('prForm');
        const prPlaceholder = document.getElementById('prPlaceholder');

        if (connected) {
            statusIndicator.classList.add('connected');
            statusIndicator.innerHTML = '<i class="fas fa-circle"></i><span>Connected</span>';
            githubRepos.style.display = 'block';
            
            if (AppState.generatedContent) {
                prForm.style.display = 'block';
                prPlaceholder.style.display = 'none';
            }
        } else {
            statusIndicator.classList.remove('connected');
            statusIndicator.innerHTML = '<i class="fas fa-circle"></i><span>Disconnected</span>';
            githubRepos.style.display = 'none';
            prForm.style.display = 'none';
            prPlaceholder.style.display = 'block';
        }
    },

    loadRepositories: async () => {
        try {
            const response = await fetch(`${API_CONFIG.baseUrl}${API_CONFIG.endpoints.getRepos}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${AppState.githubToken}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to load repositories');
            }

            const repos = await response.json();
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
    },

    loadBranches: async () => {
        const selectedRepo = document.getElementById('repoSelect').value;
        
        if (!selectedRepo) {
            return;
        }

        AppState.selectedRepo = selectedRepo;

        try {
            const response = await fetch(`${API_CONFIG.baseUrl}${API_CONFIG.endpoints.getBranches}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${AppState.githubToken}`
                },
                body: JSON.stringify({ repo: selectedRepo })
            });

            if (!response.ok) {
                throw new Error('Failed to load branches');
            }

            const branches = await response.json();
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
    },

    createPullRequest: async () => {
        if (!AppState.generatedContent) {
            Utils.showToast('Generate documentation first', 'error');
            return;
        }

        const selectedBranch = document.getElementById('branchSelect').value;
        const prTitle = document.getElementById('prTitle').value;
        const prDescription = document.getElementById('prDescription').value;
        const commitMessage = document.getElementById('commitMessage').value;

        if (!AppState.selectedRepo || !selectedBranch) {
            Utils.showToast('Please select a repository and branch', 'error');
            return;
        }

        if (!prTitle || !commitMessage) {
            Utils.showToast('Please fill in PR title and commit message', 'error');
            return;
        }

        Utils.showLoading('Creating pull request...');

        try {
            const response = await fetch(`${API_CONFIG.baseUrl}${API_CONFIG.endpoints.createPR}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${AppState.githubToken}`
                },
                body: JSON.stringify({
                    repo: AppState.selectedRepo,
                    branch: selectedBranch,
                    content: AppState.generatedContent,
                    purpose: AppState.currentPurpose,
                    pr_title: prTitle,
                    pr_description: prDescription,
                    commit_message: commitMessage
                })
            });

            if (!response.ok) {
                throw new Error('Failed to create pull request');
            }

            const result = await response.json();
            
            if (result.success) {
                Utils.showToast(`Pull request created successfully! <a href="${result.pr_url}" target="_blank">View PR</a>`, 'success');
            } else {
                throw new Error(result.error || 'Failed to create PR');
            }

        } catch (error) {
            console.error('Error creating PR:', error);
            Utils.showToast('Failed to create pull request', 'error');
        } finally {
            Utils.hideLoading();
        }
    }
};

// Code Quality Analysis
const QualityAnalysisManager = {
    init: () => {
        const analyzeBtn = document.getElementById('analyzeBtn');
        analyzeBtn.addEventListener('click', QualityAnalysisManager.analyzeCode);
    },

    analyzeCode: async () => {
        if (!AppState.qualityFile) {
            Utils.showToast('Please upload a file to analyze', 'error');
            return;
        }

        Utils.showLoading('Analyzing code quality...');

        try {
            const formData = new FormData();
            formData.append('file', AppState.qualityFile);

            const response = await fetch(`${API_CONFIG.baseUrl}${API_CONFIG.endpoints.analyzeQuality}`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error('Failed to analyze code');
            }

            const result = await response.json();
            QualityAnalysisManager.displayResults(result);
            
            Utils.showToast('Code analysis completed!', 'success');

        } catch (error) {
            console.error('Error analyzing code:', error);
            Utils.showToast('Failed to analyze code. Please try again.', 'error');
        } finally {
            Utils.hideLoading();
        }
    },

    displayResults: (results) => {
        const qualityContent = document.getElementById('qualityContent');
        
        let html = '';

        // Display summary
        if (results.summary) {
            html += `<div class="quality-summary">
                <h4>Summary</h4>
                <p>${results.summary}</p>
            </div>`;
        }

        // Display metrics
        if (results.metrics) {
            html += '<div class="quality-metrics">';
            Object.entries(results.metrics).forEach(([key, value]) => {
                if (value !== null && value !== undefined) {
                    html += `
                        <div class="metric-card">
                            <div class="metric-value">${value}</div>
                            <div class="metric-label">${key.replace(/_/g, ' ').toUpperCase()}</div>
                        </div>
                    `;
                }
            });
            html += '</div>';
        }

        // Display issues
        if (results.issues && results.issues.length > 0) {
            html += '<div class="issues-section"><h4>Issues Found</h4>';
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
            html += '<div class="no-issues"><h4>🎉 No issues found!</h4><p>Your code looks great!</p></div>';
        }

        // Display suggestions
        if (results.suggestions && results.suggestions.length > 0) {
            html += '<div class="suggestions-section"><h4>Suggestions</h4><ul>';
            results.suggestions.forEach(suggestion => {
                html += `<li>${suggestion}</li>`;
            });
            html += '</ul></div>';
        }

        qualityContent.innerHTML = html;
    }
};

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    TabManager.init();
    FileUploadManager.init();
    DocumentationManager.init();
    GitHubManager.init();
    QualityAnalysisManager.init();

    // Update GitHub integration visibility based on generated content
    const observer = new MutationObserver(() => {
        if (AppState.generatedContent && AppState.githubConnected) {
            document.getElementById('prForm').style.display = 'block';
            document.getElementById('prPlaceholder').style.display = 'none';
        }
    });

    // Set up default values
    document.getElementById('prTitle').value = 'Add AI-generated documentation';
    document.getElementById('prDescription').value = 'This PR adds AI-generated documentation to the project.';
    document.getElementById('commitMessage').value = 'Add documentation';

    console.log('PokeMentor frontend initialized successfully!');
});

// Export for global access (if needed)
window.PokeMentor = {
    AppState,
    Utils,
    TabManager,
    FileUploadManager,
    DocumentationManager,
    GitHubManager,
    QualityAnalysisManager
};