import * as Joi from 'joi';

interface EnvVars {
  DB_HOST: string;
  DB_PORT: number;
  DB_USERNAME: string;
  DB_PASSWORD: string;
  DB_DATABASE: string;

  REDIS_HOST: string;
  REDIS_PORT: number;
  REDIS_PASSWORD?: string;

  NODE_ENV: 'development' | 'production' | 'test';
}

export const envValidationSchema: Joi.ObjectSchema<EnvVars> =
  Joi.object<EnvVars>({
    DB_HOST: Joi.string().required(),
    DB_PORT: Joi.number().required(),
    DB_USERNAME: Joi.string().required(),
    DB_PASSWORD: Joi.string().required(),
    DB_DATABASE: Joi.string().required(),

    REDIS_HOST: Joi.string().required(),
    REDIS_PORT: Joi.number().required(),
    REDIS_PASSWORD: Joi.string().allow('').optional(),

    NODE_ENV: Joi.string()
      .valid('development', 'production', 'test')
      .default('development'),
  });
