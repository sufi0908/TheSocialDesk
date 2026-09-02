import React, { useState, useEffect, useRef } from 'react';
import { Modal } from '../ui/Modal';
import { Input } from '../forms/Input';
import { Textarea } from '../forms/Textarea';
import { Button } from '../ui/Button';
import { Avatar } from '../ui/Avatar';
import { useToast } from '../../hooks/useToast';
import { taskService } from '../../services/taskService';
import { clientService } from '../../services/clientService';
import { projectService } from '../../services/projectService';
import { teamService } from '../../services/teamService';
import {
  UploadCloud,
  Paperclip,
  X,
  FileText,
  Loader2,
  Calendar,
  Clock,
  User,
  Plus,
} from 'lucide-react';

export const TaskManagerModal = ({
  isOpen,
  onClose,
  taskToEdit,
  onSaveSuccess,
}) => {
  const toast = useToast();
  const fileInputRef = useRef(null);

  const [clients, setClients] = useState([]);
  const [projects, setProjects] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedAssigneeId, setSelectedAssigneeId] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('17:00');
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [filesToUpload, setFilesToUpload] = useState([]);
  const [existingAttachments, setExistingAttachments] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadDependencies();
    }
  }, [isOpen, taskToEdit]);

  const loadDependencies = async () => {
    try {
      const [cList, pList, tList] = await Promise.all([
        clientService.getClients().catch(() => []),
        projectService.getProjects().catch(() => []),
        teamService.getTeamMembers().catch(() => []),
      ]);

      const clientArr = Array.isArray(cList) ? cList : [];
      const projArr = Array.isArray(pList) ? pList : [];
      const teamArr = Array.isArray(tList) ? tList : [];

      setClients(clientArr);
      setProjects(projArr);
      setTeamMembers(teamArr);

      if (taskToEdit) {
        setTitle(taskToEdit.title || '');
        setDescription(taskToEdit.description || taskToEdit.instructions || '');
        setSelectedAssigneeId(String(taskToEdit.assigned_to || taskToEdit.assignedTo || ''));
        setPriority(
          taskToEdit.priority
            ? taskToEdit.priority.charAt(0).toUpperCase() + taskToEdit.priority.slice(1).toLowerCase()
            : 'Medium'
        );
        setSelectedClientId(String(taskToEdit.client_id || taskToEdit.clientId || ''));
        setSelectedProjectId(String(taskToEdit.project_id || taskToEdit.projectId || ''));

        if (taskToEdit.due_date || taskToEdit.dueDate) {
          const rawDate = taskToEdit.due_date || taskToEdit.dueDate;
          setDueDate(rawDate.split('T')[0]);
        } else {
          setDueDate('');
        }
        setDueTime(taskToEdit.due_time || taskToEdit.dueTime || '17:00');
        setExistingAttachments(Array.isArray(taskToEdit.attachments) ? taskToEdit.attachments : []);
        setFilesToUpload([]);
      } else {
        setTitle('');
        setDescription('');
        setSelectedAssigneeId(teamArr[0]?.id ? String(teamArr[0].id) : '');
        setPriority('Medium');
        // Default due date to 2 days from now
        setDueDate(new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0]);
        setDueTime('17:00');
        setSelectedClientId('');
        setSelectedProjectId('');
        setExistingAttachments([]);
        setFilesToUpload([]);
      }
    } catch (e) {
      console.warn('Failed loading task modal dependencies:', e.message);
    }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setFilesToUpload((prev) => [...prev, ...files]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeSelectedFile = (idx) => {
    setFilesToUpload((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();

    if (!title.trim()) {
      toast.error('Title Required', 'Please enter a task title.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Use FormData to upload actual files directly
      const formData = new FormData();
      formData.append('title', title.trim());
      if (description.trim()) {
        formData.append('description', description.trim());
        formData.append('instructions', description.trim());
      }
      if (selectedAssigneeId) formData.append('assignedTo', selectedAssigneeId);
      formData.append('priority', priority.toUpperCase());
      if (dueDate) formData.append('dueDate', dueDate);
      if (dueTime) formData.append('dueTime', dueTime);
      if (selectedClientId) formData.append('clientId', selectedClientId);
      if (selectedProjectId) formData.append('projectId', selectedProjectId);

      // Attach physical files
      filesToUpload.forEach((file) => {
        formData.append('files', file);
      });

      if (taskToEdit) {
        // If editing existing task
        await taskService.updateTask(taskToEdit.id, {
          title: title.trim(),
          description: description.trim() || null,
          instructions: description.trim() || null,
          assignedTo: selectedAssigneeId ? Number(selectedAssigneeId) : null,
          priority: priority.toUpperCase(),
          dueDate: dueDate || null,
          dueTime: dueTime || null,
          clientId: selectedClientId ? Number(selectedClientId) : null,
          projectId: selectedProjectId ? Number(selectedProjectId) : null,
        });

        // Upload any new files added during edit
        for (const file of filesToUpload) {
          await taskService.uploadTaskAttachment(taskToEdit.id, file, 'REFERENCE');
        }

        toast.success('Task Updated', `"${title.trim()}" updated successfully.`);
      } else {
        // Create new task
        await taskService.createTask(formData);
        toast.success('Task Created & Assigned 🎉', `"${title.trim()}" created successfully.`);
      }

      if (onSaveSuccess) onSaveSuccess();
      onClose();
    } catch (err) {
      toast.error('Failed to Save Task', err.response?.data?.message || err.message || 'Could not save task.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredProjects = projects.filter((p) => {
    if (!selectedClientId) return true;
    return String(p.client_id || p.clientId) === String(selectedClientId);
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={taskToEdit ? 'Edit Task' : 'Create Task'}
      maxWidth="max-w-xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* TASK TITLE */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Task Title <span className="text-rose-500">*</span>
          </label>
          <Input
            placeholder="e.g. Create Glamira Facebook Post"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="text-sm font-semibold focus:ring-indigo-500"
            autoFocus
          />
        </div>

        {/* DESCRIPTION (OPTIONAL) */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Description / Instructions
            </label>
            <span className="text-[10px] text-slate-400 font-medium">(Optional)</span>
          </div>
          <Textarea
            placeholder="Describe what needs to be done, brand specifications, or deliverable requirements..."
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="text-xs"
          />
        </div>

        {/* ASSIGN TO (REAL WORKSPACE USERS) */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Assign To <span className="text-rose-500">*</span>
          </label>
          <select
            value={selectedAssigneeId}
            onChange={(e) => setSelectedAssigneeId(e.target.value)}
            className="w-full text-xs rounded-xl border-slate-200 bg-white p-2.5 font-bold text-slate-800 focus:ring-indigo-500 focus:border-indigo-500 shadow-2xs"
          >
            <option value="">Select team member...</option>
            {teamMembers.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name || member.full_name} ({member.roleDisplayName || member.role || 'Member'})
              </option>
            ))}
          </select>
        </div>

        {/* PRIORITY & DUE DATE */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* Priority */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Priority
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {['Low', 'Medium', 'High', 'Urgent'].map((p) => {
                const isSelected = priority.toLowerCase() === p.toLowerCase();
                return (
                  <button
                    type="button"
                    key={p}
                    onClick={() => setPriority(p)}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all text-center ${
                      isSelected
                        ? p === 'Urgent'
                          ? 'bg-rose-50 border-rose-300 text-rose-700 shadow-2xs'
                          : p === 'High'
                          ? 'bg-orange-50 border-orange-300 text-orange-700 shadow-2xs'
                          : p === 'Medium'
                          ? 'bg-indigo-50 border-indigo-300 text-indigo-700 shadow-2xs'
                          : 'bg-slate-100 border-slate-300 text-slate-800 shadow-2xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Due Date */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Due Date
            </label>
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="text-xs font-semibold"
            />
          </div>
        </div>

        {/* ATTACHMENTS (REAL FILES) */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Reference Files / Attachments
          </label>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            multiple
            className="hidden"
          />

          <div
            onClick={() => fileInputRef.current?.click()}
            className="p-3.5 rounded-xl border border-dashed border-slate-300 hover:border-indigo-400 bg-slate-50/50 hover:bg-indigo-50/20 transition-all cursor-pointer flex items-center justify-center gap-2 text-slate-600"
          >
            <UploadCloud className="w-4 h-4 text-indigo-600" />
            <span className="text-xs font-bold text-indigo-700">+ Add files</span>
            <span className="text-[11px] text-slate-400">(Images, Videos, PDFs)</span>
          </div>

          {/* Selected File Chips */}
          {filesToUpload.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {filesToUpload.map((file, idx) => (
                <div
                  key={idx}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-200 text-xs font-bold text-indigo-800"
                >
                  <Paperclip className="w-3 h-3 text-indigo-600" />
                  <span className="truncate max-w-[150px]">{file.name}</span>
                  <button
                    type="button"
                    onClick={() => removeSelectedFile(idx)}
                    className="p-0.5 text-indigo-400 hover:text-rose-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* CLIENT / PROJECT (OPTIONAL) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2 border-t border-slate-100">
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Client (Optional)
            </label>
            <select
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              className="w-full text-xs rounded-xl border-slate-200 bg-white p-2 font-semibold text-slate-700"
            >
              <option value="">General Client / Workspace Internal</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.company_name || c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Project (Optional)
            </label>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="w-full text-xs rounded-xl border-slate-200 bg-white p-2 font-semibold text-slate-700"
            >
              <option value="">General Project</option>
              {filteredProjects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ACTIONS */}
        <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>

          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={isSubmitting}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold gap-1.5 shadow-2xs min-w-[110px]"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Saving...
              </>
            ) : taskToEdit ? (
              'Save Changes'
            ) : (
              'Create Task'
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
