# Backend Project Generator CLI

A powerful CLI tool that generates a fully-functional Node.js backend project with TypeScript, Express, and Prisma. It automatically creates CRUD operations, authentication, and file upload capabilities based on your existing database schema.

## Features

- 🚀 Quick setup of Node.js backend projects
- 📝 TypeScript support out of the box
- 🔐 JWT Authentication
- 📁 File upload support
- 🗄️ Database integration (PostgreSQL/MySQL)
- 🔄 Automatic CRUD operations
- ✨ Built-in pagination
- 🛠️ Validation using Zod
- 📝 Auto-generated documentation
- 🔍 Database schema introspection
- 🎯 Middleware support
- 🌟 Best practices and patterns

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- PostgreSQL or MySQL database

## Installation

```bash
# Clone the repository
git clone [repository-url]

# Install dependencies
npm install

# Build the project
npm run build

# Link the CLI globally (optional)
npm link
```

## Usage

1. Start by running the CLI:
```bash
npm start
```

2. Follow the interactive prompts:
   - Choose database type (PostgreSQL/MySQL)
   - Enter database credentials
   - Select table for CRUD generation
   - Configure authentication and file upload options

3. The CLI will generate:
   - Complete project structure
   - CRUD operations for selected table
   - Authentication middleware (if selected)
   - File upload capability (if selected)
   - API documentation
   - Environment configuration

## Project Structure

```
├── src/
│   ├── routes/           # Route definitions
│   ├── controllers/      # Request handlers
│   ├── services/         # Business logic
│   ├── middleware/       # Custom middleware
│   ├── validation/       # Request validation
│   ├── utils/           # Utility functions
│   └── templates/       # Email templates
├── prisma/              # Prisma schema and migrations
├── uploads/            # File upload directory
└── .env               # Environment variables
```

## Available Scripts

- `npm run build`: Build the project
- `npm start`: Run the CLI
- `npm run dev`: Start development server
- `npm run setup`: Install dependencies and generate Prisma client

## API Endpoints

For each generated table, the following endpoints are created:

```
GET    /api/{table}          # Get all records (with pagination)
GET    /api/{table}/:id      # Get single record
POST   /api/{table}          # Create new record
PATCH  /api/{table}/:id      # Update record
DELETE /api/{table}/:id      # Delete record
```

## Authentication

When authentication is enabled:
- JWT-based authentication
- Protected routes require Bearer token
- Token expiration and refresh mechanisms

## File Upload

When file upload is enabled:
- Configurable file size limits
- File type validation
- Secure file storage
- File URL generation

## Environment Variables

```env
# Database Configuration
DATABASE_URL=
PORT=3000

# JWT Configuration
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=1d

# Email Configuration
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-email
SMTP_PASS=your-password

# File Upload Configuration
MAX_FILE_SIZE=5242880
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/gif,application/pdf
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.