import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../forms/Input';
import { Select } from '../forms/Select';
import { assetService } from '../../services/assetService';
import { useToast } from '../../hooks/useToast';
import { FolderPlus, FolderEdit, Trash2, AlertCircle, ArrowRight, FolderOpen, Info } from 'lucide-react';

export const AssetFolderModal = ({
  isOpen,
  onClose,
  mode = 'create', // 'create' | 'edit' | 'rename' | 'delete' | 'move'
  folderToEdit = null,
  selectedAssetIds = [],
  onSuccess,
}) => {
  const toast = useToast();
  const [folderName, setFolderName] = useState('');
  const [folderDescription, setFolderDescription] = useState('');
  const [folders, setFolders] = useState([]);
  const [targetFolderId, setTargetFolderId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if ((mode === 'rename' || mode === 'edit') && folderToEdit) {
        setFolderName(folderToEdit.name || '');
        setFolderDescription(folderToEdit.description || '');
      } else {
        setFolderName('');
        setFolderDescription('');
      }

      if (mode === 'move') {
        loadFolders();
      }
    }
  }, [isOpen, mode, folderToEdit]);

  const loadFolders = async () => {
    try {
      const list = await assetService.listFolders();
      setFolders(list || []);
    } catch (err) {
      setFolders([]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (mode === 'create') {
        const trimmed = folderName.trim();
        if (!trimmed) {
          toast.error('Validation Error', 'Folder name cannot be empty.');
          setIsSubmitting(false);
          return;
        }
        await assetService.createFolder(trimmed, folderDescription.trim() || null);
        toast.success('Folder Created', `Created folder "${trimmed}".`);
        onClose();
        if (onSuccess) onSuccess();
      } else if (mode === 'rename' || mode === 'edit') {
        if (!folderToEdit) return;
        const trimmed = folderName.trim();
        if (!trimmed) {
          toast.error('Validation Error', 'Folder name cannot be empty.');
          setIsSubmitting(false);
          return;
        }
        await assetService.renameFolder(folderToEdit.id, trimmed, folderDescription.trim() || null);
        toast.success('Folder Updated', `Updated folder "${trimmed}".`);
        onClose();
        if (onSuccess) onSuccess();
      } else if (mode === 'delete') {
        if (!folderToEdit) return;
        await assetService.deleteFolder(folderToEdit.id);
        toast.info('Folder Deleted', `Folder "${folderToEdit.name}" deleted. Assets moved to Unorganized (Root).`);
        onClose();
        if (onSuccess) onSuccess(folderToEdit.id);
      } else if (mode === 'move') {
        await assetService.bulkMoveAssets(selectedAssetIds, targetFolderId || null);
        toast.success('Assets Moved', `Moved ${selectedAssetIds.length} asset(s).`);
        onClose();
        if (onSuccess) onSuccess();
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || 'Operation failed.';
      toast.error('Error', errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isDeleteMode = mode === 'delete';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        isDeleteMode
          ? `Delete "${folderToEdit?.name || 'Folder'}"?`
          : mode === 'create'
          ? 'Create New Folder'
          : mode === 'edit' || mode === 'rename'
          ? 'Edit Folder'
          : `Move ${selectedAssetIds.length} Asset(s)`
      }
      maxWidth="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {isDeleteMode ? (
          <div className="space-y-3">
            <div className="p-3.5 bg-amber-50/80 border border-amber-200/80 rounded-2xl flex items-start gap-3 text-amber-900">
              <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-extrabold text-xs text-amber-900">
                  Deleting this folder will not delete the assets inside it.
                </p>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  All media and files currently stored in <strong>"{folderToEdit?.name}"</strong> will automatically be moved to <strong>Unorganized (Root)</strong>.
                </p>
              </div>
            </div>
            <p className="text-slate-600 text-xs px-1">
              Are you sure you want to delete this folder?
            </p>
          </div>
        ) : mode === 'move' ? (
          <Select
            label="Target Collection Folder"
            value={targetFolderId}
            onChange={(e) => setTargetFolderId(e.target.value)}
            options={[
              { value: '', label: 'Root Directory (Unorganized)' },
              ...folders
                .filter((f) => !folderToEdit || f.id !== folderToEdit.id)
                .map((f) => ({ value: f.id, label: f.name })),
            ]}
          />
        ) : (
          <div className="space-y-3">
            <Input
              label="Folder Name"
              placeholder="e.g. Campaign Creatives, Brand Assets, Raw Footage"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              required
              maxLength={255}
              autoFocus
            />

            <div>
              <label className="block text-[11px] font-bold text-black uppercase tracking-wider mb-1">
                Description (Optional)
              </label>
              <textarea
                value={folderDescription}
                onChange={(e) => setFolderDescription(e.target.value)}
                placeholder="Optional description of the folder contents or campaign..."
                rows={2}
                className="w-full px-3 py-2 bg-[#F8F9FC] border border-[#E5E7EB] rounded-xl text-black placeholder:text-slate-400 text-xs focus:outline-none focus:border-[#4F39F6] focus:ring-1 focus:ring-[#4F39F6] transition-all resize-none"
              />
            </div>
          </div>
        )}

        <div className="pt-3 flex items-center justify-end gap-2 border-t border-[#E5E7EB]">
          <Button variant="ghost" type="button" onClick={onClose} className="text-slate-600 hover:text-black font-bold">
            Cancel
          </Button>
          {isDeleteMode ? (
            <Button
              type="submit"
              variant="danger"
              isLoading={isSubmitting}
              leftIcon={Trash2}
              className="bg-red-600 hover:bg-red-700 text-white font-bold"
            >
              Delete Folder
            </Button>
          ) : (
            <Button
              type="submit"
              variant="primary"
              isLoading={isSubmitting}
              className="bg-[#4F39F6] hover:bg-[#4330d8] text-white font-bold"
            >
              {mode === 'create' ? 'Create Folder' : mode === 'edit' || mode === 'rename' ? 'Save Changes' : 'Move Assets'}
            </Button>
          )}
        </div>
      </form>
    </Modal>
  );
};
