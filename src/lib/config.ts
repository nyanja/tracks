export interface DatabaseConfig {
  url: string;
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl: boolean;
  pool_mode?: string;
}

export interface Config {
  database: DatabaseConfig;
}

let config: Config | null = null;

export function getConfig(): Config {
  if (!config) {
    // Load configuration from environment variables
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
      throw new Error('DATABASE_URL environment variable is required');
    }

    // Parse DATABASE_URL if it's a full connection string
    let parsedConfig: DatabaseConfig;

    try {
      const url = new URL(databaseUrl);

      parsedConfig = {
        url: databaseUrl,
        host: url.hostname,
        port: parseInt(url.port) || 5432,
        database: url.pathname.slice(1), // Remove leading slash
        username: url.username,
        password: url.password,
        ssl: process.env.NODE_ENV === 'production' ? true : (process.env.DATABASE_SSL === 'true'),
        pool_mode: process.env.DATABASE_POOL_MODE || undefined
      };
    } catch {
      // Fallback to individual environment variables if DATABASE_URL is not a valid URL
      parsedConfig = {
        url: databaseUrl,
        host: process.env.DATABASE_HOST || 'localhost',
        port: parseInt(process.env.DATABASE_PORT || '5432'),
        database: process.env.DATABASE_NAME || 'tracks',
        username: process.env.DATABASE_USER || 'postgres',
        password: process.env.DATABASE_PASSWORD || '',
        ssl: process.env.NODE_ENV === 'production' ? true : (process.env.DATABASE_SSL === 'true'),
        pool_mode: process.env.DATABASE_POOL_MODE || undefined
      };
    }

    config = {
      database: parsedConfig
    };
  }

  return config;
}
