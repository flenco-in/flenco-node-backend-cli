#!/usr/bin/env node
import { program } from 'commander';

program
  .version('0.1.0')
  .description('CLI to generate Express backend with TypeScript and Prisma');

program
  .command('init')
  .description('Initialize a new backend project')
  .action(() => {
    import('./commands/init');
  });

program
  .command('generate')
  .description('Generate API for a database table')
  .action(() => {
    import('./commands/generate');
  });

program
  .command('refresh')
  .description('Refresh APIs for tables that have changed in the database')
  .action(() => {
    import('./commands/refresh');
  });

// Add a default action for when no command is specified
program
  .action(() => {
    console.log('Welcome to Flenco Backend Generator!');
    console.log('\nAvailable commands:');
    console.log('  flenco-init     - Initialize a new backend project');
    console.log('  flenco-generate - Generate API for a database table');
    console.log('  flenco-refresh  - Refresh APIs for tables that have changed');
    console.log('\nRun any command with --help for more information.');
  });

program.parse(process.argv);