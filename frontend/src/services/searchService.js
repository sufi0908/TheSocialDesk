import { apiClient } from './apiClient';
import { storage } from './storage';
import { clientService } from './clientService';
import { projectService } from './projectService';
import { taskService } from './taskService';
import { contentService } from './contentService';
import { assetService } from './assetService';
import { teamService } from './teamService';

export const SEARCH_ENTITY_TYPES = {
  CLIENT: 'Client',
  PROJECT: 'Project',
  TASK: 'Task',
  CONTENT: 'Content',
  ASSET: 'Asset',
  TEAM_MEMBER: 'Team Member',
};

export const searchService = {
  async globalSearch(query) {
    if (!query || !query.trim()) {
      return { clients: [], projects: [], tasks: [], content: [], assets: [], teamMembers: [], totalResults: 0 };
    }

    try {
      const response = await apiClient.get('/search', { params: { q: query } });
      if (response.data?.success && response.data?.data) {
        return response.data.data;
      }
    } catch (error) {
      console.warn('Backend globalSearch failed, fallback to local search:', error.message);
    }

    const q = query.toLowerCase().trim();

    // Fallback parallel search across local mock collections
    const [clientsList, projectsList, tasksList, contentList, assetsListRaw, teamList] = await Promise.all([
      clientService.getClients(),
      projectService.getProjects(),
      taskService.getTasks(),
      contentService.getContentPosts(),
      assetService.getAllAssets(),
      teamService.getTeamMembers(),
    ]);

    const assetsList = Array.isArray(assetsListRaw) ? assetsListRaw : (assetsListRaw?.assets || []);

    const clients = (Array.isArray(clientsList) ? clientsList : [])
      .filter((c) => c.companyName?.toLowerCase().includes(q) || c.contactPerson?.toLowerCase().includes(q))
      .map((c) => ({ id: c.id, title: c.companyName, subtitle: `Contact: ${c.contactPerson}`, type: SEARCH_ENTITY_TYPES.CLIENT, path: '/workspace/clients', status: c.status }));

    const projects = (Array.isArray(projectsList) ? projectsList : [])
      .filter((p) => p.name?.toLowerCase().includes(q))
      .map((p) => ({ id: p.id, title: p.name, subtitle: `Client: ${p.client}`, type: SEARCH_ENTITY_TYPES.PROJECT, path: '/workspace/projects', status: p.status }));

    const tasks = (Array.isArray(tasksList) ? tasksList : [])
      .filter((t) => t.title?.toLowerCase().includes(q))
      .map((t) => ({ id: t.id, title: t.title, subtitle: `Client: ${t.client}`, type: SEARCH_ENTITY_TYPES.TASK, path: '/workspace/tasks', status: t.status }));

    const content = (Array.isArray(contentList) ? contentList : [])
      .filter((c) => c.title?.toLowerCase().includes(q) || c.caption?.toLowerCase().includes(q))
      .map((c) => ({ id: c.id, title: c.title, subtitle: `Client: ${c.client}`, type: SEARCH_ENTITY_TYPES.CONTENT, path: '/workspace/content', status: c.statusKey }));

    const assets = assetsList
      .filter((a) => a.name?.toLowerCase().includes(q))
      .map((a) => ({ id: a.id, title: a.name, subtitle: `Client: ${a.client}`, type: SEARCH_ENTITY_TYPES.ASSET, path: '/workspace/assets', status: a.assetType }));

    const teamMembers = (Array.isArray(teamList) ? teamList : [])
      .filter((m) => m.name?.toLowerCase().includes(q) || m.email?.toLowerCase().includes(q))
      .map((m) => ({ id: m.id, title: m.name, subtitle: `Role: ${m.role}`, type: SEARCH_ENTITY_TYPES.TEAM_MEMBER, path: '/workspace/team', status: m.status }));

    const totalResults = clients.length + projects.length + tasks.length + content.length + assets.length + teamMembers.length;

    return { clients, projects, tasks, content, assets, teamMembers, totalResults };
  },
};
