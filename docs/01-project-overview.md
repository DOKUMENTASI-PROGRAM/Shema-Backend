# Project Overview

## Introduction
This is a microservices-based backend application for a **Music Lesson Website** built as part of an RPL (Rekayasa Perangkat Lunak / Software Engineering) coursework project.

## Project Goals
The system aims to provide a comprehensive platform for music lesson management with the following key features:

### Core Features
1. **User Management**
   - Support for two user types: Instructors and Students
   - Separate authentication flows for each user type
   - User profile management

2. **Course Management**
   - Instructors can create, update, and delete courses
   - Public course listing for browsing
   - Course details and information management

3. **AI Chatbot Integration**
   - Intelligent chatbot powered by OpenAI ChatGPT API
   - Context-aware conversations
   - Context limitations to manage API costs
   - Chat history and session management

## System Architecture Overview
The application is divided into **three independent microservices**:

### 1. Identity Service
- Integrates Firebase Authentication for user verification
- Validates Firebase ID tokens
- Manages user profiles in PostgreSQL
- Syncs Firebase users with local database
- Supports both instructor and student authentication

### 2. Course Service
- Manages course CRUD operations
- Enforces role-based access control
- Handles course listings and details
- Integrates with identity service for authorization

### 3. Chat Service
- Provides AI chatbot functionality
- Integrates with OpenAI ChatGPT API
- Manages conversation context and history
- Implements rate limiting to control costs

## Technology Stack Summary
- **Architecture**: Microservices
- **Runtime**: Node.js with TypeScript
- **Framework**: Hono (Ultra-fast web framework for the Edge)
- **Authentication**: Firebase Authentication + PostgreSQL
- **Databases**: PostgreSQL (separate per service)
- **Caching**: Redis (for chat context)
- **Containerization**: Docker & Docker Compose
- **External APIs**: OpenAI ChatGPT API, Firebase Admin SDK

## Project Benefits
- **Scalability**: Each service can scale independently
- **Maintainability**: Clear separation of concerns
- **Flexibility**: Services can be updated without affecting others
- **Modern Architecture**: Follows industry best practices
- **Educational Value**: Demonstrates enterprise-level software engineering

## Next Steps
Refer to other documentation files in this folder for detailed information about:
- Architecture and Data Flow
- API Endpoints
- Development Workflow
- Database Design
- Security Practices
- Docker Configuration
- Testing Strategies
