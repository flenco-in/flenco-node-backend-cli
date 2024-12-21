# Flenco Node Backend CLI

A powerful CLI tool to generate a production-ready Node.js backend boilerplate with Express, TypeScript, and Prisma. It automatically creates CRUD operations with validation, authentication, and file upload capabilities based on your existing database schema.

[![NPM Downloads](https://img.shields.io/npm/dm/flenco-node-backend-cli.svg)](https://www.npmjs.com/package/flenco-node-backend-cli)
[![License](https://img.shields.io/npm/l/flenco-node-backend-cli.svg)](https://github.com/flenco-in/flenco-node-backend-cli/blob/main/LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/flenco-in/flenco-node-backend-cli/pulls)
[![Buy Me A Coffee](https://img.shields.io/badge/Sponsor-Buy%20Me%20A%20Coffee-orange.svg)](https://www.buymeacoffee.com/atishpaul)

## Features 🚀

- 🔥 Fast project setup
- 📝 TypeScript support
- 🔐 JWT Authentication
- 📊 Prisma ORM integration
- ✨ Automatic CRUD generation
- 📝 Request validation with Zod
- 🔄 Built-in pagination and sorting
- 🛠️ File upload support
- 📧 Email service integration
- 🔍 Error handling
- 🎯 Clean architecture

## Prerequisites

- Node.js >= 14
- npm >= 6
- PostgreSQL or MySQL database

## Installation

```bash
npm install -g flenco-node-backend-cli
```

## Quick Start

### 1. Initialize a New Project

```bash
# Create a new directory for your project
mkdir my-backend
cd my-backend

# Initialize the project
flenco-init
```

During initialization, you'll be prompted for:
- Database type (PostgreSQL/MySQL)
- Database credentials
- Other configuration options

### 2. Generate APIs for Your Tables

```bash
flenco-generate
```

This will:
- Show available tables from your database
- Let you select a table
- Configure authentication and file upload options
- Generate complete CRUD operations

## Project Structure

```
├── src/
│   ├── routes/          # API routes
│   ├── controllers/     # Request handlers
│   ├── services/        # Business logic
│   ├── middleware/      # Custom middleware
│   ├── validation/      # Request validation
│   ├── utils/          # Utility functions
│   └── templates/      # Email templates
├── prisma/             # Prisma schema and migrations
├── uploads/           # File uploads directory
└── .env              # Environment variables
```

## Available Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm start        # Start production server
```

## Generated API Endpoints

For each table, the following endpoints are created:

```
GET    /api/{table}          # Get all records (with pagination)
GET    /api/{table}/:id      # Get single record
POST   /api/{table}          # Create new record
PATCH  /api/{table}/:id      # Update record
DELETE /api/{table}/:id      # Delete record
```

### Query Parameters

- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)
- `sortBy`: Sort field
- `sortOrder`: 'asc' or 'desc'
- `search`: Search term
- `status`: Filter by status

## Configuration

The generated `.env` file includes:

```env
# Database
DATABASE_URL=your_database_url
PORT=3000

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=1d

# Email (if needed)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-email
SMTP_PASS=your-password

# File Upload
MAX_FILE_SIZE=5242880
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/gif
```

## Authentication

When enabled, protect routes using the JWT middleware:
```typescript
router.use(auth());
```

## Validation

Request validation is handled using Zod:
```typescript
router.post('/', validate(createSchema), controller.create);
```

## Error Handling

The generated project includes global error handling for:
- Validation errors
- Authentication errors
- Not found errors
- Database errors
- Unexpected errors

## Commands

- `flenco-init`: Initialize a new project
- `flenco-generate`: Generate APIs for a table
- `flenco-help`: Show available commands

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Issues

If you find a bug or want to request a new feature, please create an issue at [GitHub Issues](https://github.com/flenco-in/flenco-node-backend-cli/issues).

## Author

Atish Paul

## License

MIT

## Support

For support, email [support@flenco.in](mailto:support@flenco.in) or raise an issue on GitHub.

[!["Buy Me A Coffee"](https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png)](https://www.buymeacoffee.com/atishpaul)