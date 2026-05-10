import { Injectable } from '@nestjs/common';
import { HiresService } from '../hires/hires.service';
import { DocumentsService } from '../documents/documents.service';
import { PHASES, Phase } from '../templates/templates.types';
import { HireStatus } from '../hires/hires.types';
import {
  ActiveHireRow,
  ActiveHiresResponse,
  DashboardOverview,
  DepartmentCompletionRow,
  DocumentReviewQueueResponse,
  HireCohortPoint,
  OverdueTaskRow,
  OverdueTasksResponse,
  PendingDocumentRow,
  PhaseTimeRow,
} from './analytics.types';

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly hiresService: HiresService,
    private readonly documentsService: DocumentsService,
  ) {}

  // ── KPI Overview ───────────────────────────────────────────────

  getOverview(companyId: string): DashboardOverview {
    const { hires } = this.hiresService.listHires(companyId);
    const today = new Date().toISOString().slice(0, 10);
    const thisMonthStart = new Date().toISOString().slice(0, 7); // YYYY-MM

    const active = hires.filter(
      (h) => h.status === 'in_progress' || h.status === 'at_risk',
    );
    const atRisk = hires.filter((h) => h.status === 'at_risk');
    const pendingInvites = hires.filter((h) => h.status === 'pending_invite');
    const nonCancelled = hires.filter((h) => h.status !== 'cancelled');
    const completed = hires.filter((h) => h.status === 'completed');
    const completedThisMonth = completed.filter(
      (h) => h.completedAt && h.completedAt.startsWith(thisMonthStart),
    );

    const avgCompletionPct =
      active.length === 0
        ? 0
        : Math.round(
            active.reduce((sum, h) => sum + h.completionPct, 0) / active.length,
          );

    const completionRate =
      nonCancelled.length === 0
        ? 0
        : Math.round((completed.length / nonCancelled.length) * 100);

    // Count overdue tasks across all active hires
    let overdueTaskCount = 0;
    for (const hire of active) {
      const { tasks } = this.hiresService.listHireTasks(hire.id);
      overdueTaskCount += tasks.filter(
        (t) =>
          t.status === 'pending' &&
          t.dueDate &&
          t.dueDate < today &&
          t.isRequired,
      ).length;
    }

    // Pending documents
    const { count: pendingDocuments } =
      this.documentsService.listPendingReview(companyId);

    return {
      activeHires: active.length,
      atRiskHires: atRisk.length,
      pendingInvites: pendingInvites.length,
      completedThisMonth: completedThisMonth.length,
      avgCompletionPct,
      completionRate,
      pendingDocuments,
      overdueTaskCount,
      refreshedAt: new Date().toISOString(),
    };
  }

  // ── Active Onboardings Table ───────────────────────────────────

  getActiveHires(companyId: string): ActiveHiresResponse {
    const { hires, byStatus } = this.hiresService.listHires(companyId);
    const today = new Date().toISOString().slice(0, 10);

    const rows: ActiveHireRow[] = hires
      .filter((h) => h.status !== 'cancelled')
      .map((hire) => {
        const { tasks } = this.hiresService.listHireTasks(hire.id);

        const overdueTaskCount = tasks.filter(
          (t) =>
            t.status === 'pending' &&
            t.dueDate &&
            t.dueDate < today &&
            t.isRequired,
        ).length;

        const pendingTaskCount = tasks.filter(
          (t) => t.status === 'pending' || t.status === 'in_progress',
        ).length;

        const completedTaskCount = tasks.filter(
          (t) => t.status === 'completed',
        ).length;

        // Days active since start date
        const startMs = new Date(hire.startDate).getTime();
        const daysActive = Math.floor(
          (Date.now() - startMs) / 86400000,
        );

        // Days remaining: latest due date among pending required tasks
        const pendingRequired = tasks.filter(
          (t) => t.status === 'pending' && t.isRequired && t.dueDate,
        );
        const latestDue =
          pendingRequired.length > 0
            ? pendingRequired.reduce((max, t) =>
                t.dueDate! > max ? t.dueDate! : max,
              pendingRequired[0].dueDate!)
            : null;
        const daysRemaining = latestDue
          ? Math.ceil(
              (new Date(latestDue).getTime() - Date.now()) / 86400000,
            )
          : null;

        // Phase progress
        const phaseProgress = PHASES.reduce(
          (acc, phase) => {
            const phaseTasks = tasks.filter((t) => t.phase === phase);
            return {
              ...acc,
              [phase]: {
                total: phaseTasks.length,
                completed: phaseTasks.filter((t) => t.status === 'completed')
                  .length,
              },
            };
          },
          {} as Record<Phase, { total: number; completed: number }>,
        );

        return {
          id: hire.id,
          fullName: hire.fullName,
          email: hire.email,
          jobTitle: hire.jobTitle,
          department: hire.department,
          startDate: hire.startDate,
          status: hire.status,
          completionPct: hire.completionPct,
          daysActive,
          daysRemaining,
          overdueTaskCount,
          pendingTaskCount,
          completedTaskCount,
          totalTaskCount: tasks.length,
          managerId: hire.managerId,
          phaseProgress,
        };
      })
      .sort((a, b) => {
        // Sort: at_risk first, then in_progress, then pending_invite, then completed
        const order: Record<string, number> = {
          at_risk: 0,
          in_progress: 1,
          pending_invite: 2,
          completed: 3,
        };
        return (order[a.status] ?? 9) - (order[b.status] ?? 9);
      });

    return { hires: rows, count: rows.length, byStatus };
  }

  // ── Completion Rate by Department ──────────────────────────────

  getCompletionByDepartment(companyId: string): DepartmentCompletionRow[] {
    const { hires } = this.hiresService.listHires(companyId);
    const nonCancelled = hires.filter((h) => h.status !== 'cancelled');

    const deptMap = new Map<string, typeof nonCancelled>();
    for (const hire of nonCancelled) {
      const dept = hire.department ?? 'Unassigned';
      if (!deptMap.has(dept)) deptMap.set(dept, []);
      deptMap.get(dept)!.push(hire);
    }

    return Array.from(deptMap.entries())
      .map(([department, deptHires]) => {
        const completed = deptHires.filter((h) => h.status === 'completed');
        const atRisk = deptHires.filter((h) => h.status === 'at_risk');
        const avgPct =
          deptHires.length === 0
            ? 0
            : Math.round(
                deptHires.reduce((s, h) => s + h.completionPct, 0) /
                  deptHires.length,
              );

        return {
          department,
          totalHires: deptHires.length,
          completedHires: completed.length,
          completionRate:
            deptHires.length === 0
              ? 0
              : Math.round((completed.length / deptHires.length) * 100),
          avgCompletionPct: avgPct,
          atRiskCount: atRisk.length,
        };
      })
      .sort((a, b) => b.totalHires - a.totalHires);
  }

  // ── Phase Time Metrics ─────────────────────────────────────────

  getPhaseTimeMetrics(companyId: string): PhaseTimeRow[] {
    const { hires } = this.hiresService.listHires(companyId);
    const today = new Date().toISOString().slice(0, 10);

    return PHASES.map((phase) => {
      let completedCount = 0;
      let pendingCount = 0;
      let overdueCount = 0;
      const completionDays: number[] = [];

      for (const hire of hires.filter((h) => h.status !== 'cancelled')) {
        const { tasks } = this.hiresService.listHireTasks(hire.id);
        const phaseTasks = tasks.filter((t) => t.phase === phase);

        for (const task of phaseTasks) {
          if (task.status === 'completed') {
            completedCount++;
            if (task.completedAt && task.dueDate) {
              const days = Math.max(
                0,
                Math.ceil(
                  (new Date(task.completedAt).getTime() -
                    new Date(hire.startDate).getTime()) /
                    86400000,
                ),
              );
              completionDays.push(days);
            }
          } else if (task.status === 'pending' || task.status === 'in_progress') {
            pendingCount++;
            if (task.dueDate && task.dueDate < today && task.isRequired) {
              overdueCount++;
            }
          }
        }
      }

      const avgDaysToComplete =
        completionDays.length === 0
          ? null
          : Math.round(
              completionDays.reduce((s, d) => s + d, 0) /
                completionDays.length,
            );

      return {
        phase,
        avgDaysToComplete,
        completedCount,
        pendingCount,
        overdueCount,
      };
    });
  }

  // ── Overdue Tasks ──────────────────────────────────────────────

  getOverdueTasks(companyId: string): OverdueTasksResponse {
    const { hires } = this.hiresService.listHires(companyId);
    const today = new Date().toISOString().slice(0, 10);
    const rows: OverdueTaskRow[] = [];

    for (const hire of hires.filter(
      (h) => h.status === 'in_progress' || h.status === 'at_risk',
    )) {
      const { tasks } = this.hiresService.listHireTasks(hire.id);
      for (const task of tasks) {
        if (
          task.status === 'pending' &&
          task.dueDate &&
          task.dueDate < today &&
          task.isRequired
        ) {
          const daysOverdue = Math.ceil(
            (Date.now() - new Date(task.dueDate).getTime()) / 86400000,
          );
          rows.push({
            taskId: task.id,
            taskTitle: task.title,
            hireId: hire.id,
            hireFullName: hire.fullName,
            hireDepartment: hire.department,
            phase: task.phase,
            assignedRole: task.assignedRole,
            dueDate: task.dueDate,
            daysOverdue,
          });
        }
      }
    }

    rows.sort((a, b) => b.daysOverdue - a.daysOverdue);
    return { tasks: rows, count: rows.length };
  }

  // ── Document Review Queue ──────────────────────────────────────

  getDocumentReviewQueue(companyId: string): DocumentReviewQueueResponse {
    const { documents } = this.documentsService.listPendingReview(companyId);
    const { hires } = this.hiresService.listHires(companyId);
    const hireMap = new Map(hires.map((h) => [h.id, h]));

    const rows: PendingDocumentRow[] = documents.map((doc) => {
      const hire = doc.hireId ? hireMap.get(doc.hireId) : undefined;
      const daysWaiting = Math.floor(
        (Date.now() - new Date(doc.createdAt).getTime()) / 86400000,
      );

      return {
        documentId: doc.id,
        documentName: doc.name,
        category: doc.category,
        hireId: doc.hireId,
        hireFullName: hire?.fullName ?? null,
        uploadedAt: doc.createdAt,
        daysWaiting,
        isCompanyDoc: doc.isCompanyDoc,
      };
    });

    // FIFO — oldest first
    rows.sort((a, b) => b.daysWaiting - a.daysWaiting);
    return { documents: rows, count: rows.length };
  }

  // ── Hire Cohort Chart ──────────────────────────────────────────

  getHireCohort(companyId: string, months = 6): HireCohortPoint[] {
    const { hires } = this.hiresService.listHires(companyId);
    const points: HireCohortPoint[] = [];

    for (let i = months - 1; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const month = d.toISOString().slice(0, 7); // YYYY-MM

      const monthHires = hires.filter(
        (h) => h.invitedAt && h.invitedAt.startsWith(month),
      );

      points.push({
        month,
        invited: monthHires.length,
        completed: monthHires.filter((h) => h.status === 'completed').length,
        atRisk: monthHires.filter((h) => h.status === 'at_risk').length,
      });
    }

    return points;
  }
}
