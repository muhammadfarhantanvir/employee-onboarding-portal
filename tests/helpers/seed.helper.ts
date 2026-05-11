// tests/helpers/seed.helper.ts
import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { LoginContext } from './auth.helper';
import { SEED_IDS } from '../../prisma/seed.test';

export interface CreatedResource {
  id: string;
  cleanup?: () => Promise<void>;
}

export async function createHire(app: INestApplication, auth: LoginContext): Promise<CreatedResource> {
  const response = await request(app.getHttpServer())
    .post('/api/hires')
    .set('Authorization', `Bearer ${auth.token}`)
    .send({
      fullName: `Integration Hire ${Date.now()}`,
      email: `integration-${Date.now()}@example.test`,
      startDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
      jobTitle: 'QA Engineer',
      department: 'Engineering',
      managerId: SEED_IDS.users.manager,
      templateId: SEED_IDS.templates.softwareEngineer,
    });

  if (![200, 201].includes(response.status)) {
    throw new Error(`createHire failed: ${response.status} ${JSON.stringify(response.body)}`);
  }

  const id = response.body.id as string;
  return {
    id,
    cleanup: async () => {
      await request(app.getHttpServer())
        .delete(`/api/hires/${id}`)
        .set('Authorization', `Bearer ${auth.token}`);
    },
  };
}

export async function createTemplate(app: INestApplication, auth: LoginContext): Promise<CreatedResource> {
  const response = await request(app.getHttpServer())
    .post('/api/templates')
    .set('Authorization', `Bearer ${auth.token}`)
    .send({
      name: `Integration Template ${Date.now()}`,
      description: 'Created by automated integration test',
      isDefault: false,
    });

  if (![200, 201].includes(response.status)) {
    throw new Error(`createTemplate failed: ${response.status} ${JSON.stringify(response.body)}`);
  }

  const id = response.body.id as string;
  return {
    id,
    cleanup: async () => {
      await request(app.getHttpServer())
        .delete(`/api/templates/${id}`)
        .set('Authorization', `Bearer ${auth.token}`);
    },
  };
}

export async function createTask(
  app: INestApplication,
  auth: LoginContext,
  templateId: string,
): Promise<CreatedResource> {
  const response = await request(app.getHttpServer())
    .post(`/api/templates/${templateId}/tasks`)
    .set('Authorization', `Bearer ${auth.token}`)
    .send({
      title: `Integration Task ${Date.now()}`,
      taskType: 'checkbox',
      phase: 'week_1',
      assignedRole: 'new_hire',
      dueDayOffset: 1,
      isRequired: true,
    });

  if (![200, 201].includes(response.status)) {
    throw new Error(`createTask failed: ${response.status} ${JSON.stringify(response.body)}`);
  }

  return { id: response.body.id as string };
}

export async function createDocument(app: INestApplication, auth: LoginContext): Promise<CreatedResource> {
  const response = await request(app.getHttpServer())
    .post('/api/documents')
    .set('Authorization', `Bearer ${auth.token}`)
    .send({
      name: `Integration Document ${Date.now()}`,
      originalName: 'integration.pdf',
      filePath: `tests/integration-${Date.now()}.pdf`,
      mimeType: 'application/pdf',
      category: 'policy',
      isCompanyDoc: true,
    });

  if (![200, 201].includes(response.status)) {
    throw new Error(`createDocument failed: ${response.status} ${JSON.stringify(response.body)}`);
  }

  const id = response.body.id as string;
  return {
    id,
    cleanup: async () => {
      await request(app.getHttpServer())
        .delete(`/api/documents/${id}`)
        .set('Authorization', `Bearer ${auth.token}`);
    },
  };
}
