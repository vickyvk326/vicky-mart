import { Module } from '@nestjs/common';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';
import * as path from 'path';
import * as fs from 'fs';

const logDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir);

@Module({
  imports: [
    PinoLoggerModule.forRoot({
      pinoHttp: {
        level: 'debug',
        transport: {
          targets: [
            {
              target: 'pino-pretty',
              options: {
                colorize: true,
                singleLine: false,
                translateTime: 'SYS:dd/mm/yyyy, h:MM:ss TT',
                ignore: 'hostname,req,res,context,pid',
                messageFormat: '[{context}] - {time}: {msg}',
                hideObject: true,
              },
            },
            {
              target: 'pino/file', // write logs to file
              options: {
                destination: path.join(logDir, `app.log`),
                mkdir: true,
              },
            },
            {
              target: 'pino-roll',
              options: {
                file: path.join(logDir, 'app'), // Base filename
                frequency: 'daily', // Roll every day
                size: '10m', // Also roll if file exceeds 10MB
                mkdir: true,
                extension: '.log', // File will be app.2025-12-21.log
                limit: {
                  count: 30,
                },
              },
            },
          ],
        },
      },
    }),
  ],
})
export class LoggerModule {}
