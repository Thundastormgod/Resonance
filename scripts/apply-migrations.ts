import { execSync } from 'child_process';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const SUPABASE_PROJECT_REF = process.env.NEXT_PUBLIC_SUPABASE_REF;
const SUPABASE_DB_PASSWORD = process.env.SUPABASE_DB_PASSWORD;

if (!SUPABASE_PROJECT_REF || !SUPABASE_DB_PASSWORD) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const runCommand = (command: string) => {
  try {
    console.log(`Running: ${command}`);
    const output = execSync(command, { stdio: 'inherit' });
    return true;
  } catch (error) {
    console.error('Error running command:', error);
    return false;
  }
};

const main = async () => {
  console.log('Applying database migrations...');
  
  // Link to the Supabase project
  const linkCommand = `npx supabase link --project-ref ${SUPABASE_PROJECT_REF}`;
  if (!runCommand(linkCommand)) {
    console.error('Failed to link to Supabase project');
    process.exit(1);
  }
  
  // Push the schema to Supabase
  const pushCommand = `npx supabase db push --db-url postgresql://postgres:${SUPABASE_DB_PASSWORD}@db.${SUPABASE_PROJECT_REF}.supabase.co:5432/postgres`;
  if (!runCommand(pushCommand)) {
    console.error('Failed to push database schema');
    process.exit(1);
  }
  
  console.log('Database migrations applied successfully!');};

main().catch(console.error);
