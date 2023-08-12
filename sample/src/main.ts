import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { AppModule } from './app.module';

async function bootstrap() {
  const fastifyAdapter = new FastifyAdapter({
    logger: true,
  });
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  fastifyAdapter.register(require('@fastify/multipart'));

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    fastifyAdapter,
  );

  await app.listen(3000);
}
bootstrap();
