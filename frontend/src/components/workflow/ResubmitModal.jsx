import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Send, CheckCircle2, FileCheck } from 'lucide-react';

export const ResubmitModal = ({ isOpen, onClose, onSubmit, isSubmitting }) => {
  const [changesMade, setChangesMade] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      changesMade: changesMade.trim() || 'Updated content per requested revisions.',
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Resubmit Content for Approval" maxWidth="max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-200 text-indigo-900 flex items-start gap-2.5">
          <FileCheck className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-extrabold text-xs">Ready for Final Review</p>
            <p className="text-[11px] text-indigo-800 leading-snug">
              Describe the adjustments you have completed. This will notify the reviewer/client to re-evaluate the post.
            </p>
          </div>
        </div>

        <div>
          <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
            Summary of Changes Made
          </label>
          <textarea
            rows={4}
            value={changesMade}
            onChange={(e) => setChangesMade(e.target.value)}
            placeholder="e.g. Updated the headline wording and replaced the second graphic with the high-res asset..."
            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-indigo-500 font-medium leading-relaxed"
          />
        </div>

        <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
          <Button variant="ghost" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
            isLoading={isSubmitting}
            leftIcon={Send}
          >
            Resubmit for Approval
          </Button>
        </div>
      </form>
    </Modal>
  );
};
