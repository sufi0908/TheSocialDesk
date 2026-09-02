import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../forms/Input';
import { Select } from '../forms/Select';
import { RotateCcw, AlertTriangle, User, Calendar, Clock } from 'lucide-react';

export const RevisionRequestModal = ({ isOpen, onClose, onSubmit, isSubmitting, teamMembers = [] }) => {
  const [reason, setReason] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [assignedTo, setAssignedTo] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('17:00');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!reason.trim()) return;

    onSubmit({
      reason: reason.trim(),
      priority,
      assignedTo: assignedTo || null,
      dueDate: dueDate || null,
      dueTime: dueTime || null,
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Request Content Revision" maxWidth="max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-extrabold text-xs">Specify Required Changes</p>
            <p className="text-[11px] text-amber-800 leading-snug">
              Explain clearly what needs to be edited or replaced. The assigned team member will be notified immediately.
            </p>
          </div>
        </div>

        <div>
          <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
            Revision Reason & Detailed Feedback <span className="text-red-500">*</span>
          </label>
          <textarea
            rows={4}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Please replace the second image with the autumn silk scarf and update the caption headline..."
            required
            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-indigo-500 font-medium leading-relaxed"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Priority Level"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            options={[
              { value: 'LOW', label: 'Low Priority' },
              { value: 'MEDIUM', label: 'Medium Priority' },
              { value: 'HIGH', label: 'High Priority' },
              { value: 'URGENT', label: 'Urgent Priority' },
            ]}
          />

          <Select
            label="Assign Revision To"
            value={assignedTo}
            onChange={(e) => setAssignedTo(e.target.value)}
            options={[
              { value: '', label: 'Original Content Creator' },
              ...teamMembers.map((m) => ({
                value: m.id,
                label: `${m.full_name || m.name} (${m.role_name || m.role || 'Team Member'})`,
              })),
            ]}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Revision Due Date"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
          <Input
            label="Due Time"
            type="time"
            value={dueTime}
            onChange={(e) => setDueTime(e.target.value)}
          />
        </div>

        <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
          <Button variant="ghost" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            className="bg-amber-600 hover:bg-amber-700 text-white font-bold"
            isLoading={isSubmitting}
            disabled={!reason.trim()}
            leftIcon={RotateCcw}
          >
            Submit Revision Request
          </Button>
        </div>
      </form>
    </Modal>
  );
};
