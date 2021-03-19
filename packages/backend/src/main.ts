import { INestApplication, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import express, { Express } from 'express';
import { config } from 'node-config-ts';
import AppModule from './modules/app.module';
import Header from './common/enum/headers.enum';
import { LoggerService } from './common/logger';
import ValidationExceptionFilter from './common/error-handling/exception-filter';
import { database, status } from 'migrate-mongo';

const bootstrap = async (): Promise<void> => {
  const { db } = await database.connect();
  const migrations = await status(db);
  if (!migrations?.length || migrations.pop()?.appliedAt === 'PENDING') {
    console.error("Migrations are not applied, please run 'yarn migrate'");
    process.exit(1);
  }

  const logger = new LoggerService(config);

  const expressApp: Express = express();
  expressApp.disable(Header.X_POWERED_BY);

  const app: INestApplication = await NestFactory.create(
    AppModule,
    new ExpressAdapter(expressApp),
    {
      logger,
    }
  );

  app.enableCors();
  app.useGlobalPipes(new ValidationPipe());
  app.useGlobalFilters(
    new ValidationExceptionFilter(app.getHttpAdapter(), logger)
  );

  await app.listen(config.application.port, () => {
    logger.log(`Start listen ${config.application.port}`, 'bootstrap');
  });
};

bootstrap();
