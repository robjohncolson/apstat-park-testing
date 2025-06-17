Project Overview
APStat Park is an interactive AP Statistics learning platform that combines traditional web-based education with modern AI-powered tutoring. It's designed to help students master AP Statistics through a multi-faceted approach that includes interactive lessons, progress tracking, and AI tutoring integration.
Key Features
🎯 Interactive Learning Platform
Built with React, TypeScript, and Vite for a modern web experience
Responsive design for both mobile and desktop learning
Interactive lessons covering the complete AP Statistics curriculum
Practice quizzes and assessments with instant feedback
🤖 AI Tutoring Integration
Integration with Grok AI for personalized tutoring sessions
~180 comprehensive PDFs covering all AP Statistics topics (organized across 9 units)
Structured workflow for uploading study materials to AI tutors
Starter prompts optimized for effective tutoring sessions
📊 Progress Tracking System
User authentication and account management
Lesson completion tracking with videos and quizzes
Bookmark system for saving important lessons and topics
Pace monitoring to help students stay on track
PostgreSQL database for persistent data storage
📚 Comprehensive Study Materials
PDFs organized by units (Unit 1-9) covering:
Section-specific quizzes and answer keys
Performance check (PC) materials
Multiple choice questions (Part A & B)
Free response questions (FRQ)
Practice exams and solutions
Technical Architecture
Frontend (React App)
Modern React 18 with TypeScript
Vite for fast development and building
React Router for navigation
Socket.io for real-time features
React Modal for interactive components
Comprehensive testing with Vitest and Playwright
Backend (Node.js API)
Express.js server with TypeScript
PostgreSQL database with proper schema
Socket.io for real-time communication
Database migrations system
Winston for logging
CORS enabled for cross-origin requests
Testing & Quality
Unit tests with Vitest and React Testing Library
End-to-end tests with Playwright
Visual regression testing
ESLint and Prettier for code quality
Coverage reporting
Project Structure
This is a monorepo containing:
apps/web/ - Main React application
apps/api/ - Node.js backend server
apps/web-legacy/ - Legacy HTML version
pdfs/ - Study materials for AI tutoring (~180 files)
database/ - SQL schemas and migration files
docs/ - Project documentation and learning workflows
Unique Learning Workflow
The platform implements a sophisticated learning cycle:
Content Discovery - Students choose lesson topics
PDF Download - Access comprehensive study materials
AI Tutoring - Upload PDFs to Grok for personalized learning
Interactive Practice - Work through AI-generated problems
Assessment - Take quizzes in the web platform
Progress Tracking - Monitor advancement and identify areas for review
Environment Notes
Uses run.bat for npm commands due to Windows PATH restrictions
Designed for educational environments with limited system access
Includes comprehensive deployment configuration for Vercel
This project represents a modern approach to AP Statistics education, combining the structured curriculum delivery of a web platform with the personalized, adaptive learning capabilities of AI tutoring systems. The extensive PDF library (180+ files) ensures students have access to high-quality study materials optimized for AI-assisted learning.