import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ExternalLink,
  Palette,
  Edit2,
  Trash2,
  MoreVertical,
  Mail,
  Phone,
} from 'lucide-react';

export const ClientTable = ({
  clients = [],
  onEdit,
  onOpenBrandKit,
  onArchive,
  currentUser,
}) => {
  const navigate = useNavigate();
  const [activeMenuId, setActiveMenuId] = useState(null);

  const getInitials = (name) => {
    if (!name) return 'C';
    const parts = name.trim().split(' ').filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const isManagerOrAdmin =
    currentUser?.role === 'workspace_manager' ||
    currentUser?.role === 'superadmin' ||
    currentUser?.role === 'OWNER';

  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-[#F8F9FC] border-b border-gray-200 text-gray-500 font-semibold uppercase tracking-wider text-[10px]">
              <th className="py-3.5 px-4">Client & Company</th>
              <th className="py-3.5 px-4">Contact</th>
              <th className="py-3.5 px-4">Industry</th>
              <th className="py-3.5 px-4 text-center">Content</th>
              <th className="py-3.5 px-4 text-center">Approvals</th>
              <th className="py-3.5 px-4 text-center">Tasks</th>
              <th className="py-3.5 px-4">Assigned Team</th>
              <th className="py-3.5 px-4">Status</th>
              <th className="py-3.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {clients.map((client) => (
              <tr
                key={client.id}
                onClick={() => navigate(`/workspace/clients/${client.id}`)}
                className="hover:bg-[#F8F9FC]/60 transition-colors cursor-pointer group"
              >
                {/* Client & Logo */}
                <td className="py-3.5 px-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#F8F9FC] border border-gray-200 flex items-center justify-center font-bold text-[#4F39F6] text-sm shrink-0 overflow-hidden shadow-2xs">
                      {client.logoUrl ? (
                        <img
                          src={client.logoUrl}
                          alt={client.companyName || client.name}
                          className="w-full h-full object-contain p-1"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.style.display = 'none';
                          }}
                        />
                      ) : (
                        <span>{getInitials(client.companyName || client.name)}</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-gray-900 text-sm group-hover:text-[#4F39F6] transition-colors truncate">
                        {client.companyName || client.name}
                      </div>
                      <div className="text-gray-400 text-[11px] truncate">
                        {client.contactPerson || 'Client Rep'}
                      </div>
                    </div>
                  </div>
                </td>

                {/* Contact Info */}
                <td className="py-3.5 px-4 text-gray-600">
                  <div className="space-y-0.5 max-w-[180px]">
                    <div className="flex items-center gap-1.5 truncate text-gray-700">
                      <Mail className="w-3 h-3 text-gray-400 shrink-0" />
                      <span className="truncate">{client.email}</span>
                    </div>
                    {client.phone && (
                      <div className="flex items-center gap-1.5 truncate text-gray-500 text-[11px]">
                        <Phone className="w-3 h-3 text-gray-400 shrink-0" />
                        <span className="truncate">{client.phone}</span>
                      </div>
                    )}
                  </div>
                </td>

                {/* Industry */}
                <td className="py-3.5 px-4 text-gray-600">
                  {client.industry ? (
                    <span className="px-2.5 py-1 rounded-lg bg-gray-100 text-gray-700 font-medium text-[11px]">
                      {client.industry}
                    </span>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>

                {/* Content Count */}
                <td className="py-3.5 px-4 text-center font-bold text-gray-900">
                  {client.totalContentCount || 0}
                </td>

                {/* Approvals Count */}
                <td className="py-3.5 px-4 text-center">
                  <span
                    className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-bold ${
                      client.pendingApprovalsCount > 0
                        ? 'bg-amber-100 text-amber-800'
                        : 'text-gray-600'
                    }`}
                  >
                    {client.pendingApprovalsCount || 0}
                  </span>
                </td>

                {/* Tasks Count */}
                <td className="py-3.5 px-4 text-center font-semibold text-gray-800">
                  {client.totalTasksCount || 0}
                </td>

                {/* Team */}
                <td className="py-3.5 px-4">
                  <div className="flex items-center -space-x-1.5 overflow-hidden">
                    {client.assignedTeam && client.assignedTeam.length > 0 ? (
                      client.assignedTeam.slice(0, 3).map((member, idx) => (
                        <div
                          key={member.id || idx}
                          title={`${member.name} (${member.role || 'Member'})`}
                          className="w-6 h-6 rounded-full bg-white border-2 border-white flex items-center justify-center text-[9px] font-bold text-gray-700 shadow-2xs overflow-hidden shrink-0"
                        >
                          {member.avatar ? (
                            <img src={member.avatar} alt={member.name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="bg-[#4F39F6]/10 text-[#4F39F6] w-full h-full flex items-center justify-center">
                              {getInitials(member.name)}
                            </span>
                          )}
                        </div>
                      ))
                    ) : (
                      <span className="text-gray-400 text-[11px]">—</span>
                    )}
                    {client.assignedTeam && client.assignedTeam.length > 3 && (
                      <div className="w-6 h-6 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-[9px] font-semibold text-gray-500">
                        +{client.assignedTeam.length - 3}
                      </div>
                    )}
                  </div>
                </td>

                {/* Status */}
                <td className="py-3.5 px-4">
                  {client.status === 'Active' ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-600 border border-gray-200">
                      {client.status || 'Inactive'}
                    </span>
                  )}
                </td>

                {/* Actions */}
                <td className="py-3.5 px-4 text-right">
                  <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => navigate(`/workspace/clients/${client.id}`)}
                      className="p-1.5 text-gray-400 hover:text-[#4F39F6] hover:bg-[#4F39F6]/10 rounded-lg transition-colors cursor-pointer"
                      title="360 Client Hub"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => navigate(`/workspace/clients/${client.id}?tab=brandkit`)}
                      className="p-1.5 text-gray-400 hover:text-[#4F39F6] hover:bg-[#4F39F6]/10 rounded-lg transition-colors cursor-pointer"
                      title="Brand Kit"
                    >
                      <Palette className="w-4 h-4" />
                    </button>

                    {isManagerOrAdmin && onEdit && (
                      <button
                        type="button"
                        onClick={() => onEdit(client)}
                        className="p-1.5 text-gray-400 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                        title="Edit Client"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}

                    {isManagerOrAdmin && onArchive && (
                      <button
                        type="button"
                        onClick={() => onArchive(client)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        title="Archive Client"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
