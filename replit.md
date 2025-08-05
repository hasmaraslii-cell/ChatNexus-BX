# replit.md

## Overview

IBX is a real-time chat application built with a modern full-stack architecture. The application provides Discord-like functionality with multiple chat rooms, file sharing capabilities, user presence indicators, and a responsive design. Users can register with usernames and profile images, join different themed chat rooms, send text messages and files, and see who's currently online. The first registered user becomes the admin with full channel management capabilities including creating and deleting channels through an integrated admin panel.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript using Vite for build tooling
- **Styling**: Tailwind CSS with shadcn/ui component library for consistent design
- **State Management**: TanStack Query (React Query) for server state management and caching
- **Routing**: Wouter for lightweight client-side routing
- **UI Components**: Radix UI primitives through shadcn/ui for accessible, customizable components
- **Design Theme**: Discord-inspired dark theme with custom CSS variables for colors

### Backend Architecture
- **Runtime**: Node.js with Express.js server
- **Language**: TypeScript with ES modules
- **API Design**: RESTful API with JSON responses
- **File Handling**: Multer middleware for file uploads with type validation and size limits
- **Development**: Hot module replacement via Vite integration in development mode
- **Error Handling**: Centralized error middleware with proper HTTP status codes

### Data Storage Solutions
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Development Storage**: In-memory storage class for development/testing
- **Schema Management**: Drizzle migrations with shared schema definitions
- **Connection**: Neon Database serverless PostgreSQL for production
- **File Storage**: Local filesystem storage for uploaded files

### Authentication and Authorization
- **User Management**: Simple username-based registration without passwords
- **Admin System**: First registered user automatically becomes admin with channel management rights
- **Session Persistence**: LocalStorage for client-side user session management with automatic login
- **User Status**: Real-time presence indicators (online, away, busy)
- **Profile System**: User avatars and customizable profile images

### Data Models
- **Users**: ID, username, profile image, status, admin flag, last seen timestamp
- **Rooms**: ID, name, description, message count for each chat room
- **Messages**: ID, room association, user association, content, message type, file metadata, timestamps

### Real-time Features
- **Message Polling**: Client-side polling every 3 seconds for new messages
- **User Presence**: Periodic updates every 10 seconds for online user status
- **Live Updates**: Automatic UI updates when new messages arrive or users come online

### File Upload System
- **Supported Types**: Images, videos, documents, and archives with MIME type validation
- **Size Limits**: 10MB maximum file size per upload
- **Storage**: Server-side file storage with unique naming to prevent conflicts
- **Download**: Secure file serving with proper content headers

## External Dependencies

### Core Frontend Dependencies
- **React Ecosystem**: React 18, React DOM, TypeScript support
- **Build Tools**: Vite with React plugin, PostCSS, Autoprefixer
- **Styling**: Tailwind CSS, class-variance-authority for component variants
- **UI Library**: shadcn/ui components built on Radix UI primitives
- **State Management**: TanStack Query for server state, Wouter for routing

### Backend Dependencies
- **Server Framework**: Express.js with TypeScript support via tsx
- **Database**: Drizzle ORM, Neon Database serverless driver, PostgreSQL
- **File Processing**: Multer for multipart form handling
- **Development**: ESBuild for production builds, Node.js built-in modules

### Development Tools
- **TypeScript**: Full type safety across frontend, backend, and shared schemas
- **Replit Integration**: Custom Vite plugins for Replit environment support
- **Development Server**: Vite dev server with HMR and Express API proxy
- **Database Tools**: Drizzle Kit for migrations and schema management

### Third-party Services
- **Database Hosting**: Neon Database for serverless PostgreSQL
- **File Storage**: Local filesystem (can be extended to cloud storage)
- **Development Environment**: Replit-specific tooling and error overlays