import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { buildSwaggerComponentsSchemas } from './common/swagger-component-registry';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');

  app.enableCors({
    origin: [
      process.env.FRONTEND_URL ?? 'http://localhost:3000',
      'http://localhost:3000',
      'http://localhost:3001',
    ],
    credentials: true,
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Employee Onboarding API')
    .setDescription('Multi-tenant employee onboarding and company workspace API')
    .setVersion('0.0.1')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Paste the accessToken returned by /api/auth/login.',
      },
      'access-token',
    )
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig, {
    ignoreGlobalPrefix: false,
  });
  swaggerDocument.components = swaggerDocument.components ?? {};
  swaggerDocument.components.schemas = {
    ...buildSwaggerComponentsSchemas(),
    ...(swaggerDocument.components.schemas ?? {}),
  };
  SwaggerModule.setup('api/docs', app, swaggerDocument, {
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      docExpansion: 'list',
      // NOTE: defaultModelsExpandDepth: -1 hides the bottom "Schemas" section in Swagger UI 5
      // (see https://github.com/swagger-api/swagger-ui/issues/9724). Use a positive depth to list models.
      defaultModelsExpandDepth: 2,
      defaultModelExpandDepth: 2,
      deepLinking: true,
    },
  });

  const port = process.env.PORT ? Number(process.env.PORT) : 3001;
  await app.listen(port);
}

bootstrap();
