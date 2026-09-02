import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Mail,
  Phone,
  FolderGit2,
  FileText,
  Clock,
  CheckCircle2,
  MoreVertical,
  Palette,
  ExternalLink,
  Edit2,
  Trash2,
  ShieldCheck,
  Globe,
} from 'lucide-react';

export const ClientCard = ({
  client,
  onEdit,
  onOpenBrandKit,
  onArchive,
  currentUser,
}) => {
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);

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
    <div
      onClick={() => navigate(`/workspace/clients/${client.id}`)}
      className="group relative bg-white border border-gray-200 hover:border-[#4F39F6]/40 hover:shadow-lg rounded-2xl p-5 transition-all duration-200 cursor-pointer flex flex-col justify-between"
    >
      {/* Top Header: Logo, Name & Quick Actions */}
      <div>
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-12 h-12 rounded-xl bg-[#F8F9FC] border border-gray-200 flex items-center justify-center font-bold text-[#4F39F6] text-base shrink-0 overflow-hidden shadow-xs">
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
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-gray-900 text-base truncate group-hover:text-[#4F39F6] transition-colors">
                  {client.companyName || client.name}
                </h3>
                {client.status === 'Active' ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Active
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-600 border border-gray-200">
                    {client.status || 'Inactive'}
                  </span>
                )}
              </div>

              {client.industry ? (
                <span className="text-xs text-gray-500 truncate block mt-0.5">
                  {client.industry}
                </span>
              ) : (
                <span className="text-xs text-gray-400 truncate block mt-0.5">
                  {client.contactPerson || 'Client Account'}
                </span>
              )}
            </div>
          </div>

          {/* Context Dropdown Menu */}
          <div
            className="relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowMenu(!showMenu)}
              className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowMenu(false)}
                />
                <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-xl shadow-xl border border-gray-100 py-1.5 z-50 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setShowMenu(false);
                      navigate(`/workspace/clients/${client.id}`);
                    }}
                    className="w-full px-3 py-2 text-left text-gray-700 hover:bg-[#F8F9FC] flex items-center gap-2 cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-[#4F39F6]" />
                    View 360 Hub
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowMenu(false);
                      navigate(`/workspace/clients/${client.id}?tab=brandkit`);
                    }}
                    className="w-full px-3 py-2 text-left text-gray-700 hover:bg-[#F8F9FC] flex items-center gap-2 cursor-pointer"
                  >
                    <Palette className="w-3.5 h-3.5 text-[#4F39F6]" />
                    Brand Kit
                  </button>

                  {isManagerOrAdmin && onEdit && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowMenu(false);
                        onEdit(client);
                      }}
                      className="w-full px-3 py-2 text-left text-gray-700 hover:bg-[#F8F9FC] flex items-center gap-2 cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-gray-500" />
                      Edit Client
                    </button>
                  )}

                  {isManagerOrAdmin && onArchive && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowMenu(false);
                        onArchive(client);
                      }}
                      className="w-full px-3 py-2 text-left text-red-600 hover:bg-red-50 flex items-center gap-2 border-t border-gray-100 mt-1 pt-1.5 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Archive Client
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Contact Info Snippet */}
        <div className="space-y-1.5 mb-4 text-xs text-gray-600 bg-[#F8F9FC] p-3 rounded-xl border border-gray-100">
          {client.email && (
            <div className="flex items-center gap-2 truncate">
              <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <span className="truncate">{client.email}</span>
            </div>
          )}
          {client.phone && (
            <div className="flex items-center gap-2 truncate">
              <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <span className="truncate">{client.phone}</span>
            </div>
          )}
          {client.website && (
            <div className="flex items-center gap-2 truncate">
              <Globe className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <a
                href={client.website.startsWith('http') ? client.website : `https://${client.website}`}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-[#4F39F6] hover:underline truncate"
              >
                {client.website.replace(/^https?:\/\//, '')}
              </a>
            </div>
          )}
        </div>

        {/* Real Metrics Grid */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="bg-white border border-gray-100 rounded-xl p-2 text-center shadow-2xs">
            <span className="text-[10px] uppercase font-semibold text-gray-400 block tracking-wider">
              Content
            </span>
            <span className="text-sm font-bold text-gray-900">
              {client.totalContentCount || 0}
            </span>
          </div>

          <div className="bg-white border border-gray-100 rounded-xl p-2 text-center shadow-2xs">
            <span className="text-[10px] uppercase font-semibold text-gray-400 block tracking-wider">
              Approvals
            </span>
            <span className={`text-sm font-bold ${client.pendingApprovalsCount > 0 ? 'text-amber-600' : 'text-gray-900'}`}>
              {client.pendingApprovalsCount || 0}
            </span>
          </div>

          <div className="bg-white border border-gray-100 rounded-xl p-2 text-center shadow-2xs">
            <span className="text-[10px] uppercase font-semibold text-gray-400 block tracking-wider">
              Tasks
            </span>
            <span className="text-sm font-bold text-gray-900">
              {client.totalTasksCount || 0}
            </span>
          </div>
        </div>
      </div>

      {/* Footer: Assigned Team & Action Button */}
      <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-3">
        {/* Team Avatars */}
        <div className="flex items-center -space-x-2 overflow-hidden">
          {client.assignedTeam && client.assignedTeam.length > 0 ? (
            client.assignedTeam.slice(0, 4).map((member, idx) => (
              <div
                key={member.id || idx}
                title={`${member.name} (${member.role || 'Member'})`}
                className="w-7 h-7 rounded-full bg-white border-2 border-white flex items-center justify-center text-[10px] font-bold text-gray-700 shadow-xs overflow-hidden shrink-0"
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
            <span className="text-[11px] text-gray-400">No team assigned</span>
          )}
          {client.assignedTeam && client.assignedTeam.length > 4 && (
            <div className="w-7 h-7 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-[10px] font-semibold text-gray-500 shadow-xs">
              +{client.assignedTeam.length - 4}
            </div>
          )}
        </div>

        {/* View Details CTA */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/workspace/clients/${client.id}`);
          }}
          className="px-3 py-1.5 text-xs font-semibold text-[#4F39F6] bg-[#4F39F6]/10 hover:bg-[#4F39F6] hover:text-white rounded-lg transition-all duration-150 flex items-center gap-1 cursor-pointer"
        >
          <span>360 Hub</span>
          <ExternalLink className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};
