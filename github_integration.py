import os
import base64
import requests
from github import Github
from github import GithubException

class GitHubIntegration:
    def __init__(self, access_token=None):
        """Initialize GitHub integration with access token"""
        self.token = access_token
        self.github = Github(access_token) if access_token else None

    def validate_token(self):
        """Validate that the token works by trying to access user info"""
        try:
            if not self.token:
                return False
            user = self.github.get_user()
            user.login  # This will trigger an API call
            return True
        except GithubException:
            return False

    def get_repositories(self):
        """Get a list of repositories the user has access to"""
        if not self.token:
            return []
        
        try:
            user = self.github.get_user()
            return [repo.full_name for repo in user.get_repos()]
        except GithubException:
            return []

    def get_branches(self, repo_name):
        """Get a list of branches for a repository"""
        if not self.token:
            return []
        
        try:
            repo = self.github.get_repo(repo_name)
            return [branch.name for branch in repo.get_branches()]
        except GithubException as e:
            print(f"Error getting branches: {str(e)}")
            return []

    def create_pull_request(self, repo_name, base_branch, content_map, commit_message, pr_title, pr_body):
        """
        Create a pull request with the provided content
        
        Args:
            repo_name (str): Repository name in format 'owner/repo'
            base_branch (str): Base branch to create PR against
            content_map (dict): Dictionary mapping file paths to their content
            commit_message (str): Commit message
            pr_title (str): PR title
            pr_body (str): PR description
            
        Returns:
            dict: PR information or error details
        """
        # If content_map is empty, raise an error
        if not content_map:
            return {"success": False, "error": "No content provided for PR"}
            
        if not self.token:
            return {"success": False, "error": "No GitHub token provided"}
        
        try:
            try:
                # First verify the repo exists and we have access
                repo = self.github.get_repo(repo_name)
            except GithubException as e:
                return {
                    "success": False,
                    "error": f"Cannot access repository '{repo_name}': {str(e)}"
                }
                
            try:
                # Then verify the base branch exists
                base_branch_obj = repo.get_branch(base_branch)
            except GithubException as e:
                return {
                    "success": False,
                    "error": f"Cannot access branch '{base_branch}': {str(e)}"
                }
            
            # Create a new branch
            source_branch = f"auto-docs-{os.urandom(4).hex()}"
            base_sha = base_branch_obj.commit.sha
            
            try:
                repo.create_git_ref(f"refs/heads/{source_branch}", base_sha)
            except GithubException as e:
                return {
                    "success": False,
                    "error": f"Cannot create branch '{source_branch}': {str(e)}"
                }
            
            # Add/update files in the branch
            for file_path, file_content in content_map.items():
                try:
                    # Check if file exists
                    existing_file = repo.get_contents(file_path, ref=source_branch)
                    repo.update_file(
                        file_path, 
                        commit_message, 
                        file_content, 
                        existing_file.sha, 
                        branch=source_branch
                    )
                except GithubException:
                    # File doesn't exist, create it
                    repo.create_file(
                        file_path, 
                        commit_message, 
                        file_content, 
                        branch=source_branch
                    )
            
            # Create the pull request
            try:
                pr = repo.create_pull(
                    title=pr_title,
                    body=pr_body,
                    head=source_branch,
                    base=base_branch
                )
                
                return {
                    "success": True,
                    "pr_number": pr.number,
                    "pr_url": pr.html_url,
                    "branch": source_branch
                }
            except GithubException as e:
                return {
                    "success": False,
                    "error": f"Failed to create pull request: {str(e)}"
                }
        
        except GithubException as e:
            return {
                "success": False,
                "error": f"GitHub error: {str(e)}"
            }
        except Exception as e:
            return {
                "success": False,
                "error": f"Unexpected error: {str(e)}"
            }