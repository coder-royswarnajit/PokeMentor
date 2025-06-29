"""
API Bridge for PokeMentor Frontend
This file creates a simple Flask API to bridge the frontend with the existing backend logic.
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import sys
import tempfile
import zipfile
from werkzeug.utils import secure_filename

# Add the parent directory to the path to import the existing modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core import call_gemini, process_file_content, process_zip_file, SUPPORTED_FILES
from github_integration import GitHubIntegration
from code_quality import CodeQualityAnalyzer
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Configuration
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_API_URL = os.getenv("GEMINI_API_URL")
UPLOAD_FOLDER = tempfile.gettempdir()
ALLOWED_EXTENSIONS = set(SUPPORTED_FILES.keys())

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size

# Global variables to store state (in production, use a proper session management)
github_integrations = {}
code_analyzer = CodeQualityAnalyzer(gemini_api_key=GEMINI_API_KEY)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({"status": "healthy", "message": "PokeMentor API is running"})

@app.route('/generate-docs', methods=['POST'])
def generate_documentation():
    """Generate documentation from uploaded files"""
    try:
        if 'files' not in request.files:
            return jsonify({"error": "No files uploaded"}), 400
        
        files = request.files.getlist('files')
        purpose = request.form.get('purpose', 'readme')
        project_name = request.form.get('project_name', '')
        custom_instructions = request.form.get('custom_instructions', '')
        
        if not files or all(file.filename == '' for file in files):
            return jsonify({"error": "No files selected"}), 400
        
        # Process uploaded files
        file_content = {}
        
        for file in files:
            if file and allowed_file(file.filename):
                filename = secure_filename(file.filename)
                
                if filename.endswith('.zip'):
                    # Handle zip file
                    zip_content = process_zip_file(file)
                    file_content.update(zip_content)
                else:
                    # Handle regular file
                    content = file.read().decode('utf-8')
                    file_content[filename] = content
        
        if not file_content:
            return jsonify({"error": "No valid files found"}), 400
        
        # Generate documentation
        is_multiple = len(file_content) > 1
        
        if purpose.lower() == 'readme':
            if not project_name:
                return jsonify({"error": "Project name is required for README generation"}), 400
            
            result = call_gemini(
                file_content,
                purpose.lower(),
                is_multiple,
                project_name,
                custom_instructions,
                GEMINI_API_KEY,
                GEMINI_API_URL
            )
            
            return jsonify({
                "success": True,
                "content": result,
                "filename": "README.md",
                "type": "readme"
            })
        
        else:  # Comments
            commented_files = {}
            for file_name, content in file_content.items():
                commented_content = call_gemini(
                    {file_name: content},
                    "comment",
                    False,
                    file_name,
                    custom_instructions,
                    GEMINI_API_KEY,
                    GEMINI_API_URL
                )
                commented_files[file_name] = commented_content
            
            # Return the first file for preview, but store all files
            first_file = next(iter(commented_files))
            
            return jsonify({
                "success": True,
                "content": commented_files[first_file],
                "all_files": commented_files,
                "filename": first_file,
                "type": "comments"
            })
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/analyze-quality', methods=['POST'])
def analyze_code_quality():
    """Analyze code quality for uploaded file"""
    try:
        if 'file' not in request.files:
            return jsonify({"error": "No file uploaded"}), 400
        
        file = request.files['file']
        
        if file.filename == '':
            return jsonify({"error": "No file selected"}), 400
        
        if not allowed_file(file.filename):
            return jsonify({"error": "File type not supported"}), 400
        
        # Read file content
        content = file.read().decode('utf-8')
        filename = secure_filename(file.filename)
        
        # Analyze with AI
        analysis_result = code_analyzer.analyze_with_ai(content, filename)
        
        return jsonify(analysis_result)
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/github/connect', methods=['POST'])
def connect_github():
    """Connect to GitHub with provided token"""
    try:
        data = request.get_json()
        token = data.get('token')
        
        if not token:
            return jsonify({"error": "GitHub token is required"}), 400
        
        # Create GitHub integration instance
        github = GitHubIntegration(token)
        
        # Validate token
        if github.validate_token():
            # Store the integration (in production, use proper session management)
            session_id = f"session_{len(github_integrations)}"
            github_integrations[session_id] = github
            
            return jsonify({
                "success": True,
                "session_id": session_id,
                "message": "Successfully connected to GitHub"
            })
        else:
            return jsonify({
                "success": False,
                "error": "Invalid GitHub token"
            }), 401
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/github/repos', methods=['GET'])
def get_repositories():
    """Get user repositories"""
    try:
        # In a real implementation, you'd get the session_id from headers or auth
        # For now, we'll use the first available integration
        if not github_integrations:
            return jsonify({"error": "Not connected to GitHub"}), 401
        
        github = next(iter(github_integrations.values()))
        repos = github.get_repositories()
        
        return jsonify(repos)
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/github/branches', methods=['POST'])
def get_branches():
    """Get branches for a repository"""
    try:
        data = request.get_json()
        repo_name = data.get('repo')
        
        if not repo_name:
            return jsonify({"error": "Repository name is required"}), 400
        
        if not github_integrations:
            return jsonify({"error": "Not connected to GitHub"}), 401
        
        github = next(iter(github_integrations.values()))
        branches = github.get_branches(repo_name)
        
        return jsonify(branches)
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/github/create-pr', methods=['POST'])
def create_pull_request():
    """Create a pull request"""
    try:
        data = request.get_json()
        
        repo_name = data.get('repo')
        branch = data.get('branch')
        content = data.get('content')
        purpose = data.get('purpose', 'readme')
        pr_title = data.get('pr_title')
        pr_description = data.get('pr_description')
        commit_message = data.get('commit_message')
        
        if not all([repo_name, branch, content, pr_title, commit_message]):
            return jsonify({"error": "Missing required fields"}), 400
        
        if not github_integrations:
            return jsonify({"error": "Not connected to GitHub"}), 401
        
        github = next(iter(github_integrations.values()))
        
        # Prepare content map
        content_map = {}
        if purpose == 'readme':
            content_map['README.md'] = content
        else:
            # For comments, we'd need to handle multiple files
            # This is simplified for the demo
            content_map['commented_code.py'] = content
        
        # Create PR
        result = github.create_pull_request(
            repo_name,
            branch,
            content_map,
            commit_message,
            pr_title,
            pr_description
        )
        
        return jsonify(result)
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.errorhandler(413)
def too_large(e):
    return jsonify({"error": "File too large"}), 413

@app.errorhandler(404)
def not_found(e):
    return jsonify({"error": "Endpoint not found"}), 404

@app.errorhandler(500)
def internal_error(e):
    return jsonify({"error": "Internal server error"}), 500

if __name__ == '__main__':
    print("Starting PokeMentor API Bridge...")
    print(f"Gemini API configured: {'Yes' if GEMINI_API_KEY else 'No'}")
    print("Available endpoints:")
    print("  GET  /health - Health check")
    print("  POST /generate-docs - Generate documentation")
    print("  POST /analyze-quality - Analyze code quality")
    print("  POST /github/connect - Connect to GitHub")
    print("  GET  /github/repos - Get repositories")
    print("  POST /github/branches - Get branches")
    print("  POST /github/create-pr - Create pull request")
    print("\nStarting server on http://localhost:8000")
    
    app.run(host='0.0.0.0', port=8000, debug=True)