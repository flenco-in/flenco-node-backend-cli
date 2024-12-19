# Flenco Node Backend CLI

A powerful CLI tool that generates a fully-functional Node.js backend project with TypeScript, Express, and Prisma. It automatically creates CRUD operations, authentication, and file upload capabilities based on your existing database schema.

## Quick Start 🚀

1. Install the CLI tool globally:
```bash
npm install -g flenco-node-backend-cli
```

2. Create a new directory for your project:
```bash
mkdir my-backend-project
cd my-backend-project
```

3. Run the CLI tool:
```bash
flenco-node-backend-cli
```

4. Follow the interactive prompts:
   - Choose database type (PostgreSQL/MySQL)
   - Enter database credentials
   - Select table for CRUD generation
   - Configure authentication and file upload options

5. After generation is complete, run:
```bash
npm install
npm run dev
```

## Features ✨

- 🚀 Quick setup of Node.js backend projects
- 📝 TypeScript support out of the box
- 🔐 JWT Authentication
- 📁 File upload support
- 🗄️ Database integration (PostgreSQL/MySQL)
- 🔄 Automatic CRUD operations
- ✨ Built-in pagination
- 🛠️ Validation using Zod
- 🔍 Database schema introspection
- 🎯 Middleware support
- 🌟 Best practices and patterns

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- PostgreSQL or MySQL database

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
- `npm start`: Run the production server
- `npm run dev`: Start development server
- `npm run prisma:generate`: Generate Prisma client
- `npm run prisma:push`: Push schema to database

## API Endpoints

For each generated table, the following endpoints are created:

```
GET    /api/{table}          # Get all records (with pagination)
GET    /api/{table}/:id      # Get single record
POST   /api/{table}          # Create new record
PATCH  /api/{table}/:id      # Update record
DELETE /api/{table}/:id      # Delete record
```

## Environment Variables

After project generation, update your `.env` file with your configurations:

```env
# Database Configuration
DATABASE_URL=your_database_url
PORT=3000

# JWT Configuration
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=1d

# Email Configuration (if needed)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-email
SMTP_PASS=your-password

# File Upload Configuration (if enabled)
MAX_FILE_SIZE=5242880
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/gif,application/pdf
```

## Troubleshooting

If you encounter any issues:

1. Make sure you have installed the package globally:
```bash
npm install -g flenco-node-backend-cli
```

2. Verify that your database is running and accessible

3. Check that all required environment variables are properly set

## Support

For issues and feature requests, please visit:
[GitHub Issues](https://github.com/yourusername/flenco-node-backend-cli/issues)

## License

This project is licensed under the MIT License - see the LICENSE file for details.