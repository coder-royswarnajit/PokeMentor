# 🧠 PokeMentor

PokeMentor is an AI-powered Streamlit application that generates technical documentation (like README files) and adds contextual comments to source code. It also integrates with GitHub to create pull requests and performs AI-driven code quality analysis.

## 🚀 Features

- 📄 **README Generator**: Automatically generate detailed README files from your codebase.
- 💬 **Code Commenting**: Add helpful and contextual comments to source code.
- 🧪 **Code Quality Analysis**: Identify code smells, security issues, performance bottlenecks, and best practices.
- 🔄 **GitHub Integration**: Create pull requests directly with your documentation or annotated code.
- 🧠 Powered by **Gemini API** for intelligent and language-aware code processing.

## 📦 Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/pokementor.git
   cd pokementor
   ```

2. **Install dependencies**:
   Make sure you have Python 3.8+ installed, then:
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure environment variables**:
   Create a `.env` file with the following:
   ```env
   GEMINI_API_KEY=your_gemini_api_key
   GEMINI_API_URL=https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent
   GEMINI_API_MODEL=gemini-2.0-flash
   SONARCLOUD_TOKEN=your_sonarcloud_token
   SONARCLOUD_ORG=your_sonarcloud_organization
   ```

## 🖥️ Usage

Run the Streamlit app:

```bash
streamlit run main.py
```

### Main Tabs:

1. **Generate Documentation**:
   - Upload one or more code files (or a ZIP).
   - Choose whether to generate a README or add comments.
   - Provide a project name and optional instructions.
   - Download results or push directly to GitHub.

2. **GitHub Integration**:
   - Authenticate with your GitHub token.
   - Select a repository and branch.
   - Create a PR with the newly generated documentation.

3. **Code Quality Analysis**:
   - Upload a file to receive detailed analysis and improvement suggestions from the AI.

## 🧠 Gemini API Integration

The app uses Gemini's large language model to analyze and understand code. Ensure you set up your API key and endpoint in the `.env` file.

## 🔐 GitHub Integration

- PokeMentor uses [PyGithub](https://pygithub.readthedocs.io/) for GitHub operations.
- Your personal access token should have `repo` scope to allow for PR creation.

## 📂 Project Structure

```bash
.
├── main.py                 # Streamlit UI logic
├── core.py                 # Code processing and Gemini interaction
├── code_quality.py         # AI-driven code quality analysis
├── github_integration.py  # GitHub API integration
├── requirements.txt        # Python dependencies
├── .env                    # API credentials (not committed)
├── .gitignore
└── LICENSE
```

## 📃 License

This project is licensed under the terms of the MIT License. See [LICENSE](./LICENSE) for details.

## 🙌 Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## 🙌 WebLink
https://code-documentation--generator-pxk9mwyf8vcaj6afonyw7v.streamlit.app/#code-documentation-generator
