import 'dotenv/config';
import { defineConfig } from '@mikro-orm/postgresql';
import { PostgreSqlDriver } from '@mikro-orm/postgresql';
import { User } from './modules/users/entity/user.entity';

console.log('DB Name from Env:', process.env.DB_DATABASE);

export default defineConfig({
  entities: [User],
  dbName: process.env.DB_DATABASE,
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  driver: PostgreSqlDriver,
  // This ensures the Soft Delete filter is recognized by the CLI
  filters: {
    softDelete: {
      cond: { deletedAt: null },
      default: true,
      entity: ['User'], // or remove to apply to all
    },
  },
  resultCache: {
    global: 2000, // Cache every SELECT query for 5 seconds app-wide
  },
});
