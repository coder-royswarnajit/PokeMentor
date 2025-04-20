import streamlit as st
from core import process_file_content, process_zip_file, call_gemini, SUPPORTED_FILES
import os
from dotenv import load_dotenv
from github_integration import GitHubIntegration
from code_quality import CodeQualityAnalyzer

# Load environment variables
load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_API_URL = os.getenv("GEMINI_API_URL")

# Page configuration
st.set_page_config(
    page_title="PokeMentor",
    page_icon="📝",
    layout="wide",
)

# Initialize session state
if 'github_integration' not in st.session_state:
    st.session_state.github_integration = None
if 'generated_content' not in st.session_state:
    st.session_state.generated_content = ""
if 'file_content' not in st.session_state:
    st.session_state.file_content = {}
if 'current_file' not in st.session_state:
    st.session_state.current_file = ""
if 'project_name' not in st.session_state:
    st.session_state.project_name = ""
if 'purpose' not in st.session_state:
    st.session_state.purpose = "README"
if 'code_analyzer' not in st.session_state:
    st.session_state.code_analyzer = CodeQualityAnalyzer(
        gemini_api_key=GEMINI_API_KEY
    )

# Main title
st.title("PokeMentor")

# Sidebar configuration
with st.sidebar:
    st.header("GitHub Integration")
    github_token = st.text_input("GitHub Token", type="password", 
                             help="Enter your GitHub Personal Access Token with repo scope")
    
    if st.button("Connect to GitHub"):
        with st.spinner("Connecting to GitHub..."):
            github = GitHubIntegration(github_token)
            if github.validate_token():
                st.session_state.github_integration = github
                st.success("Successfully connected to GitHub!")
            else:
                st.error("Failed to connect to GitHub. Please check your token.")
    
    if st.session_state.github_integration:
        st.success("Connected to GitHub")
        
        # Get repositories
        repos = st.session_state.github_integration.get_repositories()
        
        if repos:
            selected_repo = st.selectbox("Select Repository", repos)
            
            # Get branches for the selected repo
            if selected_repo:
                branches = st.session_state.github_integration.get_branches(selected_repo)
                if branches:
                    selected_branch = st.selectbox("Select Branch", branches)
                else:
                    st.warning("No branches found or access denied.")
        else:
            st.warning("No repositories found or access denied.")

# Main content area
tab1, tab2, tab3 = st.tabs(["Generate Documentation", "GitHub Integration", "Code Quality Analysis"])


with tab1:
    st.header("Generate Documentation")
    
    col1, col2 = st.columns(2)
    
    with col1:
        purpose = st.radio("Purpose", ["README", "Comments"], 
                          help="Generate README file or add comments to code")
        st.session_state.purpose = purpose
        
        file_upload = st.file_uploader("Upload Code Files", 
                                      type=["py", "js", "jsx", "ts", "tsx", "java", "c", "cpp", 
                                            "cs", "go", "rs", "php", "rb", "swift", "kt", "zip"],
                                      accept_multiple_files=True,
                                      help="Upload single or multiple files or a zip archive")
        
        project_name = st.text_input("Project Name", 
                                    help="Enter a name for your project")
        st.session_state.project_name = project_name
        
        custom_instructions = st.text_area("Additional Instructions", 
                                          help="Add any specific instructions for the AI")
        
        if st.button("Generate Documentation"):
            if not file_upload:
                st.error("Please upload at least one file.")
            elif purpose == "README" and not project_name:
                st.error("Please enter a project name.")
            else:
                with st.spinner("Generating documentation..."):
                    try:
                        # Process files
                        if len(file_upload) == 1 and file_upload[0].name.endswith(".zip"):
                            st.session_state.file_content = process_zip_file(file_upload[0])
                            is_multiple = True
                        else:
                            st.session_state.file_content = {f.name: process_file_content(f) for f in file_upload}
                            is_multiple = len(file_upload) > 1
                        
                        # Generate documentation
                        if purpose.lower() == "readme":
                            result = call_gemini(
                                st.session_state.file_content, 
                                purpose.lower(), 
                                is_multiple, 
                                project_name,
                                custom_instructions,
                                GEMINI_API_KEY,
                                GEMINI_API_URL
                            )
                            st.session_state.generated_content = result
                            st.session_state.current_file = "README.md"
                        else:  # Comments
                            # Store all commented files
                            commented_files = {}
                            for file_name, content in st.session_state.file_content.items():
                                commented_content = call_gemini(
                                    {file_name: content}, 
                                    "comment", 
                                    False,
                                    file_name,  # Pass the filename as project name for comments
                                    custom_instructions,
                                    GEMINI_API_KEY,
                                    GEMINI_API_URL
                                )
                                commented_files[file_name] = commented_content
                            
                            # Store in session state
                            st.session_state.file_content = commented_files
                            
                            # Just show the first file for preview
                            first_file = next(iter(commented_files))
                            st.session_state.generated_content = commented_files[first_file]
                            st.session_state.current_file = first_file
                        
                        st.success("Documentation generated!")
                            
                    except Exception as e:
                        st.error(f"Error generating documentation: {str(e)}")
    
    with col2:
        if st.session_state.generated_content:
            # Determine file extension for syntax highlighting
            file_ext = st.session_state.current_file.split('.')[-1] if '.' in st.session_state.current_file else ''
            lang_mapping = {
                'py': 'python',
                'js': 'javascript',
                'jsx': 'jsx',
                'ts': 'typescript',
                'tsx': 'tsx',
                'java': 'java',
                'c': 'c',
                'cpp': 'cpp',
                'cs': 'csharp',
                'go': 'go',
                'rs': 'rust',
                'php': 'php',
                'rb': 'ruby',
                'swift': 'swift',
                'kt': 'kotlin',
                'md': 'markdown'
            }
            language = lang_mapping.get(file_ext, 'text')
            
            # Display content appropriately based on file type
            if file_ext == 'md':
                st.markdown(st.session_state.generated_content)
            else:
                st.code(st.session_state.generated_content, language=language)
            
            # If we have multiple files (for comments)
            if purpose == "Comments" and len(st.session_state.file_content) > 1:
                # Add a file selector
                file_options = list(st.session_state.file_content.keys())
                selected_file = st.selectbox("Select file to view", file_options, 
                                            index=file_options.index(st.session_state.current_file) if st.session_state.current_file in file_options else 0)
                
                if selected_file != st.session_state.current_file:
                    st.session_state.current_file = selected_file
                    st.session_state.generated_content = st.session_state.file_content[selected_file]
                    st.experimental_rerun()
            
            # Download button
            if purpose == "README" or len(st.session_state.file_content) == 1:
                st.download_button(
                    label="Download Documentation",
                    data=st.session_state.generated_content,
                    file_name=st.session_state.current_file or "documentation.md",
                    mime="text/plain"
                )
            else:
                # Create zip file for multiple commented files
                import io
                import zipfile
                
                zip_buffer = io.BytesIO()
                with zipfile.ZipFile(zip_buffer, 'a', zipfile.ZIP_DEFLATED, False) as zip_file:
                    for file_name, content in st.session_state.file_content.items():
                        zip_file.writestr(file_name, content)
                
                st.download_button(
                    label="Download All Commented Files",
                    data=zip_buffer.getvalue(),
                    file_name="commented_files.zip",
                    mime="application/zip"
                )

with tab2:
    st.header("GitHub Integration")
    
    if not st.session_state.github_integration:
        st.info("Please connect to GitHub in the sidebar first.")
    else:
        st.success("Connected to GitHub")
        
        st.subheader("Create Pull Request")
        
        col1, col2 = st.columns([2, 1])
        
        with col1:
            if not st.session_state.generated_content:
                st.warning("Generate documentation first in the Documentation tab.")
            else:
                pr_title = st.text_input("PR Title", 
                                        value=f"Add documentation for {st.session_state.project_name}" 
                                        if st.session_state.project_name else "Add documentation")
                
                pr_body = st.text_area("PR Description", 
                                      value="This PR adds AI-generated documentation to the project.")
                
                commit_message = st.text_input("Commit Message", 
                                              value=f"Add documentation for {st.session_state.project_name}" 
                                              if st.session_state.project_name else "Add documentation")
                
                if st.button("Create Pull Request"):
                    # Make sure variables are properly defined
                    if 'selected_repo' not in locals() and 'selected_repo' not in globals():
                        st.error("Please select a repository in the sidebar.")
                    elif 'selected_branch' not in locals() and 'selected_branch' not in globals():
                        st.error("Please select a branch in the sidebar.")
                    else:
                        with st.spinner("Creating Pull Request..."):
                            try:
                                # Prepare content map
                                content_map = {}
                                
                                # Add the generated documentation
                                if purpose == "README":
                                    if st.session_state.current_file:
                                        content_map[st.session_state.current_file] = st.session_state.generated_content
                                else:  # Comments - add all commented files
                                    for file_name, content in st.session_state.file_content.items():
                                        content_map[file_name] = content
                                
                                # Create PR
                                pr_result = st.session_state.github_integration.create_pull_request(
                                    selected_repo,
                                    selected_branch,
                                    content_map,
                                    commit_message,
                                    pr_title,
                                    pr_body
                                )
                                
                                if pr_result["success"]:
                                    st.success(f"Pull request created successfully! [View PR]({pr_result['pr_url']})")
                                else:
                                    st.error(f"Failed to create PR: {pr_result['error']}")
                            except Exception as e:
                                st.error(f"Error creating PR: {str(e)}")


with tab3:
    st.header("Code Quality Analysis")
    
    st.write("Upload code files to analyze for quality issues and best practices using AI.")
    
    quality_file_upload = st.file_uploader("Upload Code File", 
                                        type=list(SUPPORTED_FILES.keys()),
                                        key="quality_file_uploader",
                                        help="Upload a file to analyze its code quality")
    
    if quality_file_upload:
        file_content = process_file_content(quality_file_upload)
        file_name = quality_file_upload.name
        
        if st.button("Analyze Code Quality"):
            with st.spinner("Analyzing code quality..."):
                try:
                    analysis_result = st.session_state.code_analyzer.analyze_with_ai(file_content, file_name)
                    
                    if "error" in analysis_result:
                        st.error(f"Analysis failed: {analysis_result['error']}")
                        if "message" in analysis_result:
                            st.error(analysis_result["message"])
                    else:
                        st.success("Analysis complete!")
                        
                        # Display summary
                        st.subheader("Summary")
                        if "summary" in analysis_result:
                            st.write(analysis_result["summary"])
                        
                        # Display metrics if available
                        if "metrics" in analysis_result:
                            metrics = analysis_result["metrics"]
                            st.subheader("Metrics")
                            
                            # Create metrics cards in rows of 3
                            metric_items = list(metrics.items())
                            for i in range(0, len(metric_items), 3):
                                cols = st.columns(min(3, len(metric_items) - i))
                                for j, (key, value) in enumerate(metric_items[i:i+3]):
                                    # Skip None values
                                    if value is not None:
                                        with cols[j]:
                                            st.metric(
                                                key.replace("_", " ").title(), 
                                                value if isinstance(value, (int, float)) else str(value)
                                            )
                        
                        # Display issues
                        if "issues" in analysis_result and analysis_result["issues"]:
                            st.subheader("Issues Found")
                            
                            # Create a dataframe for better display
                            import pandas as pd
                            
                            # Clean up issues data for display
                            display_issues = []
                            for issue in analysis_result["issues"]:
                                display_issue = {
                                    "Line": issue.get("line", 0),
                                    "Severity": issue.get("severity", "").title(),
                                    "Type": issue.get("type", "").replace("_", " ").title(),
                                    "Message": issue.get("message", "")
                                }
                                display_issues.append(display_issue)
                            
                            issues_df = pd.DataFrame(display_issues)
                            
                            # Add color coding based on severity
                            def color_severity(val):
                                colors = {
                                    "Error": "background-color: #FFCCCC; color: #990000; font-weight: bold",
                                    "Warning": "background-color: #FFF2CC; color: #806600; font-weight: bold",
                                    "Info": "background-color: #D9EDF7; color: #31708F; font-weight: bold",
                                    "Major": "background-color: #FFCCCC; color: #990000; font-weight: bold",
                                    "Minor": "background-color: #FFF2CC; color: #806600; font-weight: bold",
                                    "Critical": "background-color: #F2DEDE; color: #A94442; font-weight: bold",
                                    "Blocker": "background-color: #F8D7DA; color: #721C24; font-weight: bold"
                                }
                                return colors.get(val, "")
                            
                            # Display styled dataframe
                            st.dataframe(
                                issues_df.style.applymap(color_severity, subset=["Severity"]), 
                                use_container_width=True
                            )
                            
                            # Allow sorting and filtering
                            st.write("Filter issues by severity:")
                            severities = ["All"] + sorted(list(set(i["Severity"] for i in display_issues)))
                            selected_severity = st.selectbox("Severity", severities)
                            
                            if selected_severity != "All":
                                filtered_df = issues_df[issues_df["Severity"] == selected_severity]
                                st.dataframe(
                                    filtered_df.style.applymap(color_severity, subset=["Severity"]), 
                                    use_container_width=True
                                )
                        else:
                            st.success("No issues found!")
                        
                        # Display suggestions if available
                        if "suggestions" in analysis_result and analysis_result["suggestions"]:
                            st.subheader("Suggestions")
                            for suggestion in analysis_result["suggestions"]:
                                st.markdown(f"- {suggestion}")
                                
                except Exception as e:
                    st.error(f"Error during analysis: {str(e)}")
                    import traceback
                    st.error(traceback.format_exc())
    else:
        st.info("Please upload a file to analyze.")