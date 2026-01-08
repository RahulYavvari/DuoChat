import { Pool, PoolConfig } from 'pg';
import { logger } from '../utils/logger.util.js';

class DatabaseConfig {
  private static instance: Pool;

  private constructor() {}

  public static getInstance(): Pool {
    if (!DatabaseConfig.instance) {
      const config: PoolConfig = {
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' 
          ? { rejectUnauthorized: false } 
          : false,
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
      };

      DatabaseConfig.instance = new Pool(config);

      DatabaseConfig.instance.on('error', (err) => {
        logger.error('Unexpected database error', { error: err.message });
      });
    }

    return DatabaseConfig.instance;
  }

  public static async close(): Promise<void> {
    if (DatabaseConfig.instance) {
      await DatabaseConfig.instance.end();
      logger.info('Database connection pool closed');
    }
  }
}

export const db = DatabaseConfig.getInstance();
export default DatabaseConfig;