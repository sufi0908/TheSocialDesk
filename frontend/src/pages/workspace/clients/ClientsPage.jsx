import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Plus,
  Search,
  Filter,
  LayoutGrid,
  List,
  ShieldCheck,
  Palette,
  FileText,
  CheckSquare,
  Users,
  Sparkles,
  Loader2,
  Copy,
  Check,
  X,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { clientService } from '../../../services/clientService';
import { useAuth } from '../../../hooks/useAuth';
import { ClientCard } from '../../../components/clients/ClientCard';
import { ClientTable } from '../../../components/clients/ClientTable';
import { CreateClientModal } from '../../../components/clients/CreateClientModal';
import { EditClientModal } from '../../../components/clients/EditClientModal';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';

export const ClientsPage = () => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Search & Filter & View
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'

  // Modals & Actions
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedClientForEdit, setSelectedClientForEdit] = useState(null);
  const [clientToArchive, setClientToArchive] = useState(null);
  const [isArchiving, setIsArchiving] = useState(false);
  const [newClientCredentials, setNewClientCredentials] = useState(null);
  const [copiedKey, setCopiedKey] = useState(false);

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await clientService.getAllClients();
      setClients(data);
    } catch (err) {
      setError(err.message || 'Failed to load clients.');
    } finally {
      setLoading(false);
    }
  };

  const handleArchiveClient = async () => {
    if (!clientToArchive) return;
    try {
      setIsArchiving(true);
      await clientService.deleteClient(clientToArchive.id);
      setClientToArchive(null);
      await loadClients();
    } catch (err) {
      setError(err.message || 'Failed to archive client.');
    } finally {
      setIsArchiving(false);
    }
  };

  const handleCopyCredentials = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const isManagerOrAdmin =
    currentUser?.role === 'workspace_manager' ||
    currentUser?.role === 'superadmin' ||
    currentUser?.role === 'OWNER';

  // Filter clients
  const filteredClients = clients.filter((c) => {
    const q = search.toLowerCase().trim();
    const matchesSearch =
      !q ||
      (c.companyName && c.companyName.toLowerCase().includes(q)) ||
      (c.name && c.name.toLowerCase().includes(q)) ||
      (c.email && c.email.toLowerCase().includes(q)) ||
      (c.contactPerson && c.contactPerson.toLowerCase().includes(q)) ||
      (c.industry && c.industry.toLowerCase().includes(q));

    const matchesStatus =
      statusFilter === 'All' ||
      (statusFilter === 'Active' && (c.status === 'Active' || c.status === 'ACTIVE')) ||
      (statusFilter === 'Inactive' && (c.status === 'Inactive' || c.status === 'INACTIVE')) ||
      (statusFilter === 'Archived' && (c.status === 'Archived' || c.status === 'ARCHIVED'));

    return matchesSearch && matchesStatus;
  });

  // Aggregated Stats for top cards
  const totalClientsCount = clients.length;
  const activeClientsCount = clients.filter((c) => c.status === 'Active').length;
  const pendingApprovalsTotal = clients.reduce((acc, c) => acc + (c.pendingApprovalsCount || 0), 0);
  const totalContentCount = clients.reduce((acc, c) => acc + (c.totalContentCount || 0), 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-in fade-in duration-150">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#4F39F6] bg-[#4F39F6]/10 px-3 py-1 rounded-full border border-[#4F39F6]/20 mb-2">
            <Building2 className="w-3.5 h-3.5" />
            <span>Clients & Brand Portfolios Center</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
            Clients Directory & Brand Kits
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Centralized client accounts, official brand kits, content approvals & 360° portfolio hubs.
          </p>
        </div>

        {isManagerOrAdmin && (
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4.5 py-2.5 bg-[#4F39F6] hover:bg-[#4330D9] text-white font-semibold text-xs rounded-xl transition-all duration-150 flex items-center gap-2 shadow-xs cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Client</span>
          </button>
        )}
      </div>

      {/* Top 4 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-gray-500">Total Clients</span>
            <h3 className="text-2xl font-bold text-gray-900 mt-1">{totalClientsCount}</h3>
            <span className="text-[11px] text-gray-400">In this workspace</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#4F39F6]/10 text-[#4F39F6] flex items-center justify-center font-bold">
            <Building2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-gray-500">Active Accounts</span>
            <h3 className="text-2xl font-bold text-emerald-600 mt-1">{activeClientsCount}</h3>
            <span className="text-[11px] text-gray-400">Currently active</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <ShieldCheck className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-gray-500">Pending Approvals</span>
            <h3 className={`text-2xl font-bold mt-1 ${pendingApprovalsTotal > 0 ? 'text-amber-600' : 'text-gray-900'}`}>
              {pendingApprovalsTotal}
            </h3>
            <span className="text-[11px] text-gray-400">Waiting client review</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <FileText className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-gray-500">Total Deliverables</span>
            <h3 className="text-2xl font-bold text-[#4F39F6] mt-1">{totalContentCount}</h3>
            <span className="text-[11px] text-gray-400">Across all clients</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#4F39F6]/10 text-[#4F39F6] flex items-center justify-center font-bold">
            <Sparkles className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* New Client Credentials Banner (When Created) */}
      {newClientCredentials && (
        <div className="p-4.5 rounded-2xl bg-white border border-[#4F39F6] shadow-lg space-y-3 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-bold text-gray-900">
              <ShieldCheck className="w-5 h-5 text-[#4F39F6]" />
              <span>Client Portal Account Created</span>
            </div>
            <button
              type="button"
              onClick={() => setNewClientCredentials(null)}
              className="text-gray-400 hover:text-gray-700 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-gray-600">
            Share these login details with <strong>{newClientCredentials.companyName}</strong> so they can access their portal:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-[#F8F9FC] p-3 rounded-xl border border-gray-200 text-xs">
            <div>
              <span className="text-[10px] text-gray-400 uppercase font-bold block">Email</span>
              <span className="font-semibold text-gray-900">{newClientCredentials.email}</span>
            </div>
            <div>
              <span className="text-[10px] text-gray-400 uppercase font-bold block">Temporary Password</span>
              <span className="font-mono font-bold text-[#4F39F6]">
                {newClientCredentials.password || 'Client#123456!'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] text-gray-400 uppercase font-bold block">Action</span>
                <button
                  type="button"
                  onClick={() =>
                    handleCopyCredentials(
                      `Email: ${newClientCredentials.email}\nPassword: ${newClientCredentials.password || 'Client#123456!'}`
                    )
                  }
                  className="text-xs font-semibold text-[#4F39F6] hover:underline flex items-center gap-1 mt-0.5"
                >
                  {copiedKey ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey ? 'Copied Details!' : 'Copy Credentials'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search, Filter & View Controls Bar */}
      <div className="bg-white border border-gray-200 rounded-2xl p-3 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search clients by name, contact, email or industry..."
            className="w-full pl-10 pr-4 py-2 text-xs bg-[#F8F9FC] border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#4F39F6]/20 focus:border-[#4F39F6] transition-all text-gray-900"
          />
        </div>

        {/* Status Filter & View Mode Toggle */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex items-center gap-1 bg-[#F8F9FC] p-1 rounded-xl border border-gray-200">
            {['All', 'Active', 'Inactive'].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  statusFilter === st
                    ? 'bg-white text-gray-900 shadow-2xs font-bold'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 bg-[#F8F9FC] p-1 rounded-xl border border-gray-200">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-white text-[#4F39F6] shadow-2xs'
                  : 'text-gray-400 hover:text-gray-700'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-white text-[#4F39F6] shadow-2xs'
                  : 'text-gray-400 hover:text-gray-700'
              }`}
              title="Table View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* CLIENTS CONTENT AREA */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-gray-400 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#4F39F6]" />
          <p className="text-xs font-medium">Loading Clients Directory...</p>
        </div>
      ) : filteredClients.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-2xl border border-gray-200 shadow-xs space-y-3">
          <Building2 className="w-10 h-10 text-gray-300 mx-auto" />
          <h3 className="text-sm font-bold text-gray-800">No Clients Found</h3>
          <p className="text-xs text-gray-400 max-w-sm mx-auto">
            {search || statusFilter !== 'All'
              ? 'No client records match your search criteria. Try adjusting the search query or status filter.'
              : 'Start by creating your first client account to manage their deliverables and brand portfolio.'}
          </p>
          {isManagerOrAdmin && (
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#4F39F6] hover:bg-[#4330D9] rounded-xl transition-colors inline-flex items-center gap-1.5 shadow-2xs mt-2"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Client
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredClients.map((client) => (
            <ClientCard
              key={client.id}
              client={client}
              currentUser={currentUser}
              onEdit={(c) => {
                setSelectedClientForEdit(c);
                setIsEditModalOpen(true);
              }}
              onArchive={(c) => setClientToArchive(c)}
            />
          ))}
        </div>
      ) : (
        <ClientTable
          clients={filteredClients}
          currentUser={currentUser}
          onEdit={(c) => {
            setSelectedClientForEdit(c);
            setIsEditModalOpen(true);
          }}
          onArchive={(c) => setClientToArchive(c)}
        />
      )}

      {/* CREATE CLIENT MODAL */}
      {isCreateModalOpen && (
        <CreateClientModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={(result) => {
            if (result?.temporaryPassword) {
              setNewClientCredentials({
                companyName: result.client?.name || result.client?.companyName,
                email: result.client?.email,
                password: result.temporaryPassword,
              });
            }
            loadClients();
          }}
        />
      )}

      {/* EDIT CLIENT MODAL */}
      {isEditModalOpen && selectedClientForEdit && (
        <EditClientModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedClientForEdit(null);
          }}
          client={selectedClientForEdit}
          onSuccess={() => {
            loadClients();
          }}
        />
      )}

      {/* ARCHIVE CONFIRM DIALOG */}
      {clientToArchive && (
        <ConfirmDialog
          isOpen={!!clientToArchive}
          onClose={() => setClientToArchive(null)}
          onConfirm={handleArchiveClient}
          title={`Archive ${clientToArchive.companyName || clientToArchive.name}?`}
          message="Archiving will hide this client from the active directory. All past content, assets, and tasks will be safely preserved in MySQL."
          confirmText="Archive Client"
          isLoading={isArchiving}
        />
      )}
    </div>
  );
};
