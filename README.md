# APStat Park - Interactive Statistics Learning Platform

An interactive AP Statistics learning platform built with React, TypeScript, and Vite. Features AI-powered tutoring integration, progress tracking, and comprehensive study materials.

## Quick Start

### Prerequisites

- Node.js (accessible via `run.bat` due to environment constraints)
- Git

### Local Development

```bash
# Install dependencies
run.bat npm install

# Start development server
run.bat npm run dev

# Run tests
run.bat npm run test

# Run end-to-end tests
run.bat npm run test:e2e

# Format code
run.bat npm run format

# Lint code
run.bat npm run lint
```

The development server will start at `http://localhost:5173`

## Project Structure

```
├── apps/
│   └── web/                    # Main Vite/React application
├── docs/                       # Project documentation
│   ├── using-pdfs-with-grok.md # Student guide for AI tutoring
│   └── learning-flow.md        # Learning workflow diagram
├── pdfs/                       # Study materials for AI tutoring (~180 PDFs)
├── database/                   # SQL schemas
├── archive/                    # Legacy code (safely stored)
└── run.bat                     # PATH workaround for locked environment
```

## Documentation

- **[PDF Tutoring Guide](docs/using-pdfs-with-grok.md)** - How students can use study materials with Grok AI
- **[Learning Flow](docs/learning-flow.md)** - Visual workflow for the complete learning experience
- **[Web App README](apps/web/README.md)** - Technical details for the React application

## Features

- 📚 Interactive AP Statistics lessons
- 🤖 AI tutoring integration with comprehensive PDFs
- 📊 Progress tracking and pace monitoring
- 🎯 Practice quizzes and assessments
- 📱 Responsive design for mobile and desktop

## Environment Notes

This project uses `run.bat` to prefix all npm commands due to Windows environment PATH restrictions. Always use `run.bat npm <command>` instead of direct npm commands.

## License

MIT License - see [LICENSE](LICENSE) file for details.
