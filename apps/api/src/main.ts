import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { toNodeHandler } from 'better-auth/node';

import { AppModule } from './app.module';
import { auth } from './auth/auth';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api/v1');

  const express = app.getHttpAdapter().getInstance();

  express.all('/api/v1/auth/*splat', toNodeHandler(auth));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.listen(process.env.PORT ?? 4000);
}

bootstrap();
