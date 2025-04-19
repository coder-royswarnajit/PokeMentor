import requests
import json
import os
import zipfile
import tempfile

SUPPORTED_FILES = {
    "py": "Python", "js": "JavaScript", "ts": "TypeScript", "jsx": "React JSX",
    "tsx": "React TSX", "html": "HTML", "css": "CSS", "java": "Java", "c": "C",
    "cpp": "C++", "cs": "C#", "go": "Go", "rs": "Rust", "php": "PHP", "rb": "Ruby",
    "swift": "Swift", "kt": "Kotlin", "sh": "Shell", "json": "JSON", "md": "Markdown",
    "sql": "SQL", "yml": "YAML", "yaml": "YAML", "xml": "XML", "txt": "Text"
}

def process_file_content(file_obj):
    return file_obj.getvalue().decode("utf-8")

def process_zip_file(zip_file_obj):
    project_files = {}
    with tempfile.TemporaryDirectory() as temp_dir:
        zip_path = os.path.join(temp_dir, "uploaded.zip")
        with open(zip_path, "wb") as f:
            f.write(zip_file_obj.getvalue())

        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            zip_ref.extractall(temp_dir)

        for root, dirs, files in os.walk(temp_dir):
            for file in files:
                if file.startswith('.') or any(d.startswith('.') for d in root.split(os.sep)):
                    continue
                file_path = os.path.join(root, file)
                rel_path = os.path.relpath(file_path, temp_dir)
                try:
                    if os.path.getsize(file_path) > 1024 * 1024:
                        continue
                    with open(file_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                    project_files[rel_path] = content
                except Exception:
                    continue
    return project_files

def call_gemini(content, purpose, is_multiple_files=False, project_name="", custom_instructions="", api_key="", api_url=""):
    import re
    if purpose == "readme":
        if is_multiple_files:
            file_sections = []
            for file_path, file_content in content.items():
                extension = os.path.splitext(file_path)[1].lstrip('.')
                language = SUPPORTED_FILES.get(extension, "Unknown")
                file_sections.append(f"## File: {file_path} ({language})\n```{extension}\n{file_content}\n```")
            combined_content = "\n\n".join(file_sections)
            base_prompt = f"You are an AI documentation assistant. Generate a technical README for the project '{project_name}':"
        else:
            combined_content = content
            base_prompt = "You are an AI documentation assistant. Generate a technical README for the following code:"
        if custom_instructions:
            base_prompt += f"\n\nAdditional instructions: {custom_instructions}"
        prompt = f"{base_prompt}\n\n{combined_content}"
    else:
        extension = os.path.splitext(project_name)[1].lstrip('.')
        language = SUPPORTED_FILES.get(extension, "Unknown")
        code = content if isinstance(content, str) else content[project_name]
        prompt = f"You are an AI assistant. Add comments to this {language} code:\n```{extension}\n{code}\n```"
        if custom_instructions:
            prompt += f"\n\nAdditional instructions: {custom_instructions}"

    payload = {"contents": [{"parts": [{"text": prompt}]}]}
    headers = {"Content-Type": "application/json"}

    response = requests.post(f"{api_url}?key={api_key}", headers=headers, data=json.dumps(payload), timeout=60)
    if response.status_code == 200:
        text = response.json()['candidates'][0]['content']['parts'][0]['text']
        if purpose == "comment":
            match = re.findall(r"```[\w]*\n(.*?)```", text, re.DOTALL)
            return match[0] if match else text
        return text
    else:
        raise Exception(f"Gemini API Error: {response.status_code} {response.text}")
