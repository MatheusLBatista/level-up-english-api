import {
  OpenAPIRegistry,
  OpenApiGeneratorV3,
  extendZodWithOpenApi,
} from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

extendZodWithOpenApi(z);

export const registry = new OpenAPIRegistry();

export function generateOpenApiDoc() {
  const generator = new OpenApiGeneratorV3(registry.definitions);

  return generator.generateDocument({
    openapi: '3.0.0',
    info: {
      title: 'Level Up English API',
      version: '1.0.0',
    },
    servers: [
      { url: `http://localhost:${process.env.PORT || 3000}`, description: 'Development' },
    ],
  });
}