import 'server-only';
import { neon } from '@neondatabase/serverless';

export function getSql(): ReturnType<typeof neon> | null {
  const url = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
  return url ? neon(url) : null;
}
