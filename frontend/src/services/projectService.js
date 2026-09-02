import { storage } from './storage';
import { simulateDelay } from './apiClient';
import { STATUS_TYPES, ROLES } from '../utils/constants';

export const INITIAL_PROJECTS_FULL = [];


export const projectService = {
  async getProjects(search = '', statusFilter = 'All', clientId = null) {
    await simulateDelay(180);
    const db = storage.getMockDatabase();
    let list = db.fullProjects || INITIAL_PROJECTS_FULL;

    if (statusFilter && statusFilter !== 'All') {
      list = list.filter((p) => p.status === statusFilter);
    }

    if (clientId) {
      list = list.filter((p) => p.clientId === clientId);
    }

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.client.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q)
      );
    }

    return list;
  },

  async createProject(projectData) {
    await simulateDelay(250);
    const newProject = {
      id: `proj_${Date.now()}`,
      status: projectData.status || 'Planning',
      priority: projectData.priority || 'Medium',
      progress: 0,
      openTasksCount: 0,
      completedTasksCount: 0,
      pendingContentCount: 0,
      approvedContentCount: 0,
      assignedTeam: projectData.assignedTeam || [],
      ...projectData,
    };

    storage.updateMockDatabase((db) => {
      const current = db.fullProjects || INITIAL_PROJECTS_FULL;
      return { ...db, fullProjects: [newProject, ...current] };
    });

    return newProject;
  },

  async updateProject(id, updatedFields) {
    await simulateDelay(200);
    let result = null;

    storage.updateMockDatabase((db) => {
      const current = db.fullProjects || INITIAL_PROJECTS_FULL;
      const updatedList = current.map((p) => {
        if (p.id === id) {
          result = { ...p, ...updatedFields };
          return result;
        }
        return p;
      });
      return { ...db, fullProjects: updatedList };
    });

    return result;
  },

  async getProjectDetails(projectId) {
    await simulateDelay(150);
    const db = storage.getMockDatabase();
    const current = db.fullProjects || INITIAL_PROJECTS_FULL;
    const project = current.find((p) => p.id === projectId) || current[0];

    const tasks = [
      { id: 't_1', title: 'Design 5 Carousel Cover Slides', assignee: 'Carlos Ruiz', dueDate: 'Aug 30', status: 'In Progress' },
      { id: 't_2', title: 'Draft Teaser Copy and Hashtag Set', assignee: 'Sarah Lin', dueDate: 'Sep 02', status: 'Review' },
      { id: 't_3', title: 'Export Reel Master 4K Video', assignee: 'David Sterling', dueDate: 'Sep 05', status: 'Pending' },
    ];

    const content = [
      { id: 'c_1', title: 'Autumn Collection Teaser Carousel', platform: 'Instagram', statusKey: STATUS_TYPES.CLIENT_REVIEW },
      { id: 'c_2', title: 'Behind the Scenes Paris Shoot', platform: 'Instagram', statusKey: STATUS_TYPES.PUBLISHED },
    ];

    const approvals = [
      { id: 'app_1', title: 'Autumn Collection Teaser Carousel', client: project.client, submittedAt: 'Yesterday' },
    ];

    const assets = [
      { id: 'ast_1', name: 'Autumn_Capsule_Lookbook.pdf', size: '14.2 MB', type: 'PDF' },
      { id: 'ast_2', name: 'Paris_Rooftop_Shoot_RAW.zip', size: '1.4 GB', type: 'ZIP' },
    ];

    const activity = [
      { id: 'pa_1', event: 'Project status updated to Active', timestamp: '2 days ago' },
      { id: 'pa_2', event: 'Carlos Ruiz added 3 design tasks', timestamp: '3 days ago' },
    ];

    return {
      ...project,
      tasks,
      content,
      approvals,
      assets,
      activity,
    };
  },
};
