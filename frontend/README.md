# PokeMentor Frontend

A modern, responsive web interface for PokeMentor - the AI-powered code documentation and analysis tool.

## Features

- 🎨 **Modern UI/UX**: Clean, intuitive interface with smooth animations
- 📱 **Responsive Design**: Works perfectly on desktop, tablet, and mobile
- 🚀 **Fast Performance**: Optimized for speed and efficiency
- 🎯 **Drag & Drop**: Easy file uploads with drag and drop support
- 🔄 **Real-time Updates**: Live preview of generated documentation
- 🌙 **Professional Theme**: Apple-inspired design aesthetics

## Quick Start

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Start the Development Server**:
   ```bash
   npm run dev
   ```
   This will start both the API bridge (Python backend) and the frontend server.

3. **Open in Browser**:
   Navigate to `http://localhost:3000`

## Architecture

### Frontend Stack
- **HTML5**: Semantic markup with accessibility features
- **CSS3**: Modern styling with CSS Grid, Flexbox, and animations
- **Vanilla JavaScript**: No frameworks - pure, optimized JavaScript
- **Font Awesome**: Professional icons
- **Google Fonts**: Inter font family for clean typography

### Backend Integration
- **Flask API Bridge**: Connects frontend to existing Python backend
- **CORS Enabled**: Cross-origin requests supported
- **File Upload**: Secure file handling with validation
- **Error Handling**: Comprehensive error management

## Project Structure

```
frontend/
├── index.html          # Main HTML file
├── styles.css          # All CSS styles
├── script.js           # Frontend JavaScript logic
├── api-bridge.py       # Flask API bridge to Python backend
├── package.json        # Node.js dependencies
└── README.md          # This file
```

## API Endpoints

The frontend communicates with these API endpoints:

- `POST /generate-docs` - Generate documentation
- `POST /analyze-quality` - Analyze code quality
- `POST /github/connect` - Connect to GitHub
- `GET /github/repos` - Get repositories
- `POST /github/branches` - Get branches
- `POST /github/create-pr` - Create pull request

## Configuration

### Environment Variables
Make sure these are set in your `.env` file:

```env
GEMINI_API_KEY=your_gemini_api_key
GEMINI_API_URL=https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent
```

### API Configuration
Update the `API_CONFIG` in `script.js` if your backend runs on a different port:

```javascript
const API_CONFIG = {
    baseUrl: 'http://localhost:8000', // Change this if needed
    // ... rest of config
};
```

## Features Overview

### 📄 Documentation Generation
- Upload single or multiple files
- Support for 20+ programming languages
- Choose between README generation or code commenting
- Custom instructions for AI
- Live preview with syntax highlighting
- Download generated documentation

### 🔗 GitHub Integration
- Secure token-based authentication
- Repository and branch selection
- Automatic pull request creation
- Customizable PR titles and descriptions

### 🔍 Code Quality Analysis
- AI-powered code analysis
- Issue detection and categorization
- Performance and security suggestions
- Visual metrics display
- Severity-based color coding

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Performance Features

- **Lazy Loading**: Images and content loaded on demand
- **Optimized Assets**: Minified CSS and compressed images
- **Efficient DOM**: Minimal DOM manipulation
- **Smooth Animations**: Hardware-accelerated transitions
- **Responsive Images**: Adaptive image loading

## Accessibility

- **WCAG 2.1 AA Compliant**: Meets accessibility standards
- **Keyboard Navigation**: Full keyboard support
- **Screen Reader Friendly**: Proper ARIA labels
- **High Contrast**: Sufficient color contrast ratios
- **Focus Management**: Clear focus indicators

## Development

### Running in Development Mode
```bash
npm run dev
```

### Running Only Frontend
```bash
npm start
```

### Running Only API Bridge
```bash
npm run api
```

## Deployment

### Frontend Only
Deploy the static files (`index.html`, `styles.css`, `script.js`) to any static hosting service:
- Netlify
- Vercel
- GitHub Pages
- AWS S3

### Full Stack
Deploy both frontend and API bridge:
- Heroku
- Railway
- DigitalOcean App Platform
- AWS Elastic Beanstalk

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see the main project LICENSE file for details.