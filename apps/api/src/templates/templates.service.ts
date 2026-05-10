import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  ASSIGNED_ROLES,
  AssignedRole,
  CreateTemplateInput,
  CreateTemplateTaskInput,
  OnboardingTemplate,
  PHASES,
  Phase,
  TASK_TYPES,
  TaskType,
  TemplateTask,
  UpdateTemplateInput,
  UpdateTemplateTaskInput,
} from './templates.types';

@Injectable()
export class TemplatesService {
  /** In-memory store: companyId → templateId → OnboardingTemplate */
  private readonly store = new Map<string, Map<string, OnboardingTemplate>>();

  constructor() {
    this.seedDemoTemplates();
  }

  // ── Templates ──────────────────────────────────────────────────

  listTemplates(companyId: string): OnboardingTemplate[] {
    return Array.from(this.companyStore(companyId).values()).sort(
      (a, b) => a.name.localeCompare(b.name),
    );
  }

  getTemplate(companyId: string, templateId: string): OnboardingTemplate {
    return this.requireTemplate(companyId, templateId);
  }

  createTemplate(
    companyId: string,
    input: CreateTemplateInput,
    createdBy: string,
  ): OnboardingTemplate {
    const name = this.readRequiredString(input.name, 'name', 1, 200);
    const now = new Date().toISOString();
    const template: OnboardingTemplate = {
      id: randomUUID(),
      companyId,
      name,
      description: input.description?.trim() || null,
      department: input.department?.trim() || null,
      isDefault: input.isDefault ?? false,
      createdBy,
      tasks: [],
      createdAt: now,
      updatedAt: now,
    };

    this.companyStore(companyId).set(template.id, template);
    return template;
  }

  updateTemplate(
    companyId: string,
    templateId: string,
    input: UpdateTemplateInput,
  ): OnboardingTemplate {
    const template = this.requireTemplate(companyId, templateId);
    const updated: OnboardingTemplate = {
      ...template,
      name:
        input.name !== undefined
          ? this.readRequiredString(input.name, 'name', 1, 200)
          : template.name,
      description:
        input.description !== undefined
          ? input.description?.trim() || null
          : template.description,
      department:
        input.department !== undefined
          ? input.department?.trim() || null
          : template.department,
      isDefault: input.isDefault ?? template.isDefault,
      updatedAt: new Date().toISOString(),
    };

    this.companyStore(companyId).set(templateId, updated);
    return updated;
  }

  deleteTemplate(companyId: string, templateId: string): void {
    this.requireTemplate(companyId, templateId);
    this.companyStore(companyId).delete(templateId);
  }

  /**
   * Duplicate a template (and all its tasks) with a new name.
   * Used for "Duplicate and customise per hire" workflow.
   */
  duplicateTemplate(
    companyId: string,
    templateId: string,
    createdBy: string,
    overrides?: { name?: string; department?: string },
  ): OnboardingTemplate {
    const source = this.requireTemplate(companyId, templateId);
    const now = new Date().toISOString();
    const newId = randomUUID();
    const clonedTasks: TemplateTask[] = source.tasks.map((task) => ({
      ...task,
      id: randomUUID(),
      templateId: newId,
      createdAt: now,
      updatedAt: now,
    }));

    const clone: OnboardingTemplate = {
      ...source,
      id: newId,
      name: overrides?.name ?? `${source.name} (Copy)`,
      department: overrides?.department ?? source.department,
      isDefault: false,
      createdBy,
      tasks: clonedTasks,
      createdAt: now,
      updatedAt: now,
    };

    this.companyStore(companyId).set(clone.id, clone);
    return clone;
  }

  // ── Template Tasks ─────────────────────────────────────────────

  addTask(
    companyId: string,
    templateId: string,
    input: CreateTemplateTaskInput,
  ): TemplateTask {
    const template = this.requireTemplate(companyId, templateId);
    const title = this.readRequiredString(input.title, 'title', 1, 300);
    const taskType = this.readTaskType(input.taskType);
    const phase = this.readPhase(input.phase);
    const assignedRole = this.readAssignedRole(input.assignedRole ?? 'new_hire');
    const now = new Date().toISOString();
    const maxOrder = template.tasks.reduce(
      (max, t) => Math.max(max, t.sortOrder),
      -1,
    );

    const task: TemplateTask = {
      id: randomUUID(),
      templateId,
      companyId,
      title,
      description: input.description?.trim() || null,
      taskType,
      phase,
      assignedRole,
      dueDayOffset: input.dueDayOffset ?? 0,
      sortOrder: maxOrder + 1,
      isRequired: input.isRequired ?? true,
      createdAt: now,
      updatedAt: now,
    };

    const updated: OnboardingTemplate = {
      ...template,
      tasks: [...template.tasks, task],
      updatedAt: now,
    };

    this.companyStore(companyId).set(templateId, updated);
    return task;
  }

  updateTask(
    companyId: string,
    templateId: string,
    taskId: string,
    input: UpdateTemplateTaskInput,
  ): TemplateTask {
    const template = this.requireTemplate(companyId, templateId);
    const taskIndex = template.tasks.findIndex((t) => t.id === taskId);
    if (taskIndex === -1) {
      throw new NotFoundException('Task not found in this template');
    }

    const existing = template.tasks[taskIndex];
    const now = new Date().toISOString();
    const updatedTask: TemplateTask = {
      ...existing,
      title:
        input.title !== undefined
          ? this.readRequiredString(input.title, 'title', 1, 300)
          : existing.title,
      description:
        input.description !== undefined
          ? input.description?.trim() || null
          : existing.description,
      taskType:
        input.taskType !== undefined
          ? this.readTaskType(input.taskType)
          : existing.taskType,
      phase:
        input.phase !== undefined
          ? this.readPhase(input.phase)
          : existing.phase,
      assignedRole:
        input.assignedRole !== undefined
          ? this.readAssignedRole(input.assignedRole)
          : existing.assignedRole,
      dueDayOffset: input.dueDayOffset ?? existing.dueDayOffset,
      isRequired: input.isRequired ?? existing.isRequired,
      updatedAt: now,
    };

    const newTasks = [...template.tasks];
    newTasks[taskIndex] = updatedTask;
    const updatedTemplate: OnboardingTemplate = {
      ...template,
      tasks: newTasks,
      updatedAt: now,
    };

    this.companyStore(companyId).set(templateId, updatedTemplate);
    return updatedTask;
  }

  deleteTask(
    companyId: string,
    templateId: string,
    taskId: string,
  ): void {
    const template = this.requireTemplate(companyId, templateId);
    const taskExists = template.tasks.some((t) => t.id === taskId);
    if (!taskExists) {
      throw new NotFoundException('Task not found in this template');
    }

    const updatedTemplate: OnboardingTemplate = {
      ...template,
      tasks: template.tasks.filter((t) => t.id !== taskId),
      updatedAt: new Date().toISOString(),
    };

    this.companyStore(companyId).set(templateId, updatedTemplate);
  }

  /**
   * Reorder tasks by providing an ordered array of task IDs.
   * Supports drag-and-drop reordering from the frontend.
   */
  reorderTasks(
    companyId: string,
    templateId: string,
    taskIds: string[],
  ): OnboardingTemplate {
    const template = this.requireTemplate(companyId, templateId);
    const taskMap = new Map(template.tasks.map((t) => [t.id, t]));

    // Validate all provided IDs exist
    for (const id of taskIds) {
      if (!taskMap.has(id)) {
        throw new BadRequestException(`Task ID ${id} not found in template`);
      }
    }

    // Validate all existing tasks are covered
    if (taskIds.length !== template.tasks.length) {
      throw new BadRequestException(
        'taskIds must include all task IDs in the template',
      );
    }

    const now = new Date().toISOString();
    const reorderedTasks: TemplateTask[] = taskIds.map((id, index) => ({
      ...taskMap.get(id)!,
      sortOrder: index,
      updatedAt: now,
    }));

    const updatedTemplate: OnboardingTemplate = {
      ...template,
      tasks: reorderedTasks,
      updatedAt: now,
    };

    this.companyStore(companyId).set(templateId, updatedTemplate);
    return updatedTemplate;
  }

  // ── Private helpers ────────────────────────────────────────────

  private companyStore(companyId: string): Map<string, OnboardingTemplate> {
    if (!this.store.has(companyId)) {
      this.store.set(companyId, new Map());
    }
    return this.store.get(companyId)!;
  }

  private requireTemplate(
    companyId: string,
    templateId: string,
  ): OnboardingTemplate {
    const template = this.companyStore(companyId).get(templateId);
    if (!template) {
      throw new NotFoundException('Onboarding template not found');
    }
    return template;
  }

  private readRequiredString(
    value: unknown,
    field: string,
    min: number,
    max: number,
  ): string {
    if (typeof value !== 'string' || !value.trim()) {
      throw new BadRequestException(`${field} is required`);
    }
    const trimmed = value.trim();
    if (trimmed.length < min || trimmed.length > max) {
      throw new BadRequestException(
        `${field} must be between ${min} and ${max} characters`,
      );
    }
    return trimmed;
  }

  private readTaskType(value: unknown): TaskType {
    if (!TASK_TYPES.includes(value as TaskType)) {
      throw new BadRequestException(
        `taskType must be one of: ${TASK_TYPES.join(', ')}`,
      );
    }
    return value as TaskType;
  }

  private readPhase(value: unknown): Phase {
    if (!PHASES.includes(value as Phase)) {
      throw new BadRequestException(
        `phase must be one of: ${PHASES.join(', ')}`,
      );
    }
    return value as Phase;
  }

  private readAssignedRole(value: unknown): AssignedRole {
    if (!ASSIGNED_ROLES.includes(value as AssignedRole)) {
      throw new BadRequestException(
        `assignedRole must be one of: ${ASSIGNED_ROLES.join(', ')}`,
      );
    }
    return value as AssignedRole;
  }

  // ── Demo seed data ─────────────────────────────────────────────

  private seedDemoTemplates(): void {
    const companyId = '11111111-1111-4111-8111-111111111111';
    const createdBy = '22222222-2222-4222-8222-222222222222';
    const now = new Date().toISOString();

    const templates: OnboardingTemplate[] = [
      this.buildTemplate(
        companyId,
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        'Software Engineer',
        'Standard onboarding for engineering hires',
        'Engineering',
        true,
        createdBy,
        now,
        [
          this.buildTask('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', companyId, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Send welcome email', 'Introduce the new hire to the team', 'checkbox', 'pre_boarding', 'hr_admin', -3, 0, true, now),
          this.buildTask('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', companyId, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Prepare workstation', 'Set up laptop, accounts, and access', 'checkbox', 'pre_boarding', 'it_admin', -1, 1, true, now),
          this.buildTask('cccccccc-cccc-4ccc-8ccc-cccccccccccc', companyId, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Sign employment contract', 'Upload signed contract PDF', 'document_upload', 'pre_boarding', 'new_hire', 0, 2, true, now),
          this.buildTask('dddddddd-dddd-4ddd-8ddd-dddddddddddd', companyId, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Meet the team', 'Introductory meeting with direct team', 'meeting', 'week_1', 'new_hire', 1, 3, true, now),
          this.buildTask('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', companyId, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Complete security training', 'Acknowledge security policy', 'acknowledgement', 'week_1', 'new_hire', 5, 4, true, now),
          this.buildTask('ffffffff-ffff-4fff-8fff-ffffffffffff', companyId, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Set up dev environment', 'Clone repos and run local setup', 'checkbox', 'week_1', 'new_hire', 3, 5, true, now),
          this.buildTask('11111111-1111-4111-8111-111111111112', companyId, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '30-day check-in', 'Manager 1:1 review', 'meeting', 'month_1', 'manager', 30, 6, true, now),
          this.buildTask('22222222-2222-4222-8222-222222222223', companyId, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Submit personal details form', 'HR form for payroll setup', 'form_submission', 'month_1', 'new_hire', 7, 7, true, now),
          this.buildTask('33333333-3333-4333-8333-333333333334', companyId, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '90-day performance review', 'Formal review with manager', 'meeting', 'month_3', 'manager', 90, 8, false, now),
        ],
      ),
      this.buildTemplate(
        companyId,
        'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        'Sales Representative',
        'Onboarding plan for sales team hires',
        'Sales',
        false,
        createdBy,
        now,
        [
          this.buildTask('44444444-4444-4444-8444-444444444445', companyId, 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Send welcome package', 'Ship branded welcome kit', 'checkbox', 'pre_boarding', 'hr_admin', -5, 0, true, now),
          this.buildTask('55555555-5555-4555-8555-555555555556', companyId, 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Sign NDA', 'Upload signed NDA document', 'document_upload', 'pre_boarding', 'new_hire', 0, 1, true, now),
          this.buildTask('66666666-6666-4666-8666-666666666667', companyId, 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'CRM system training', 'Complete CRM onboarding module', 'form_submission', 'week_1', 'new_hire', 2, 2, true, now),
          this.buildTask('77777777-7777-4777-8777-777777777778', companyId, 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Shadow a senior rep', 'Attend 3 sales calls', 'meeting', 'week_1', 'new_hire', 4, 3, true, now),
          this.buildTask('88888888-8888-4888-8888-888888888889', companyId, 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'First solo call', 'Make first independent sales call', 'checkbox', 'month_1', 'new_hire', 21, 4, false, now),
        ],
      ),
      this.buildTemplate(
        companyId,
        'cccccccc-cccc-4ccc-8ccc-cccccccccccd',
        'Operations Manager',
        'Onboarding plan for operations leadership',
        'Operations',
        false,
        createdBy,
        now,
        [
          this.buildTask('99999999-9999-4999-8999-99999999999a', companyId, 'cccccccc-cccc-4ccc-8ccc-cccccccccccd', 'Review org chart', 'Understand reporting structure', 'checkbox', 'pre_boarding', 'new_hire', -2, 0, true, now),
          this.buildTask('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaab1', companyId, 'cccccccc-cccc-4ccc-8ccc-cccccccccccd', 'Meet direct reports', 'Schedule 1:1s with all direct reports', 'meeting', 'week_1', 'new_hire', 1, 1, true, now),
          this.buildTask('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbc2', companyId, 'cccccccc-cccc-4ccc-8ccc-cccccccccccd', 'Review current processes', 'Audit existing workflows', 'checkbox', 'month_1', 'new_hire', 14, 2, true, now),
          this.buildTask('cccccccc-cccc-4ccc-8ccc-cccccccccd3', companyId, 'cccccccc-cccc-4ccc-8ccc-cccccccccccd', 'Present 90-day plan', 'Present improvement plan to leadership', 'meeting', 'month_3', 'new_hire', 90, 3, true, now),
        ],
      ),
    ];

    const companyMap = new Map<string, OnboardingTemplate>();
    for (const t of templates) {
      companyMap.set(t.id, t);
    }
    this.store.set(companyId, companyMap);
  }

  private buildTemplate(
    companyId: string,
    id: string,
    name: string,
    description: string,
    department: string,
    isDefault: boolean,
    createdBy: string,
    now: string,
    tasks: TemplateTask[],
  ): OnboardingTemplate {
    return {
      id,
      companyId,
      name,
      description,
      department,
      isDefault,
      createdBy,
      tasks,
      createdAt: now,
      updatedAt: now,
    };
  }

  private buildTask(
    id: string,
    companyId: string,
    templateId: string,
    title: string,
    description: string,
    taskType: TaskType,
    phase: Phase,
    assignedRole: AssignedRole,
    dueDayOffset: number,
    sortOrder: number,
    isRequired: boolean,
    now: string,
  ): TemplateTask {
    return {
      id,
      templateId,
      companyId,
      title,
      description,
      taskType,
      phase,
      assignedRole,
      dueDayOffset,
      sortOrder,
      isRequired,
      createdAt: now,
      updatedAt: now,
    };
  }
}
