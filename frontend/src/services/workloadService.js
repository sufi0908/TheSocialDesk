import { storage } from './storage';
import { simulateDelay } from './apiClient';
import { taskService } from './taskService';
import { contentService } from './contentService';
import { teamService } from './teamService';
import { STATUS_TYPES, ROLES } from '../utils/constants';

export const WORKLOAD_LEVELS = {
  LOW: { label: 'Low', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  NORMAL: { label: 'Normal', color: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500' },
  HIGH: { label: 'High', color: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
  OVERLOADED: { label: 'Overloaded', color: 'bg-rose-50 text-rose-700 border-rose-200', dot: 'bg-rose-500' },
};

export const workloadService = {
  async getMyWork(userName = 'Carlos Ruiz', role = ROLES.GRAPHIC_DESIGNER) {
    await simulateDelay(150);
    const [allTasks, allContent] = await Promise.all([
      taskService.getTasks(),
      contentService.getContentPosts(),
    ]);

    // Filter tasks & content assigned to this user
    const myTasks = allTasks.filter((t) => t.assigneeName === userName || role === ROLES.WORKSPACE_MANAGER);
    const myContent = allContent.filter((c) => c.assigneeName === userName || role === ROLES.WORKSPACE_MANAGER);

    const todayStr = '2026-08-27';

    // 1. Today
    const todayItems = [
      ...myTasks.filter((t) => t.dueDate === todayStr || t.status === STATUS_TYPES.IN_PROGRESS).map((t) => ({ ...t, itemType: 'Task' })),
      ...myContent.filter((c) => c.statusKey === STATUS_TYPES.CLIENT_REVIEW || c.statusKey === STATUS_TYPES.INTERNAL_REVIEW).map((c) => ({ ...c, itemType: 'Content Approval' })),
    ];

    // 2. Upcoming
    const upcomingItems = [
      ...myTasks.filter((t) => t.dueDate > todayStr && t.status !== STATUS_TYPES.COMPLETED).map((t) => ({ ...t, itemType: 'Task' })),
      ...myContent.filter((c) => c.statusKey === STATUS_TYPES.DRAFT || c.statusKey === STATUS_TYPES.IN_PROGRESS).map((c) => ({ ...c, itemType: 'Content Draft' })),
    ];

    // 3. Overdue
    const overdueItems = [
      ...myTasks.filter((t) => t.dueDate < todayStr && t.status !== STATUS_TYPES.COMPLETED).map((t) => ({ ...t, itemType: 'Overdue Task' })),
      ...myContent.filter((c) => c.statusKey === STATUS_TYPES.REVISION_REQUIRED).map((c) => ({ ...c, itemType: 'Revision Request' })),
    ];

    // 4. Completed
    const completedItems = [
      ...myTasks.filter((t) => t.status === STATUS_TYPES.COMPLETED).map((t) => ({ ...t, itemType: 'Completed Task' })),
      ...myContent.filter((c) => c.statusKey === STATUS_TYPES.APPROVED || c.statusKey === STATUS_TYPES.SCHEDULED || c.statusKey === STATUS_TYPES.PUBLISHED).map((c) => ({ ...c, itemType: 'Approved Content' })),
    ];

    return {
      todayItems,
      upcomingItems,
      overdueItems,
      completedItems,
    };
  },

  async getTeamWorkload(filters = {}) {
    await simulateDelay(180);
    const [teamList, allTasks, allContent] = await Promise.all([
      teamService.getTeamMembers(),
      taskService.getTasks(),
      contentService.getContentPosts(),
    ]);

    const todayStr = '2026-08-27';

    let workloadData = teamList.map((member) => {
      const memberTasks = allTasks.filter((t) => t.assigneeName === member.name);
      const memberContent = allContent.filter((c) => c.assigneeName === member.name);

      const activeTasksCount = memberTasks.filter((t) => t.status !== STATUS_TYPES.COMPLETED).length;
      const pendingContentCount = memberContent.filter((c) => c.statusKey !== STATUS_TYPES.PUBLISHED).length;
      const totalActiveWork = activeTasksCount + pendingContentCount;

      const dueTodayCount = memberTasks.filter((t) => t.dueDate === todayStr).length;
      const overdueCount = memberTasks.filter((t) => t.dueDate < todayStr && t.status !== STATUS_TYPES.COMPLETED).length +
        memberContent.filter((c) => c.statusKey === STATUS_TYPES.REVISION_REQUIRED).length;
      const completedCount = memberTasks.filter((t) => t.status === STATUS_TYPES.COMPLETED).length +
        memberContent.filter((c) => c.statusKey === STATUS_TYPES.PUBLISHED).length;

      // Calculate Workload Capacity Level
      let capacityLevel = WORKLOAD_LEVELS.NORMAL;
      if (totalActiveWork <= 2) capacityLevel = WORKLOAD_LEVELS.LOW;
      else if (totalActiveWork <= 4) capacityLevel = WORKLOAD_LEVELS.NORMAL;
      else if (totalActiveWork <= 6) capacityLevel = WORKLOAD_LEVELS.HIGH;
      else capacityLevel = WORKLOAD_LEVELS.OVERLOADED;

      return {
        id: member.id,
        name: member.name,
        email: member.email,
        role: member.role,
        avatar: member.avatar,
        activeTasksCount,
        pendingContentCount,
        totalActiveWork,
        dueTodayCount,
        overdueCount,
        completedCount,
        capacityLevel,
        client: member.client || 'Multiple Clients',
      };
    });

    if (filters.role && filters.role !== 'All') {
      workloadData = workloadData.filter((m) => m.role === filters.role);
    }

    if (filters.search) {
      const q = filters.search.toLowerCase();
      workloadData = workloadData.filter((m) => m.name.toLowerCase().includes(q) || m.role.toLowerCase().includes(q));
    }

    return workloadData;
  },
};
