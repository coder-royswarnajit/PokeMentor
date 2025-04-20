# Modified code_quality.py with only AI-powered analysis

import os
import re
import json
from typing import Dict, List, Any, Optional
import requests


class CodeQualityAnalyzer:
    """Class to analyze code quality using AI-powered analysis."""
    
    def __init__(self, gemini_api_key: Optional[str] = None):
        """Initialize the analyzer with an optional Gemini API key."""
        self.gemini_api_key = gemini_api_key
    
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