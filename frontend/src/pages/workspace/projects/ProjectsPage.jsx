import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Avatar, AvatarGroup } from '../../../components/ui/Avatar';
import { Modal } from '../../../components/ui/Modal';
import { Drawer } from '../../../components/ui/Drawer';
import { Input } from '../../../components/forms/Input';
import { Select } from '../../../components/forms/Select';
import { Textarea } from '../../../components/forms/Textarea';
import { SearchFilterBar } from '../../../components/common/SearchFilterBar';
import { Pagination } from '../../../components/ui/Pagination';
import { LoadingState } from '../../../components/common/LoadingState';
import { Breadcrumb } from '../../../components/ui/Breadcrumb';
import { CommentThread } from '../../../components/common/CommentThread';
import { projectService } from '../../../services/projectService';
import { clientService } from '../../../services/clientService';
import { teamService } from '../../../services/teamService';
import { useToast } from '../../../hooks/useToast';
import { formatDate } from '../../../utils/formatters';
import {
  FolderKanban,
  Plus,
  Eye,
  Edit2,
  Clock,
  Calendar,
  Layers,
  FileText,
  TrendingUp,
  User,
  Sparkles,
} from 'lucide-react';

export const ProjectsPage = () => {
  const toast = useToast();

  const [projects, setProjects] = useState([]);
  const [clients, setClients] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 6;

  // Drawer & Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isHubDrawerOpen, setIsHubDrawerOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);

  // Form State
  const [projectName, setProjectName] = useState('');
  const [selectedClientId, setSelectedClientId] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [deadline, setDeadline] = useState('2026-09-30');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [projList, clientList, teamList] = await Promise.all([
        projectService.getProjects(),
        clientService.getClients(),
        teamService.getTeamMembers(),
      ]);
      setProjects(projList);
      setClients(clientList);
      setTeamMembers(teamList);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const resetForm = () => {
    setProjectName('');
    setSelectedClientId(clients[0]?.id || '');
    setPriority('Medium');
    setDeadline('2026-09-30');
    setDescription('');
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!projectName) {
      toast.error('Required Field', 'Please enter a project name.');
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedClientObj = clients.find((c) => c.id === selectedClientId) || clients[0];
      await projectService.createProject({
        name: projectName,
        client: selectedClientObj?.companyName || 'Lumina Fashion Inc.',
        clientId: selectedClientId,
        priority,
        deadline,
        description,
      });

      toast.success('Project Created', `Successfully initialized campaign ${projectName}.`);
      setIsCreateModalOpen(false);
      resetForm();
      loadData();
    } catch (err) {
      toast.error('Error', 'Failed to create project.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const statusOptions = [
    { label: 'All Projects', value: 'All' },
    { label: 'Planning', value: 'Planning' },
    { label: 'In Progress', value: 'In Progress' },
    { label: 'Under Review', value: 'Under Review' },
    { label: 'Completed', value: 'Completed' },
  ];

  const getPriorityBadgeVariant = (p) => {
    switch (p) {
      case 'Urgent':
        return 'danger';
      case 'High':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getStatusBadgeVariant = (s) => {
    switch (s) {
      case 'Completed':
        return 'success';
      case 'In Progress':
        return 'info';
      case 'Under Review':
        return 'purple';
      default:
        return 'default';
    }
  };

  // Filter Logic
  const filteredProjects = projects.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.client.toLowerCase().includes(search.toLowerCase()) ||
      p.description?.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === 'All' || p.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const totalItems = filteredProjects.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const paginatedProjects = filteredProjects.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb items={[{ label: 'Workspace', path: '/workspace/dashboard' }, { label: 'Campaign Projects' }]} />

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-extrabold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-200 mb-1.5 shadow-2xs">
            <FolderKanban className="w-4 h-4 text-indigo-600" /> Campaign Projects Hub
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Campaign Projects</h1>
          <p className="text-xs text-slate-500 mt-1">
            Track multi-channel agency campaign milestones, client deliverables, and completion timelines.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          leftIcon={Plus}
          onClick={() => {
            resetForm();
            setIsCreateModalOpen(true);
          }}
        >
          Create Project
        </Button>
      </div>

      {/* Search & Status Filter */}
      <SearchFilterBar
        searchValue={search}
        onSearchChange={(v) => {
          setSearch(v);
          setCurrentPage(1);
        }}
        statusFilter={statusFilter}
        onStatusChange={(v) => {
          setStatusFilter(v);
          setCurrentPage(1);
        }}
        statusOptions={statusOptions}
        placeholder="Search project name, client or description..."
      />

      {/* CAMPAIGN PROJECTS CARDS GRID */}
      {loading ? (
        <LoadingState type="skeleton-cards" count={6} />
      ) : paginatedProjects.length === 0 ? (
        <div className="py-12 text-center text-xs text-slate-500 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          No campaign projects found matching your search.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {paginatedProjects.map((proj) => (
            <div
              key={proj.id}
              className="p-5 bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:border-indigo-400 hover:shadow-xs transition-all space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-3">
                {/* Card Top: Icon Box, Title & Badges */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2.5 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 shadow-2xs shrink-0">
                      <FolderKanban className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-extrabold text-slate-900 leading-snug truncate">{proj.name}</h3>
                      <p className="text-[10px] font-bold text-indigo-600">Client: {proj.client}</p>
                    </div>
                  </div>

                  <Badge variant={getPriorityBadgeVariant(proj.priority)}>
                    {proj.priority}
                  </Badge>
                </div>

                {/* Description */}
                <p className="text-xs text-slate-600 font-medium line-clamp-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  {proj.description || 'Campaign deliverables and multi-channel asset creation.'}
                </p>

                {/* Progress Bar */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase">Progress</span>
                    <span className="font-extrabold text-indigo-700">{proj.progress || 0}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full transition-all duration-300"
                      style={{ width: `${proj.progress || 0}%` }}
                    />
                  </div>
                </div>

                {/* Status & Deadline */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <Badge variant={getStatusBadgeVariant(proj.status)} dot>
                    {proj.status}
                  </Badge>
                  <span className="font-mono text-[10px] text-slate-500 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-400" /> {formatDate(proj.deadline)}
                  </span>
                </div>
              </div>

              {/* Card Footer: Team & View Details Trigger */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                {proj.assignedTeam && proj.assignedTeam.length > 0 ? (
                  <AvatarGroup max={3} size="sm">
                    {proj.assignedTeam.map((m) => (
                      <Avatar key={m.id} src={m.avatar} name={m.name} size="sm" />
                    ))}
                  </AvatarGroup>
                ) : (
                  <span className="text-xs text-slate-400 italic">No team assigned</span>
                )}

                <Button
                  variant="ghost"
                  size="xs"
                  leftIcon={Eye}
                  onClick={() => {
                    setSelectedProject(proj);
                    setIsHubDrawerOpen(true);
                  }}
                >
                  Project Hub
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination Navigation */}
      {totalItems > 0 && (
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            totalResults={totalItems}
            pageSize={pageSize}
          />
        </div>
      )}

      {/* CREATE PROJECT MODAL */}
      <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="Create Campaign Project">
        <form onSubmit={handleCreateProject} className="space-y-4">
          <Input label="Project Name" value={projectName} onChange={(e) => setProjectName(e.target.value)} required />
          <Select
            label="Client Brand"
            value={selectedClientId}
            onChange={(e) => setSelectedClientId(e.target.value)}
            options={clients.map((c) => ({ value: c.id, label: c.companyName }))}
          />
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Priority Level"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              options={[
                { value: 'Low', label: 'Low' },
                { value: 'Medium', label: 'Medium' },
                { value: 'High', label: 'High' },
                { value: 'Urgent', label: 'Urgent' },
              ]}
            />
            <Input label="Target Deadline" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          </div>
          <Textarea label="Campaign Scope & Goals" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setIsCreateModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>Initialize Campaign</Button>
          </div>
        </form>
      </Modal>

      {/* PROJECT HUB DRAWER */}
      <Drawer
        isOpen={isHubDrawerOpen}
        onClose={() => setIsHubDrawerOpen(false)}
        title={selectedProject?.name || 'Project Details'}
        size="lg"
      >
        {selectedProject && (
          <div className="space-y-6 text-xs">
            <div className="p-4 bg-indigo-50/70 rounded-2xl border border-indigo-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">{selectedProject.name}</h3>
                <p className="text-xs font-bold text-indigo-700">Client: {selectedProject.client}</p>
              </div>
              <Badge variant={getStatusBadgeVariant(selectedProject.status)} dot>
                {selectedProject.status}
              </Badge>
            </div>

            {/* Comments Thread */}
            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <CommentThread
                entityType="project"
                entityId={selectedProject.id}
                entityTitle={selectedProject.name}
                clientName={selectedProject.client}
              />
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
};
