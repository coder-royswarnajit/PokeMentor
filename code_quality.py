# Enhanced code_quality.py with SonarCloud integration

import re
import ast
import base64
import tempfile
import os
import json
import uuid
import time
from typing import Dict, List, Tuple, Any, Optional
import requests


class SonarCloudAnalyzer:
    """Class to analyze code using SonarCloud API."""

    def __init__(self, token: str, organization: str = None):
        """Initialize the SonarCloud analyzer.
        
        Args:
            token: SonarCloud API token
            organization: Optional SonarCloud organization name
        """
        self.token = token
        self.organization = organization or "default-organization"
        self.base_url = "https://sonarcloud.io/api"
        self.auth = (token, "")  # SonarCloud uses token as username with empty password
        
        # Map of language file extensions to SonarCloud language keys
        self.language_map = {
            "py": "python",
            "js": "js",
            "ts": "ts",
            "jsx": "js",
            "tsx": "ts",
            "java": "java",
            "c": "c",
            "cpp": "cpp",
            "cs": "cs",
            "go": "go",
            "php": "php",
            "ruby": "ruby",
            "scala": "scala",
            "kt": "kotlin",
            "html": "web",
            "css": "web",
            "xml": "xml",
            "json": "json"
        }

    def analyze_code(self, code: str, filename: str) -> Dict[str, Any]:
        """Analyze code using SonarCloud.
        
        Args:
            code: Source code to analyze
            filename: Filename with extension
            
        Returns:
            Dictionary with analysis results
        """
        try:
            # Create temporary project
            project_key = f"temp-analysis-{uuid.uuid4().hex[:8]}"
            
            # Create project in SonarCloud
            self._create_project(project_key)
            
            # Create a temporary file for analysis
            with tempfile.TemporaryDirectory() as temp_dir:
                file_path = os.path.join(temp_dir, filename)
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(code)
                
                # Run analysis
                self._run_scanner(temp_dir, project_key, filename)
                
                # Wait for analysis to complete
                time.sleep(5)
                
                # Get analysis results
                issues = self._get_issues(project_key)
                hotspots = self._get_security_hotspots(project_key)
                metrics = self._get_metrics(project_key)
                
                # Clean up (delete project)
                self._delete_project(project_key)
                
                # Format results
                return self._format_results(issues, hotspots, metrics)
        
        except Exception as e:
            return {
                "error": "SonarCloud analysis failed",
                "message": str(e)
            }

    def _create_project(self, project_key: str):
        """Create a temporary project in SonarCloud.
        
        Args:
            project_key: Unique project key
        """
        url = f"{self.base_url}/projects/create"
        params = {
            "name": project_key,
            "project": project_key,
            "organization": self.organization,
            "visibility": "private"
        }
        
        response = requests.post(url, params=params, auth=self.auth)
        if response.status_code not in (200, 201):
            raise Exception(f"Failed to create project: {response.text}")

    def _run_scanner(self, source_dir: str, project_key: str, filename: str):
        """Run SonarCloud scanner on the code.
        
        Args:
            source_dir: Directory containing source files
            project_key: SonarCloud project key
            filename: The name of the file being analyzed
        """
        # For this implementation, we'll use the SonarCloud REST API to submit code
        # In a production environment, you might want to use the actual scanner
        
        extension = os.path.splitext(filename)[1].lstrip('.')
        language = self.language_map.get(extension, "unknown")
        
        file_path = os.path.join(source_dir, filename)
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        url = f"{self.base_url}/source/index"
        data = {
            "organization": self.organization,
            "projectKey": project_key,
            "sources": [
                {
                    "path": filename,
                    "language": language,
                    "content": base64.b64encode(content.encode('utf-8')).decode('utf-8')
                }
            ]
        }
        
        headers = {"Content-Type": "application/json"}
        response = requests.post(url, json=data, headers=headers, auth=self.auth)
        
        if response.status_code not in (200, 201):
            raise Exception(f"Failed to run analysis: {response.text}")
        
        # Trigger analysis
        analyze_url = f"{self.base_url}/analysis/submit"
        analyze_data = {
            "projectKey": project_key,
            "organization": self.organization
        }
        
        response = requests.post(analyze_url, json=analyze_data, headers=headers, auth=self.auth)
        if response.status_code not in (200, 201, 202):
            raise Exception(f"Failed to submit analysis: {response.text}")

    def _get_issues(self, project_key: str) -> List[Dict[str, Any]]:
        """Get issues for a project.
        
        Args:
            project_key: SonarCloud project key
            
        Returns:
            List of issues
        """
        url = f"{self.base_url}/issues/search"
        params = {
            "componentKeys": project_key,
            "ps": 100  # page size
        }
        
        response = requests.get(url, params=params, auth=self.auth)
        if response.status_code == 200:
            return response.json().get("issues", [])
        else:
            raise Exception(f"Failed to get issues: {response.text}")

    def _get_security_hotspots(self, project_key: str) -> List[Dict[str, Any]]:
        """Get security hotspots for a project.
        
        Args:
            project_key: SonarCloud project key
            
        Returns:
            List of security hotspots
        """
        url = f"{self.base_url}/hotspots/search"
        params = {
            "projectKey": project_key,
            "ps": 100  # page size
        }
        
        response = requests.get(url, params=params, auth=self.auth)
        if response.status_code == 200:
            return response.json().get("hotspots", [])
        else:
            return []  # Return empty list if API doesn't support hotspots for this project

    def _get_metrics(self, project_key: str) -> Dict[str, Any]:
        """Get metrics for a project.
        
        Args:
            project_key: SonarCloud project key
            
        Returns:
            Dictionary of metrics
        """
        url = f"{self.base_url}/measures/component"
        params = {
            "component": project_key,
            "metricKeys": "ncloc,complexity,bugs,vulnerabilities,code_smells,security_hotspots,duplicated_lines_density,coverage"
        }
        
        response = requests.get(url, params=params, auth=self.auth)
        if response.status_code == 200:
            measures = response.json().get("component", {}).get("measures", [])
            return {m["metric"]: m["value"] for m in measures}
        else:
            return {}

    def _delete_project(self, project_key: str):
        """Delete a project from SonarCloud.
        
        Args:
            project_key: SonarCloud project key
        """
        url = f"{self.base_url}/projects/delete"
        params = {
            "project": project_key
        }
        
        requests.post(url, params=params, auth=self.auth)
        # We don't raise exceptions here because this is cleanup code

    def _format_results(self, issues: List[Dict], hotspots: List[Dict], metrics: Dict) -> Dict[str, Any]:
        """Format analysis results.
        
        Args:
            issues: List of issues from SonarCloud
            hotspots: List of security hotspots
            metrics: Project metrics
            
        Returns:
            Formatted analysis results
        """
        formatted_issues = []
        
        # Process issues
        for issue in issues:
            formatted_issues.append({
                "line": issue.get("line", 0),
                "message": issue.get("message", ""),
                "severity": issue.get("severity", "").lower(),
                "type": issue.get("type", "CODE_SMELL").lower(),
                "rule": issue.get("rule", "")
            })
        
        # Process hotspots
        for hotspot in hotspots:
            formatted_issues.append({
                "line": hotspot.get("line", 0),
                "message": f"Security hotspot: {hotspot.get('message', '')}",
                "severity": "warning",
                "type": "security",
                "rule": hotspot.get("ruleKey", "")
            })
        
        # Generate summary
        summary = self._generate_summary(formatted_issues, metrics)
        
        # Format metrics
        formatted_metrics = {
            "lines_of_code": int(metrics.get("ncloc", 0)),
            "complexity": int(metrics.get("complexity", 0)),
            "bugs": int(metrics.get("bugs", 0)),
            "vulnerabilities": int(metrics.get("vulnerabilities", 0)),
            "code_smells": int(metrics.get("code_smells", 0)),
            "security_hotspots": int(metrics.get("security_hotspots", 0)),
            "duplicate_lines_percentage": float(metrics.get("duplicated_lines_density", 0)),
            "coverage": float(metrics.get("coverage", 0)) if "coverage" in metrics else None
        }
        
        return {
            "issues": formatted_issues,
            "metrics": formatted_metrics,
            "summary": summary
        }

    def _generate_summary(self, issues: List[Dict], metrics: Dict) -> str:
        """Generate a summary of code quality based on issues and metrics.
        
        Args:
            issues: List of issues found
            metrics: Code metrics
            
        Returns:
            Summary string
        """
        issue_count = len(issues)
        loc = int(metrics.get("ncloc", 0))
        
        if loc == 0:
            return "No code detected for analysis."
        
        bugs = int(metrics.get("bugs", 0))
        vulnerabilities = int(metrics.get("vulnerabilities", 0))
        code_smells = int(metrics.get("code_smells", 0))
        duplication = float(metrics.get("duplicated_lines_density", 0))
        
        quality_issues = []
        
        if bugs > 0:
            quality_issues.append(f"{bugs} potential bug{'s' if bugs > 1 else ''}")
        
        if vulnerabilities > 0:
            quality_issues.append(f"{vulnerabilities} securit{'ies' if vulnerabilities > 1 else 'y'} {'issues' if vulnerabilities > 1 else 'issue'}")
        
        if code_smells > 0:
            quality_issues.append(f"{code_smells} code smell{'s' if code_smells > 1 else ''}")
        
        if duplication > 10:
            quality_issues.append(f"{duplication:.1f}% code duplication")
        
        if not quality_issues:
            return f"No significant issues found in {loc} lines of code. Good job!"
        
        return f"Found {', '.join(quality_issues)} in {loc} lines of code."


class CodeQualityAnalyzer:
    """Class to analyze code quality using multiple methods."""
    
    def __init__(self, gemini_api_key: Optional[str] = None, sonarcloud_token: Optional[str] = None, sonarcloud_org: Optional[str] = None):
        """Initialize the code quality analyzer.
        
        Args:
            gemini_api_key: API key for AI-powered analysis
            sonarcloud_token: SonarCloud API token
            sonarcloud_org: SonarCloud organization name
        """
        self.gemini_api_key = gemini_api_key
        self.sonarcloud_token = sonarcloud_token
        self.sonarcloud_org = sonarcloud_org
        
        # Initialize SonarCloud analyzer if token is provided
        self.sonarcloud = SonarCloudAnalyzer(sonarcloud_token, sonarcloud_org) if sonarcloud_token else None
        
        # Common code smells and their descriptions
        self.code_smells = {
            r"import \*": "Avoid wildcard imports as they can lead to namespace pollution",
            r"except:(?!\s*#)": "Avoid bare except clauses; catch specific exceptions",
            r"print\(": "Consider using logging instead of print statements in production code",
            r"\.get\([^)]*\)(?!\s*\.)" : "Dictionary get() calls should provide a default value",
            r"os\.path\.join\(.*?\+.*?\)": "Use os.path.join for path concatenation instead of string concatenation",
            r"for\s+\w+\s+in\s+range\(len\((\w+)\)\)": "Consider using enumerate() instead of range(len())",
            r"(?<!#.*)TODO|FIXME": "Resolve TODO/FIXME comments before finalizing code",
            r"\bpass\b": "Empty pass statements might indicate incomplete code",
            r"if\s+(\w+)\s*==\s*True|if\s+(\w+)\s*==\s*False": "Redundant comparison with boolean literals"
        }

    def _check_local_patterns(self, code: str) -> List[Dict[str, Any]]:
        """Check for code smells using regex patterns.
        
        Args:
            code: The source code to analyze
            
        Returns:
            List of issues found in the code
        """
        issues = []
        
        for pattern, message in self.code_smells.items():
            matches = re.finditer(pattern, code)
            for match in matches:
                line_number = code[:match.start()].count('\n') + 1
                issues.append({
                    "line": line_number,
                    "message": message,
                    "severity": "warning",
                    "type": "code_smell"
                })
                
        return issues
    
    def _check_ast_patterns(self, code: str) -> List[Dict[str, Any]]:
        """Check for issues using Python's AST.
        
        Args:
            code: The source code to analyze
            
        Returns:
            List of issues found using AST analysis
        """
        issues = []
        
        try:
            tree = ast.parse(code)
            
            # Track function and class complexity
            for node in ast.walk(tree):
                # Check function complexity
                if isinstance(node, ast.FunctionDef):
                    body_lines = len(node.body)
                    if body_lines > 30:
                        issues.append({
                            "line": node.lineno,
                            "message": f"Function '{node.name}' is too long ({body_lines} lines). Consider refactoring.",
                            "severity": "warning",
                            "type": "complexity"
                        })
                        
                    # Count arguments
                    arg_count = len(node.args.args)
                    if arg_count > 5:
                        issues.append({
                            "line": node.lineno,
                            "message": f"Function '{node.name}' has too many parameters ({arg_count}). Consider refactoring.",
                            "severity": "warning",
                            "type": "complexity"
                        })
                
        except SyntaxError as e:
            issues.append({
                "line": e.lineno or 0,
                "message": f"Syntax error: {str(e)}",
                "severity": "error",
                "type": "syntax"
            })
        
        return issues
    
    def analyze_code(self, code: str, filename: str = "") -> Dict[str, Any]:
        """Analyze code quality using local rules.
        
        Args:
            code: The source code to analyze
            filename: Optional filename to determine language
            
        Returns:
            Dictionary with analysis results
        """
        is_python = filename.endswith('.py')
        
        issues = self._check_local_patterns(code)
        
        if is_python:
            issues.extend(self._check_ast_patterns(code))
        
        # Additional basic metrics
        loc = len(code.splitlines())
        complexity_score = min(10, max(1, int(len(issues) / 5) + 1))
        
        return {
            "issues": issues,
            "metrics": {
                "lines_of_code": loc,
                "complexity_score": complexity_score,
                "issue_count": len(issues)
            },
            "summary": self._generate_summary(issues, loc, complexity_score)
        }
    
    def analyze_with_ai(self, code: str, filename: str = "") -> Dict[str, Any]:
        """Analyze code using AI services (e.g., Gemini API).
        
        Args:
            code: The source code to analyze
            filename: Optional filename to determine language
            
        Returns:
            Dictionary with AI-powered analysis results
        """
        if not self.gemini_api_key:
            return {"error": "API key is required for AI-powered analysis"}
        
        extension = os.path.splitext(filename)[1].lstrip('.') if filename else ""
        language = extension if extension else "unknown"
        
        prompt = f"""Analyze the following {language} code for quality issues:
        
        ```{language}
        {code}
        ```
        
        Provide a JSON response with the following structure:
        {{
            "issues": [
                {{
                    "line": <line_number>,
                    "message": "<description of the issue>",
                    "severity": "<info|warning|error>",
                    "type": "<code_smell|security|performance|style|bug>"
                }}
            ],
            "suggestions": [
                "<suggestion for improvement>"
            ],
            "summary": "<brief summary of code quality>"
        }}
        
        Focus on:
        - Code smells
        - Security issues
        - Performance optimizations
        - Best practices
        - Deprecated API usage
        """
        
        try:
            url = os.getenv("GEMINI_API_URL")
            
            payload = {
                "contents": [{
                    "parts": [{"text": prompt}]
                }]
            }
            
            headers = {"Content-Type": "application/json"}
            
            response = requests.post(
                f"{url}?key={self.gemini_api_key}",
                headers=headers,
                json=payload,
                timeout=30
            )
            
            if response.status_code == 200:
                response_json = response.json()
                result_text = response_json['candidates'][0]['content']['parts'][0]['text']
                
                # Extract JSON from the response
                json_match = re.search(r'```json\s*([\s\S]*?)\s*```|{\s*"issues"[\s\S]*?}', result_text)
                if json_match:
                    json_str = json_match.group(1) or json_match.group(0)
                    try:
                        return json.loads(json_str)
                    except json.JSONDecodeError:
                        pass
                
                # If JSON parsing fails, return the raw text
                return {
                    "raw_response": result_text,
                    "issues": [],
                    "suggestions": ["Unable to parse AI response as JSON"],
                    "summary": "AI analysis completed but results could not be structured properly."
                }
            else:
                return {
                    "error": f"API error: {response.status_code}",
                    "message": response.text
                }
                
        except Exception as e:
            return {
                "error": "Failed to analyze with AI",
                "message": str(e)
            }
    
    def analyze_with_sonarcloud(self, code: str, filename: str) -> Dict[str, Any]:
        """Analyze code using SonarCloud.
        
        Args:
            code: The source code to analyze
            filename: Filename with extension
            
        Returns:
            Dictionary with SonarCloud analysis results
        """
        if not self.sonarcloud:
            return {"error": "SonarCloud token is required for SonarCloud analysis"}
        
        return self.sonarcloud.analyze_code(code, filename)
    
    def _generate_summary(self, issues: List[Dict[str, Any]], loc: int, complexity: int) -> str:
        """Generate a summary of code quality based on issues found.
        
        Args:
            issues: List of issues found
            loc: Lines of code
            complexity: Complexity score
            
        Returns:
            Summary string
        """
        if not issues:
            return "No issues detected. Code appears to follow good practices."
        
        issue_count = len(issues)
        issue_density = issue_count / max(1, loc) * 100
        
        if issue_density < 2:
            quality = "good"
        elif issue_density < 5:
            quality = "acceptable"
        else:
            quality = "needs improvement"
        
        return f"Found {issue_count} issues in {loc} lines of code. Overall quality is {quality}."