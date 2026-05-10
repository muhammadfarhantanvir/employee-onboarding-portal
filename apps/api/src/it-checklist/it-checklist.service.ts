import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  CreateItChecklistInput,
  CreateItTemplateInput,
  CreateItTemplateItemInput,
  IT_CHECKLIST_STATUSES,
  IT_ITEM_CATEGORIES,
  IT_ITEM_STATUSES,
  ItChecklist,
  ItChecklistItem,
  ItChecklistListResponse,
  ItChecklistStatus,
  ItChecklistTemplate,
  ItChecklistTemplateItem,
  ItItemCategory,
  ItItemStatus,
  ItTemplateListResponse,
  UpdateItChecklistInput,
  UpdateItChecklistItemInput,
  UpdateItTemplateInput,
  UpdateItTemplateItemInput,
} from './it-checklist.types';

@Injectable()
export class ItChecklistService {
  /** companyId → templateId → ItChecklistTemplate */
  private readonly templates = new Map<string, Map<string, ItChecklistTemplate>>();
  /** companyId → checklistId → ItChecklist */
  private readonly checklists = new Map<string, Map<string, ItChecklist>>();
  /** hireId → checklistId (one checklist per hire) */
  private readonly hireIndex = new Map<string, string>();

  constructor() {
    this.seedDemoData();
  }

  // ── IT Checklist Templates ─────────────────────────────────────

  listTemplates(companyId: string): ItTemplateListResponse {
    const templates = Array.from(this.templateStore(companyId).values()).sort(
      (a, b) => a.name.localeCompare(b.name),
    );
    return { templates, count: templates.length };
  }

  getTemplate(companyId: string, templateId: string): ItChecklistTemplate {
    return this.requireTemplate(companyId, templateId);
  }

  createTemplate(
    companyId: string,
    input: CreateItTemplateInput,
    createdBy: string,
  ): ItChecklistTemplate {
    const name = this.requireStr(input.name, 'name', 1, 200);
    const now = new Date().toISOString();
    const template: ItChecklistTemplate = {
      id: randomUUID(),
      companyId,
      name,
      description: input.description?.trim() || null,
      isDefault: input.isDefault ?? false,
      createdBy,
      items: [],
      createdAt: now,
      updatedAt: now,
    };
    this.templateStore(companyId).set(template.id, template);
    return template;
  }

  updateTemplate(
    companyId: string,
    templateId: string,
    input: UpdateItTemplateInput,
  ): ItChecklistTemplate {
    const tpl = this.requireTemplate(companyId, templateId);
    const updated: ItChecklistTemplate = {
      ...tpl,
      name: input.name !== undefined ? this.requireStr(input.name, 'name', 1, 200) : tpl.name,
      description: input.description !== undefined ? input.description?.trim() || null : tpl.description,
      isDefault: input.isDefault ?? tpl.isDefault,
      updatedAt: new Date().toISOString(),
    };
    this.templateStore(companyId).set(templateId, updated);
    return updated;
  }

  deleteTemplate(companyId: string, templateId: string): void {
    this.requireTemplate(companyId, templateId);
    this.templateStore(companyId).delete(templateId);
  }

  // ── Template Items ─────────────────────────────────────────────

  addTemplateItem(
    companyId: string,
    templateId: string,
    input: CreateItTemplateItemInput,
  ): ItChecklistTemplateItem {
    const tpl = this.requireTemplate(companyId, templateId);
    const title = this.requireStr(input.title, 'title', 1, 300);
    const category = this.requireCategory(input.category ?? 'hardware');
    const maxOrder = tpl.items.reduce((m, i) => Math.max(m, i.sortOrder), -1);
    const now = new Date().toISOString();

    const item: ItChecklistTemplateItem = {
      id: randomUUID(),
      templateId,
      companyId,
      title,
      description: input.description?.trim() || null,
      category,
      sortOrder: maxOrder + 1,
      isRequired: input.isRequired ?? true,
      createdAt: now,
    };

    const updatedTpl: ItChecklistTemplate = {
      ...tpl,
      items: [...tpl.items, item],
      updatedAt: now,
    };
    this.templateStore(companyId).set(templateId, updatedTpl);
    return item;
  }

  updateTemplateItem(
    companyId: string,
    templateId: string,
    itemId: string,
    input: UpdateItTemplateItemInput,
  ): ItChecklistTemplateItem {
    const tpl = this.requireTemplate(companyId, templateId);
    const idx = tpl.items.findIndex((i) => i.id === itemId);
    if (idx === -1) throw new NotFoundException('Template item not found');

    const existing = tpl.items[idx];
    const updated: ItChecklistTemplateItem = {
      ...existing,
      title: input.title !== undefined ? this.requireStr(input.title, 'title', 1, 300) : existing.title,
      description: input.description !== undefined ? input.description?.trim() || null : existing.description,
      category: input.category !== undefined ? this.requireCategory(input.category) : existing.category,
      isRequired: input.isRequired ?? existing.isRequired,
    };

    const newItems = [...tpl.items];
    newItems[idx] = updated;
    this.templateStore(companyId).set(templateId, { ...tpl, items: newItems, updatedAt: new Date().toISOString() });
    return updated;
  }

  deleteTemplateItem(companyId: string, templateId: string, itemId: string): void {
    const tpl = this.requireTemplate(companyId, templateId);
    if (!tpl.items.some((i) => i.id === itemId)) {
      throw new NotFoundException('Template item not found');
    }
    const updated: ItChecklistTemplate = {
      ...tpl,
      items: tpl.items.filter((i) => i.id !== itemId),
      updatedAt: new Date().toISOString(),
    };
    this.templateStore(companyId).set(templateId, updated);
  }

  reorderTemplateItems(companyId: string, templateId: string, itemIds: string[]): ItChecklistTemplate {
    const tpl = this.requireTemplate(companyId, templateId);
    const itemMap = new Map(tpl.items.map((i) => [i.id, i]));

    for (const id of itemIds) {
      if (!itemMap.has(id)) throw new BadRequestException(`Item ID ${id} not found in template`);
    }
    if (itemIds.length !== tpl.items.length) {
      throw new BadRequestException('itemIds must include all item IDs in the template');
    }

    const now = new Date().toISOString();
    const reordered = itemIds.map((id, idx) => ({ ...itemMap.get(id)!, sortOrder: idx }));
    const updated: ItChecklistTemplate = { ...tpl, items: reordered, updatedAt: now };
    this.templateStore(companyId).set(templateId, updated);
    return updated;
  }

  // ── IT Checklists (per hire) ───────────────────────────────────

  listChecklists(
    companyId: string,
    opts: { assignedTo?: string; status?: string } = {},
  ): ItChecklistListResponse {
    let all = Array.from(this.checklistStore(companyId).values()).sort(
      (a, b) => b.createdAt.localeCompare(a.createdAt),
    );

    if (opts.assignedTo) all = all.filter((c) => c.assignedTo === opts.assignedTo);
    if (opts.status) all = all.filter((c) => c.status === opts.status);

    const byStatus = IT_CHECKLIST_STATUSES.reduce(
      (acc, s) => ({
        ...acc,
        [s]: Array.from(this.checklistStore(companyId).values()).filter((c) => c.status === s).length,
      }),
      {} as Record<ItChecklistStatus, number>,
    );

    return { checklists: all, count: all.length, byStatus };
  }

  getChecklistByHire(companyId: string, hireId: string): ItChecklist {
    const checklistId = this.hireIndex.get(hireId);
    if (!checklistId) throw new NotFoundException('IT checklist not found for this hire');
    return this.requireChecklist(companyId, checklistId);
  }

  getChecklist(companyId: string, checklistId: string): ItChecklist {
    return this.requireChecklist(companyId, checklistId);
  }

  createChecklist(
    companyId: string,
    input: CreateItChecklistInput,
    createdBy: string,
  ): ItChecklist {
    const hireId = this.requireStr(input.hireId, 'hireId', 1, 100);

    // One checklist per hire
    if (this.hireIndex.has(hireId)) {
      throw new ConflictException('An IT checklist already exists for this hire');
    }

    const now = new Date().toISOString();
    const checklist: ItChecklist = {
      id: randomUUID(),
      companyId,
      hireId,
      templateId: input.templateId ?? null,
      assignedTo: input.assignedTo ?? null,
      status: 'pending',
      completionPct: 0,
      dueDate: input.dueDate ?? null,
      completedAt: null,
      notes: input.notes?.trim() || null,
      items: [],
      createdAt: now,
      updatedAt: now,
    };

    // Instantiate items from template if provided
    if (input.templateId) {
      const tpl = this.templateStore(companyId).get(input.templateId);
      if (tpl) {
        checklist.items = tpl.items.map((ti) => ({
          id: randomUUID(),
          checklistId: checklist.id,
          companyId,
          templateItemId: ti.id,
          title: ti.title,
          description: ti.description,
          category: ti.category,
          sortOrder: ti.sortOrder,
          isRequired: ti.isRequired,
          status: 'pending' as ItItemStatus,
          note: null,
          assetTag: null,
          serialNumber: null,
          completedBy: null,
          completedAt: null,
          createdAt: now,
          updatedAt: now,
        }));
      }
    }

    this.checklistStore(companyId).set(checklist.id, checklist);
    this.hireIndex.set(hireId, checklist.id);
    return checklist;
  }

  updateChecklist(
    companyId: string,
    checklistId: string,
    input: UpdateItChecklistInput,
  ): ItChecklist {
    const checklist = this.requireChecklist(companyId, checklistId);

    if (input.status && !IT_CHECKLIST_STATUSES.includes(input.status)) {
      throw new BadRequestException(`status must be one of: ${IT_CHECKLIST_STATUSES.join(', ')}`);
    }

    const now = new Date().toISOString();
    const updated: ItChecklist = {
      ...checklist,
      assignedTo: input.assignedTo !== undefined ? input.assignedTo : checklist.assignedTo,
      dueDate: input.dueDate !== undefined ? input.dueDate : checklist.dueDate,
      notes: input.notes !== undefined ? input.notes?.trim() || null : checklist.notes,
      status: input.status ?? checklist.status,
      completedAt: input.status === 'completed' && !checklist.completedAt ? now : checklist.completedAt,
      updatedAt: now,
    };

    this.checklistStore(companyId).set(checklistId, updated);
    return updated;
  }

  // ── Checklist Items ────────────────────────────────────────────

  addChecklistItem(
    companyId: string,
    checklistId: string,
    input: CreateItTemplateItemInput,
  ): ItChecklistItem {
    const checklist = this.requireChecklist(companyId, checklistId);
    const title = this.requireStr(input.title, 'title', 1, 300);
    const category = this.requireCategory(input.category ?? 'hardware');
    const maxOrder = checklist.items.reduce((m, i) => Math.max(m, i.sortOrder), -1);
    const now = new Date().toISOString();

    const item: ItChecklistItem = {
      id: randomUUID(),
      checklistId,
      companyId,
      templateItemId: null,
      title,
      description: input.description?.trim() || null,
      category,
      sortOrder: maxOrder + 1,
      isRequired: input.isRequired ?? true,
      status: 'pending',
      note: null,
      assetTag: null,
      serialNumber: null,
      completedBy: null,
      completedAt: null,
      createdAt: now,
      updatedAt: now,
    };

    const updated: ItChecklist = {
      ...checklist,
      items: [...checklist.items, item],
      updatedAt: now,
    };
    this.checklistStore(companyId).set(checklistId, updated);
    return item;
  }

  updateChecklistItem(
    companyId: string,
    checklistId: string,
    itemId: string,
    input: UpdateItChecklistItemInput,
    completedBy: string,
  ): ItChecklistItem {
    const checklist = this.requireChecklist(companyId, checklistId);
    const idx = checklist.items.findIndex((i) => i.id === itemId);
    if (idx === -1) throw new NotFoundException('Checklist item not found');

    const existing = checklist.items[idx];

    if (input.status && !IT_ITEM_STATUSES.includes(input.status)) {
      throw new BadRequestException(`status must be one of: ${IT_ITEM_STATUSES.join(', ')}`);
    }

    const now = new Date().toISOString();
    const updated: ItChecklistItem = {
      ...existing,
      status: input.status ?? existing.status,
      note: input.note !== undefined ? input.note?.trim() || null : existing.note,
      assetTag: input.assetTag !== undefined ? input.assetTag?.trim() || null : existing.assetTag,
      serialNumber: input.serialNumber !== undefined ? input.serialNumber?.trim() || null : existing.serialNumber,
      completedBy: input.status === 'completed' ? completedBy : existing.completedBy,
      completedAt: input.status === 'completed' && !existing.completedAt ? now : existing.completedAt,
      updatedAt: now,
    };

    const newItems = [...checklist.items];
    newItems[idx] = updated;

    const updatedChecklist: ItChecklist = { ...checklist, items: newItems, updatedAt: now };
    this.recalculateChecklistCompletion(companyId, checklistId, updatedChecklist);
    return updated;
  }

  completeChecklistItem(
    companyId: string,
    checklistId: string,
    itemId: string,
    completedBy: string,
    opts: { note?: string; assetTag?: string; serialNumber?: string } = {},
  ): ItChecklistItem {
    const checklist = this.requireChecklist(companyId, checklistId);
    const idx = checklist.items.findIndex((i) => i.id === itemId);
    if (idx === -1) throw new NotFoundException('Checklist item not found');

    const existing = checklist.items[idx];
    if (existing.status === 'completed') throw new ConflictException('Item is already completed');

    const now = new Date().toISOString();
    const updated: ItChecklistItem = {
      ...existing,
      status: 'completed',
      note: opts.note?.trim() || existing.note,
      assetTag: opts.assetTag?.trim() || existing.assetTag,
      serialNumber: opts.serialNumber?.trim() || existing.serialNumber,
      completedBy,
      completedAt: now,
      updatedAt: now,
    };

    const newItems = [...checklist.items];
    newItems[idx] = updated;
    const updatedChecklist: ItChecklist = { ...checklist, items: newItems, updatedAt: now };
    this.recalculateChecklistCompletion(companyId, checklistId, updatedChecklist);
    return updated;
  }

  blockChecklistItem(
    companyId: string,
    checklistId: string,
    itemId: string,
    note?: string,
  ): ItChecklistItem {
    const checklist = this.requireChecklist(companyId, checklistId);
    const idx = checklist.items.findIndex((i) => i.id === itemId);
    if (idx === -1) throw new NotFoundException('Checklist item not found');

    const existing = checklist.items[idx];
    if (existing.status === 'completed') throw new ConflictException('Cannot block a completed item');

    const now = new Date().toISOString();
    const updated: ItChecklistItem = { ...existing, status: 'blocked', note: note?.trim() || existing.note, updatedAt: now };
    const newItems = [...checklist.items];
    newItems[idx] = updated;

    const updatedChecklist: ItChecklist = { ...checklist, items: newItems, status: 'blocked', updatedAt: now };
    this.checklistStore(companyId).set(checklistId, updatedChecklist);
    return updated;
  }

  // ── My IT checklists (for IT admin) ───────────────────────────

  getMyChecklists(companyId: string, userId: string): ItChecklistListResponse {
    return this.listChecklists(companyId, { assignedTo: userId });
  }

  // ── Private helpers ────────────────────────────────────────────

  private templateStore(companyId: string): Map<string, ItChecklistTemplate> {
    if (!this.templates.has(companyId)) this.templates.set(companyId, new Map());
    return this.templates.get(companyId)!;
  }

  private checklistStore(companyId: string): Map<string, ItChecklist> {
    if (!this.checklists.has(companyId)) this.checklists.set(companyId, new Map());
    return this.checklists.get(companyId)!;
  }

  private requireTemplate(companyId: string, templateId: string): ItChecklistTemplate {
    const tpl = this.templateStore(companyId).get(templateId);
    if (!tpl) throw new NotFoundException('IT checklist template not found');
    return tpl;
  }

  private requireChecklist(companyId: string, checklistId: string): ItChecklist {
    const cl = this.checklistStore(companyId).get(checklistId);
    if (!cl) throw new NotFoundException('IT checklist not found');
    return cl;
  }

  private requireStr(value: unknown, field: string, min: number, max: number): string {
    if (typeof value !== 'string' || !value.trim()) throw new BadRequestException(`${field} is required`);
    const t = value.trim();
    if (t.length < min || t.length > max) throw new BadRequestException(`${field} must be between ${min} and ${max} characters`);
    return t;
  }

  private requireCategory(value: unknown): ItItemCategory {
    if (!IT_ITEM_CATEGORIES.includes(value as ItItemCategory)) {
      throw new BadRequestException(`category must be one of: ${IT_ITEM_CATEGORIES.join(', ')}`);
    }
    return value as ItItemCategory;
  }

  private recalculateChecklistCompletion(
    companyId: string,
    checklistId: string,
    checklist: ItChecklist,
  ): void {
    const total = checklist.items.length;
    const done = checklist.items.filter((i) => i.status === 'completed').length;
    const pct = total === 0 ? 0 : Math.round((done / total) * 100);
    const now = new Date().toISOString();

    let newStatus: ItChecklistStatus = checklist.status;
    if (pct === 100) newStatus = 'completed';
    else if (pct > 0 && checklist.status === 'pending') newStatus = 'in_progress';
    // Keep 'blocked' if already blocked
    if (checklist.status === 'blocked' && pct < 100) newStatus = 'blocked';

    const updated: ItChecklist = {
      ...checklist,
      completionPct: pct,
      status: newStatus,
      completedAt: newStatus === 'completed' && !checklist.completedAt ? now : checklist.completedAt,
      updatedAt: now,
    };
    this.checklistStore(companyId).set(checklistId, updated);
  }

  // ── Demo seed ──────────────────────────────────────────────────

  private seedDemoData(): void {
    const companyId = '11111111-1111-4111-8111-111111111111';
    const itAdminId = '44444444-4444-4444-8444-444444444444';
    const hrAdminId = '22222222-2222-4222-8222-222222222222';
    const hireId = 'hire-0001-0001-0001-000000000001';
    const now = new Date().toISOString();
    const today = now.slice(0, 10);

    // ── Default IT template ──
    const templateId = 'it-tpl-0001-0001-0001-000000000001';
    const templateItems: ItChecklistTemplateItem[] = [
      this.buildTplItem('it-ti-0001', templateId, companyId, 'Provision laptop', 'Order and configure MacBook Pro 14"', 'hardware', 0, true, now),
      this.buildTplItem('it-ti-0002', templateId, companyId, 'Create company email', 'Set up firstname.lastname@company.com in Google Workspace', 'communication', 1, true, now),
      this.buildTplItem('it-ti-0003', templateId, companyId, 'Add to Slack workspace', 'Invite to #general and relevant team channels', 'communication', 2, true, now),
      this.buildTplItem('it-ti-0004', templateId, companyId, 'Grant GitHub access', 'Add to org and relevant repos with correct role', 'access', 3, true, now),
      this.buildTplItem('it-ti-0005', templateId, companyId, 'Set up VPN credentials', 'Create WireGuard config and send securely', 'security', 4, true, now),
      this.buildTplItem('it-ti-0006', templateId, companyId, 'Install required software', 'VS Code, Docker, Node.js, 1Password', 'software', 5, true, now),
      this.buildTplItem('it-ti-0007', templateId, companyId, 'Configure 2FA / MFA', 'Enable on Google, GitHub, Slack, and VPN', 'security', 6, true, now),
      this.buildTplItem('it-ti-0008', templateId, companyId, 'Add to Jira / Linear', 'Create account and assign to correct project', 'software', 7, false, now),
      this.buildTplItem('it-ti-0009', templateId, companyId, 'Desk & monitor setup', 'Assign desk, external monitor, keyboard, mouse', 'hardware', 8, false, now),
    ];

    const template: ItChecklistTemplate = {
      id: templateId,
      companyId,
      name: 'Standard IT Onboarding',
      description: 'Default IT provisioning checklist for all new hires',
      isDefault: true,
      createdBy: hrAdminId,
      items: templateItems,
      createdAt: now,
      updatedAt: now,
    };

    const tplMap = new Map<string, ItChecklistTemplate>();
    tplMap.set(template.id, template);
    this.templates.set(companyId, tplMap);

    // ── Checklist for Nina Newhire ──
    const checklistId = 'it-cl-0001-0001-0001-000000000001';
    const checklistItems: ItChecklistItem[] = [
      this.buildItem('it-ci-0001', checklistId, companyId, 'it-ti-0001', 'Provision laptop', 'Order and configure MacBook Pro 14"', 'hardware', 0, true, 'completed', null, 'ASSET-0042', 'C02XK1JFHV2Q', itAdminId, now, now),
      this.buildItem('it-ci-0002', checklistId, companyId, 'it-ti-0002', 'Create company email', 'Set up firstname.lastname@company.com in Google Workspace', 'communication', 1, true, 'completed', null, null, null, itAdminId, now, now),
      this.buildItem('it-ci-0003', checklistId, companyId, 'it-ti-0003', 'Add to Slack workspace', 'Invite to #general and relevant team channels', 'communication', 2, true, 'completed', null, null, null, itAdminId, now, now),
      this.buildItem('it-ci-0004', checklistId, companyId, 'it-ti-0004', 'Grant GitHub access', 'Add to org and relevant repos with correct role', 'access', 3, true, 'pending', null, null, null, null, null, now),
      this.buildItem('it-ci-0005', checklistId, companyId, 'it-ti-0005', 'Set up VPN credentials', 'Create WireGuard config and send securely', 'security', 4, true, 'pending', null, null, null, null, null, now),
      this.buildItem('it-ci-0006', checklistId, companyId, 'it-ti-0006', 'Install required software', 'VS Code, Docker, Node.js, 1Password', 'software', 5, true, 'pending', null, null, null, null, null, now),
      this.buildItem('it-ci-0007', checklistId, companyId, 'it-ti-0007', 'Configure 2FA / MFA', 'Enable on Google, GitHub, Slack, and VPN', 'security', 6, true, 'pending', null, null, null, null, null, now),
      this.buildItem('it-ci-0008', checklistId, companyId, 'it-ti-0008', 'Add to Jira / Linear', 'Create account and assign to correct project', 'software', 7, false, 'pending', null, null, null, null, null, now),
      this.buildItem('it-ci-0009', checklistId, companyId, 'it-ti-0009', 'Desk & monitor setup', 'Assign desk, external monitor, keyboard, mouse', 'hardware', 8, false, 'blocked', 'Waiting for desk allocation from facilities', null, null, null, null, now),
    ];

    const checklist: ItChecklist = {
      id: checklistId,
      companyId,
      hireId,
      templateId,
      assignedTo: itAdminId,
      status: 'in_progress',
      completionPct: 33,
      dueDate: today,
      completedAt: null,
      notes: 'Priority hire — engineering team start date is firm',
      items: checklistItems,
      createdAt: now,
      updatedAt: now,
    };

    const clMap = new Map<string, ItChecklist>();
    clMap.set(checklist.id, checklist);
    this.checklists.set(companyId, clMap);
    this.hireIndex.set(hireId, checklistId);
  }

  private buildTplItem(
    id: string, templateId: string, companyId: string,
    title: string, description: string, category: ItItemCategory,
    sortOrder: number, isRequired: boolean, createdAt: string,
  ): ItChecklistTemplateItem {
    return { id, templateId, companyId, title, description, category, sortOrder, isRequired, createdAt };
  }

  private buildItem(
    id: string, checklistId: string, companyId: string, templateItemId: string,
    title: string, description: string, category: ItItemCategory,
    sortOrder: number, isRequired: boolean, status: ItItemStatus,
    note: string | null, assetTag: string | null, serialNumber: string | null,
    completedBy: string | null, completedAt: string | null, createdAt: string,
  ): ItChecklistItem {
    return {
      id, checklistId, companyId, templateItemId, title, description, category,
      sortOrder, isRequired, status, note, assetTag, serialNumber,
      completedBy, completedAt, createdAt, updatedAt: createdAt,
    } as ItChecklistItem;
  }
}
