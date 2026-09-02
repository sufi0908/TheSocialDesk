import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  Building2,
  ArrowLeft,
  Mail,
  Phone,
  Globe,
  MapPin,
  Calendar,
  Layers,
  FileText,
  FolderGit2,
  CheckSquare,
  ShieldCheck,
  Palette,
  Users,
  Activity,
  MoreVertical,
  Edit2,
  Plus,
  ExternalLink,
  Clock,
  CheckCircle2,
  AlertCircle,
  FolderOpen,
  Loader2,
  Sparkles,
  Share2,
  MessageCircle,
  Image as ImageIcon,
  Copy,
  Check,
  Briefcase,
  TrendingUp,
} from 'lucide-react';
import { clientService } from '../../../services/clientService';
import { useAuth } from '../../../hooks/useAuth';
import { BrandKitTab } from '../../../components/clients/BrandKitTab';
import { EditClientModal } from '../../../components/clients/EditClientModal';

const InstagramIcon = (props) => (
  <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
  </svg>
);

const FacebookIcon = (props) => (
  <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
  </svg>
);

const LinkedinIcon = (props) => (
  <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/>
    <rect width="4" height="12" x="2" y="9"/>
    <circle cx="4" cy="4" r="2"/>
  </svg>
);

const TwitterIcon = (props) => (
  <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"/>
  </svg>
);

const YoutubeIcon = (props) => (
  <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17"/>
    <path d="m10 15 5-3-5-3z"/>
  </svg>
);

export const ClientDetailsPage = () => {
  const { clientId, section } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user: currentUser } = useAuth();

  // Normalize active tab from section parameter or query param
  const normalizeTab = (raw) => {
    if (!raw) return 'overview';
    const s = String(raw).toLowerCase().trim();
    if (s === '360' || s === 'hub' || s === 'overview') return 'overview';
    if (s === 'brand-kit' || s === 'brandkit') return 'brandkit';
    if (s === 'content') return 'content';
    if (s === 'calendar' || s === 'schedule') return 'calendar';
    if (s === 'tasks' || s === 'todo') return 'tasks';
    if (s === 'projects') return 'projects';
    if (s === 'assets' || s === 'media') return 'assets';
    if (s === 'team' || s === 'members') return 'team';
    if (s === 'activity' || s === 'audit') return 'activity';
    return s;
  };

  const initialTab = normalizeTab(section || searchParams.get('tab'));
  const [activeTab, setActiveTab] = useState(initialTab);
  const [client, setClient] = useState(null);
  const [overviewData, setOverviewData] = useState(null);
  const [tabData, setTabData] = useState({
    content: [],
    projects: [],
    tasks: [],
    assets: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [contentFilter, setContentFilter] = useState('ALL');

  useEffect(() => {
    const nextTab = normalizeTab(section || searchParams.get('tab'));
    if (nextTab !== activeTab) {
      setActiveTab(nextTab);
    }
  }, [section, searchParams]);

  useEffect(() => {
    if (clientId) {
      loadClientData();
    }
  }, [clientId]);

  useEffect(() => {
    if (client) {
      loadTabData(activeTab);
    }
  }, [activeTab, client]);

  const handleTabChange = (tabKey) => {
    setActiveTab(tabKey);
    navigate(`/workspace/clients/${clientId}/${tabKey === 'brandkit' ? 'brand-kit' : tabKey}`, { replace: true });
  };

  const loadClientData = async () => {
    try {
      setLoading(true);
      setError('');
      const clientRes = await clientService.getClientById(clientId);
      setClient(clientRes);

      const overviewRes = await clientService.getClientOverview(clientId);
      setOverviewData(overviewRes);
    } catch (err) {
      setError(err.message || 'Failed to load client details.');
    } finally {
      setLoading(false);
    }
  };

  const loadTabData = async (tab) => {
    try {
      if (tab === 'content' || tab === 'calendar') {
        const content = await clientService.getClientContent(clientId);
        setTabData((prev) => ({ ...prev, content }));
      } else if (tab === 'projects') {
        const projects = await clientService.getClientProjects(clientId);
        setTabData((prev) => ({ ...prev, projects }));
      } else if (tab === 'tasks') {
        const tasks = await clientService.getClientTasks(clientId);
        setTabData((prev) => ({ ...prev, tasks }));
      } else if (tab === 'assets') {
        const assets = await clientService.getClientAssets(clientId);
        setTabData((prev) => ({ ...prev, assets }));
      }
    } catch (e) {
      console.warn('Tab data fetch error:', e.message);
    }
  };

  const getInitials = (name) => {
    if (!name) return 'C';
    const parts = name.trim().split(' ').filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const formatExternalUrl = (url) => {
    if (!url) return '';
    return url.startsWith('http://') || url.startsWith('https://') ? url : `https://${url}`;
  };

  if (loading && !client) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-[#4F39F6]" />
        <p className="text-xs font-semibold text-gray-500">Loading Client 360 Hub...</p>
      </div>
    );
  }

  if (error && !client) {
    return (
      <div className="p-8 max-w-lg mx-auto text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 mx-auto flex items-center justify-center">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-gray-900">Unable to Load Client</h2>
        <p className="text-xs text-gray-500">{error}</p>
        <button
          onClick={() => navigate('/workspace/clients')}
          className="px-4 py-2 text-xs font-semibold text-white bg-[#4F39F6] rounded-xl hover:bg-[#4330D9] transition-colors cursor-pointer"
        >
          Return to Clients Directory
        </button>
      </div>
    );
  }

  const isManagerOrAdmin =
    currentUser?.role === 'workspace_manager' ||
    currentUser?.role === 'superadmin' ||
    currentUser?.role === 'OWNER';

  const socialLinks = client?.socialProfiles || overviewData?.brandKit?.socialProfiles || {};

  const tabs = [
    { key: 'overview', label: 'Overview (360 Hub)', icon: Layers },
    { key: 'content', label: 'Content', count: overviewData?.metrics?.content?.total || client?.totalContentCount, icon: FileText },
    { key: 'calendar', label: 'Calendar', count: overviewData?.metrics?.content?.scheduled || client?.scheduledContentCount, icon: Calendar },
    { key: 'tasks', label: 'Tasks', count: overviewData?.metrics?.tasks?.total || client?.totalTasksCount, icon: CheckSquare },
    { key: 'projects', label: 'Projects', count: overviewData?.metrics?.projects?.total || client?.activeProjectsCount, icon: FolderGit2 },
    { key: 'assets', label: 'Assets', icon: FolderOpen },
    { key: 'brandkit', label: 'Official Brand Kit', icon: Palette, highlight: true },
    { key: 'team', label: 'Assigned Team', count: client?.assignedTeam?.length || 0, icon: Users },
    { key: 'activity', label: 'Activity Log', icon: Activity },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-in fade-in duration-150">
      {/* Top Breadcrumbs */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <button
            type="button"
            onClick={() => navigate('/workspace/clients')}
            className="hover:text-gray-900 font-medium flex items-center gap-1 cursor-pointer transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Clients Directory</span>
          </button>
          <span>/</span>
          <span className="font-semibold text-gray-900 truncate">
            {client?.companyName || client?.name}
          </span>
          <span>/</span>
          <span className="text-[#4F39F6] font-medium capitalize">
            {tabs.find((t) => t.key === activeTab)?.label || activeTab}
          </span>
        </div>

        {isManagerOrAdmin && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsEditModalOpen(true)}
              className="px-3.5 py-1.5 text-xs font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <Edit2 className="w-3.5 h-3.5" />
              Edit Profile
            </button>
            <button
              type="button"
              onClick={() => handleTabChange('brandkit')}
              className="px-3.5 py-1.5 text-xs font-semibold text-[#4F39F6] bg-[#4F39F6]/10 hover:bg-[#4F39F6]/20 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Palette className="w-3.5 h-3.5" />
              Brand Kit
            </button>
          </div>
        )}
      </div>

      {/* 360 SaaS Hero Profile Header */}
      <div className="bg-white border border-gray-200 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          {/* Left: Avatar & Identity */}
          <div className="flex items-center gap-5 min-w-0">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-[#F8F9FC] border-2 border-gray-200 flex items-center justify-center font-bold text-[#4F39F6] text-2xl sm:text-3xl shrink-0 overflow-hidden shadow-xs">
              {client?.logoUrl ? (
                <img
                  src={client.logoUrl}
                  alt={client.companyName || client.name}
                  className="w-full h-full object-contain p-2"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.style.display = 'none';
                  }}
                />
              ) : (
                <span>{getInitials(client?.companyName || client?.name)}</span>
              )}
            </div>

            <div className="space-y-1.5 min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
                  {client?.companyName || client?.name}
                </h1>
                {client?.status === 'Active' ? (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Active Client
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-gray-100 text-gray-600 border border-gray-200">
                    {client?.status || 'Inactive'}
                  </span>
                )}
              </div>

              {client?.tagline && (
                <p className="text-xs font-medium text-gray-500 italic">
                  "{client.tagline}"
                </p>
              )}

              <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-gray-500">
                {client?.industry && (
                  <span className="font-semibold text-gray-700 bg-gray-100 px-2 py-0.5 rounded-md">
                    {client.industry}
                  </span>
                )}
                {client?.contactPerson && (
                  <span>
                    Contact: <strong className="text-gray-800">{client.contactPerson}</strong>
                  </span>
                )}
                {client?.email && (
                  <div className="flex items-center gap-1 text-gray-600">
                    <Mail className="w-3.5 h-3.5 text-gray-400" />
                    <span>{client.email}</span>
                  </div>
                )}
                {client?.phone && (
                  <div className="flex items-center gap-1 text-gray-600">
                    <Phone className="w-3.5 h-3.5 text-gray-400" />
                    <span>{client.phone}</span>
                  </div>
                )}
                {client?.whatsapp && (
                  <div className="flex items-center gap-1 text-emerald-600 font-medium">
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>{client.whatsapp}</span>
                  </div>
                )}
                {client?.city && (
                  <div className="flex items-center gap-1 text-gray-500">
                    <MapPin className="w-3.5 h-3.5 text-gray-400" />
                    <span>{client.city}{client.country ? `, ${client.country}` : ''}</span>
                  </div>
                )}
                {client?.website && (
                  <div className="flex items-center gap-1 text-[#4F39F6]">
                    <Globe className="w-3.5 h-3.5 text-[#4F39F6]" />
                    <a
                      href={formatExternalUrl(client.website)}
                      target="_blank"
                      rel="noreferrer"
                      className="hover:underline font-medium"
                    >
                      {client.website.replace(/^https?:\/\//, '')}
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Quick Metrics summary */}
          <div className="flex items-center gap-3 bg-[#F8F9FC] p-3.5 rounded-2xl border border-gray-100 self-stretch md:self-auto justify-around sm:justify-end">
            <div className="text-center px-3">
              <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">
                Content
              </span>
              <span className="text-lg font-bold text-gray-900">
                {overviewData?.metrics?.content?.total ?? client?.totalContentCount ?? 0}
              </span>
            </div>
            <div className="h-8 w-px bg-gray-200" />
            <div className="text-center px-3">
              <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">
                Approvals
              </span>
              <span className={`text-lg font-bold ${(overviewData?.metrics?.content?.pendingApproval || client?.pendingApprovalsCount) > 0 ? 'text-amber-600' : 'text-gray-900'}`}>
                {overviewData?.metrics?.content?.pendingApproval ?? client?.pendingApprovalsCount ?? 0}
              </span>
            </div>
            <div className="h-8 w-px bg-gray-200" />
            <div className="text-center px-3">
              <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">
                Tasks
              </span>
              <span className="text-lg font-bold text-gray-900">
                {overviewData?.metrics?.tasks?.total ?? client?.totalTasksCount ?? 0}
              </span>
            </div>
          </div>
        </div>

        {/* Social Links Row */}
        <div className="pt-4 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] uppercase font-bold text-gray-400 mr-1">
              Social Profiles:
            </span>

            {socialLinks.instagram && (
              <a
                href={formatExternalUrl(socialLinks.instagram.startsWith('@') ? `https://instagram.com/${socialLinks.instagram.slice(1)}` : socialLinks.instagram)}
                target="_blank"
                rel="noreferrer"
                className="px-2.5 py-1 rounded-lg bg-[#F8F9FC] hover:bg-white hover:text-[#4F39F6] border border-gray-200 transition-colors flex items-center gap-1.5 text-gray-700 font-medium"
              >
                <InstagramIcon className="text-pink-600" />
                <span>Instagram</span>
              </a>
            )}

            {socialLinks.facebook && (
              <a
                href={formatExternalUrl(socialLinks.facebook)}
                target="_blank"
                rel="noreferrer"
                className="px-2.5 py-1 rounded-lg bg-[#F8F9FC] hover:bg-white hover:text-[#4F39F6] border border-gray-200 transition-colors flex items-center gap-1.5 text-gray-700 font-medium"
              >
                <FacebookIcon className="text-blue-600" />
                <span>Facebook</span>
              </a>
            )}

            {socialLinks.tiktok && (
              <a
                href={formatExternalUrl(socialLinks.tiktok.startsWith('@') ? `https://tiktok.com/@${socialLinks.tiktok.slice(1)}` : socialLinks.tiktok)}
                target="_blank"
                rel="noreferrer"
                className="px-2.5 py-1 rounded-lg bg-[#F8F9FC] hover:bg-white hover:text-[#4F39F6] border border-gray-200 transition-colors flex items-center gap-1.5 text-gray-700 font-medium"
              >
                <Share2 className="w-3.5 h-3.5 text-black" />
                <span>TikTok</span>
              </a>
            )}

            {socialLinks.linkedin && (
              <a
                href={formatExternalUrl(socialLinks.linkedin)}
                target="_blank"
                rel="noreferrer"
                className="px-2.5 py-1 rounded-lg bg-[#F8F9FC] hover:bg-white hover:text-[#4F39F6] border border-gray-200 transition-colors flex items-center gap-1.5 text-gray-700 font-medium"
              >
                <LinkedinIcon className="text-sky-600" />
                <span>LinkedIn</span>
              </a>
            )}

            {socialLinks.twitter && (
              <a
                href={formatExternalUrl(socialLinks.twitter)}
                target="_blank"
                rel="noreferrer"
                className="px-2.5 py-1 rounded-lg bg-[#F8F9FC] hover:bg-white hover:text-[#4F39F6] border border-gray-200 transition-colors flex items-center gap-1.5 text-gray-700 font-medium"
              >
                <TwitterIcon className="text-slate-800" />
                <span>X / Twitter</span>
              </a>
            )}

            {socialLinks.youtube && (
              <a
                href={formatExternalUrl(socialLinks.youtube)}
                target="_blank"
                rel="noreferrer"
                className="px-2.5 py-1 rounded-lg bg-[#F8F9FC] hover:bg-white hover:text-[#4F39F6] border border-gray-200 transition-colors flex items-center gap-1.5 text-gray-700 font-medium"
              >
                <YoutubeIcon className="text-red-600" />
                <span>YouTube</span>
              </a>
            )}

            {client?.website && (
              <a
                href={formatExternalUrl(client.website)}
                target="_blank"
                rel="noreferrer"
                className="px-2.5 py-1 rounded-lg bg-[#F8F9FC] hover:bg-white hover:text-[#4F39F6] border border-gray-200 transition-colors flex items-center gap-1.5 text-gray-700 font-medium"
              >
                <Globe className="w-3.5 h-3.5 text-[#4F39F6]" />
                <span>Website</span>
              </a>
            )}

            {socialLinks.customUrl && (
              <a
                href={formatExternalUrl(socialLinks.customUrl)}
                target="_blank"
                rel="noreferrer"
                className="px-2.5 py-1 rounded-lg bg-[#F8F9FC] hover:bg-white hover:text-[#4F39F6] border border-gray-200 transition-colors flex items-center gap-1.5 text-gray-700 font-medium"
              >
                <ExternalLink className="w-3.5 h-3.5 text-indigo-500" />
                <span>Custom Link</span>
              </a>
            )}

            {!Object.values(socialLinks).some(Boolean) && (
              <span className="text-gray-400 text-xs italic">
                No social profiles linked yet.
              </span>
            )}
          </div>

          {isManagerOrAdmin && (
            <button
              type="button"
              onClick={() => setIsEditModalOpen(true)}
              className="text-xs text-[#4F39F6] font-semibold hover:underline cursor-pointer"
            >
              + Edit Social Links
            </button>
          )}
        </div>
      </div>

      {/* 9-Tab Navigation Bar */}
      <div className="bg-white border border-gray-200 rounded-2xl p-1.5 shadow-xs overflow-x-auto">
        <div className="flex items-center gap-1 min-w-max">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => handleTabChange(tab.key)}
                className={`px-3.5 py-2 text-xs font-semibold rounded-xl transition-all duration-150 flex items-center gap-2 cursor-pointer ${
                  isActive
                    ? 'bg-[#4F39F6] text-white shadow-xs'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-[#F8F9FC]'
                } ${tab.highlight && !isActive ? 'text-[#4F39F6] bg-[#4F39F6]/5' : ''}`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : tab.highlight ? 'text-[#4F39F6]' : 'text-gray-400'}`} />
                <span>{tab.label}</span>
                {tab.count !== undefined && tab.count > 0 && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* TAB 1: OVERVIEW (360 HUB) */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Key Metrics Grid (9 Cards in SaaS Grid) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-xs">
              <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">Total Content</span>
              <h3 className="text-xl font-bold text-gray-900 mt-1">{overviewData?.metrics?.content?.total || 0}</h3>
              <span className="text-[10px] text-gray-400">{overviewData?.metrics?.content?.published || 0} published</span>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-xs">
              <span className="text-[10px] uppercase font-bold text-amber-600 block tracking-wider">Pending Review</span>
              <h3 className="text-xl font-bold text-amber-600 mt-1">{overviewData?.metrics?.content?.pendingApproval || 0}</h3>
              <span className="text-[10px] text-gray-400">Waiting client sign-off</span>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-xs">
              <span className="text-[10px] uppercase font-bold text-emerald-600 block tracking-wider">Approved Posts</span>
              <h3 className="text-xl font-bold text-emerald-600 mt-1">{overviewData?.metrics?.content?.approved || 0}</h3>
              <span className="text-[10px] text-gray-400">Ready for scheduling</span>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-xs">
              <span className="text-[10px] uppercase font-bold text-[#4F39F6] block tracking-wider">Scheduled Queue</span>
              <h3 className="text-xl font-bold text-[#4F39F6] mt-1">{overviewData?.metrics?.content?.scheduled || 0}</h3>
              <span className="text-[10px] text-gray-400">Queued in calendar</span>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-xs">
              <span className="text-[10px] uppercase font-bold text-gray-500 block tracking-wider">Active Tasks</span>
              <h3 className="text-xl font-bold text-gray-900 mt-1">{overviewData?.metrics?.tasks?.open || 0}</h3>
              <span className="text-[10px] text-gray-400">{overviewData?.metrics?.tasks?.completed || 0} completed</span>
            </div>
          </div>

          {/* Middle 2-Column: Recent Content & Upcoming Deadlines */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Recent Client Content */}
            <div className="lg:col-span-2 bg-white border border-gray-200 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#4F39F6]" />
                  Recent Client Deliverables
                </h3>
                <button
                  type="button"
                  onClick={() => handleTabChange('content')}
                  className="text-xs text-[#4F39F6] font-semibold hover:underline cursor-pointer"
                >
                  View All Content →
                </button>
              </div>

              {overviewData?.recentContent && overviewData.recentContent.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {overviewData.recentContent.slice(0, 4).map((post) => (
                    <div
                      key={post.id}
                      onClick={() => navigate(`/workspace/content?openId=${post.id}`)}
                      className="p-3 rounded-xl border border-gray-200 bg-[#F8F9FC] hover:bg-white hover:border-[#4F39F6]/40 transition-all cursor-pointer space-y-2 flex flex-col justify-between"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-semibold text-xs text-gray-900 line-clamp-1">{post.title}</h4>
                        <span className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-white border border-gray-200 text-gray-700 shrink-0">
                          {post.status}
                        </span>
                      </div>
                      {post.caption && (
                        <p className="text-[11px] text-gray-500 line-clamp-2">{post.caption}</p>
                      )}
                      <div className="flex items-center justify-between pt-1 border-t border-gray-200 text-[10px] text-gray-400">
                        <span>{post.content_type || 'POST'}</span>
                        <span>{new Date(post.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center bg-[#F8F9FC] rounded-xl text-gray-400 text-xs">
                  No deliverables created for this client yet.
                </div>
              )}
            </div>

            {/* Right Col: Brand Kit Quick Preview */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                    <Palette className="w-4 h-4 text-[#4F39F6]" />
                    Brand Palette
                  </h3>
                  <button
                    type="button"
                    onClick={() => handleTabChange('brandkit')}
                    className="text-xs text-[#4F39F6] font-semibold hover:underline"
                  >
                    Open Kit →
                  </button>
                </div>

                <p className="text-xs text-gray-500 mb-4">
                  {overviewData?.brandKit?.tagline || 'Official Brand Colors & Typography.'}
                </p>

                {/* Swatches Row */}
                <div className="flex items-center gap-2 mb-4">
                  {(overviewData?.brandKit?.colors || ['#4F39F6', '#000000', '#FFFFFF']).map((c, i) => (
                    <div
                      key={i}
                      className="w-8 h-8 rounded-lg border border-black/10 shadow-2xs"
                      style={{ backgroundColor: c }}
                      title={c}
                    />
                  ))}
                </div>

                <div className="p-3 rounded-xl bg-[#F8F9FC] border border-gray-100 text-xs space-y-1">
                  <span className="text-gray-400 text-[10px] uppercase font-bold block">
                    Font Family
                  </span>
                  <span className="font-semibold text-gray-800">
                    {overviewData?.brandKit?.fontFamily || 'Inter, sans-serif'}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleTabChange('brandkit')}
                className="w-full py-2 text-xs font-semibold text-[#4F39F6] bg-[#4F39F6]/10 hover:bg-[#4F39F6] hover:text-white rounded-xl transition-colors text-center cursor-pointer"
              >
                Manage Official Brand Kit
              </button>
            </div>
          </div>

          {/* Lower 2-Column: Recent Tasks & Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Tasks */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-[#4F39F6]" />
                  Active Tasks
                </h3>
                <button
                  type="button"
                  onClick={() => handleTabChange('tasks')}
                  className="text-xs text-[#4F39F6] font-semibold hover:underline"
                >
                  All Tasks →
                </button>
              </div>

              {overviewData?.recentTasks && overviewData.recentTasks.length > 0 ? (
                <div className="divide-y divide-gray-100">
                  {overviewData.recentTasks.slice(0, 4).map((task) => (
                    <div
                      key={task.id}
                      onClick={() => navigate(`/workspace/tasks?taskId=${task.id}`)}
                      className="py-2.5 flex items-center justify-between gap-3 hover:bg-[#F8F9FC] px-2 rounded-lg transition-colors cursor-pointer"
                    >
                      <div className="min-w-0">
                        <h4 className="text-xs font-semibold text-gray-900 truncate">{task.title}</h4>
                        <span className="text-[10px] text-gray-400">
                          {task.assignee_name ? `Assigned to ${task.assignee_name}` : 'Unassigned'}
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#4F39F6]/10 text-[#4F39F6]">
                        {task.status}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center bg-[#F8F9FC] rounded-xl text-gray-400 text-xs">
                  No active tasks for this client.
                </div>
              )}
            </div>

            {/* Audit & Activity Stream */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#4F39F6]" />
                Recent Audit Trail
              </h3>

              {overviewData?.recentActivity && overviewData.recentActivity.length > 0 ? (
                <div className="divide-y divide-gray-100">
                  {overviewData.recentActivity.slice(0, 4).map((act) => (
                    <div key={act.id} className="py-2.5 flex items-start gap-3 text-xs">
                      <div className="w-7 h-7 rounded-lg bg-[#F8F9FC] border border-gray-200 flex items-center justify-center font-bold text-[#4F39F6] text-[10px] shrink-0 mt-0.5">
                        {act.userName ? getInitials(act.userName) : 'SD'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-gray-800 font-medium">{act.description}</p>
                        <span className="text-[10px] text-gray-400">
                          {act.userName} • {new Date(act.timestamp).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center bg-[#F8F9FC] rounded-xl text-gray-400 text-xs">
                  No activity records found for this client.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CONTENT */}
      {activeTab === 'content' && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Client Content Deliverables</h3>
              <p className="text-xs text-gray-500">
                Filter and inspect posts created exclusively for {client?.companyName || client?.name}.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate(`/workspace/content?clientId=${clientId}`)}
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#4F39F6] hover:bg-[#4330D9] rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                Create Content
              </button>
            </div>
          </div>

          {/* Content Status Filter Badges */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {['ALL', 'CLIENT_REVIEW', 'APPROVED', 'SCHEDULED', 'PUBLISHED', 'DRAFT', 'REVISION_REQUIRED'].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setContentFilter(st)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  contentFilter === st
                    ? 'bg-[#4F39F6] text-white shadow-2xs'
                    : 'bg-[#F8F9FC] text-gray-600 hover:bg-gray-200/60'
                }`}
              >
                {st.replace('_', ' ')}
              </button>
            ))}
          </div>

          {tabData.content && tabData.content.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tabData.content
                .filter((item) => contentFilter === 'ALL' || item.status === contentFilter)
                .map((item) => (
                  <div
                    key={item.id}
                    onClick={() => navigate(`/workspace/content?openId=${item.id}`)}
                    className="p-4 rounded-xl border border-gray-200 bg-[#F8F9FC] hover:bg-white hover:border-[#4F39F6]/40 transition-all cursor-pointer flex flex-col justify-between space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-semibold text-gray-900 text-xs line-clamp-2">
                        {item.title}
                      </h4>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white border border-gray-200 text-gray-700 shrink-0">
                        {item.status}
                      </span>
                    </div>
                    {item.caption && (
                      <p className="text-[11px] text-gray-500 line-clamp-2">{item.caption}</p>
                    )}
                    <div className="pt-2 border-t border-gray-200 flex items-center justify-between text-[10px] text-gray-400">
                      <span>{item.content_type || 'POST'}</span>
                      <span>{new Date(item.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <div className="py-12 text-center bg-[#F8F9FC] rounded-xl text-gray-400 text-xs">
              No content items created for this client yet.
            </div>
          )}
        </div>
      )}

      {/* TAB 3: CALENDAR */}
      {activeTab === 'calendar' && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900">Client Scheduled Content</h3>
            <button
              onClick={() => navigate(`/workspace/calendar?clientId=${clientId}`)}
              className="px-3.5 py-1.5 text-xs font-semibold text-[#4F39F6] bg-[#4F39F6]/10 hover:bg-[#4F39F6]/20 rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
            >
              Full Calendar View →
            </button>
          </div>

          {tabData.content?.filter((c) => c.status === 'SCHEDULED').length > 0 ? (
            <div className="divide-y divide-gray-100">
              {tabData.content
                .filter((c) => c.status === 'SCHEDULED')
                .map((post) => (
                  <div key={post.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Calendar className="w-4 h-4 text-[#4F39F6]" />
                      <div>
                        <h4 className="text-xs font-semibold text-gray-900">{post.title}</h4>
                        <span className="text-[10px] text-gray-400">
                          {post.scheduled_publish_time ? new Date(post.scheduled_publish_time).toLocaleString() : 'Scheduled'}
                        </span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#4F39F6]/10 text-[#4F39F6]">
                      SCHEDULED
                    </span>
                  </div>
                ))}
            </div>
          ) : (
            <div className="py-12 text-center bg-[#F8F9FC] rounded-xl text-gray-400 text-xs">
              No posts scheduled for this client yet.
            </div>
          )}
        </div>
      )}

      {/* TAB 4: TASKS */}
      {activeTab === 'tasks' && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900">Client Tasks</h3>
            <button
              onClick={() => navigate(`/workspace/tasks?clientId=${clientId}`)}
              className="px-3.5 py-1.5 text-xs font-semibold text-[#4F39F6] bg-[#4F39F6]/10 hover:bg-[#4F39F6]/20 rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Task
            </button>
          </div>

          {tabData.tasks && tabData.tasks.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {tabData.tasks.map((task) => (
                <div
                  key={task.id}
                  onClick={() => navigate(`/workspace/tasks?taskId=${task.id}`)}
                  className="py-3 flex items-center justify-between gap-3 hover:bg-[#F8F9FC] px-2 rounded-lg transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <CheckSquare className="w-4 h-4 text-gray-400 shrink-0" />
                    <div className="min-w-0">
                      <h4 className="text-xs font-semibold text-gray-900 truncate">
                        {task.title}
                      </h4>
                      <span className="text-[10px] text-gray-400">
                        Assigned to: {task.assignee_name || 'Unassigned'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-gray-100 text-gray-700">
                      {task.priority}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#4F39F6]/10 text-[#4F39F6]">
                      {task.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center bg-[#F8F9FC] rounded-xl text-gray-400 text-xs">
              No tasks assigned for this client.
            </div>
          )}
        </div>
      )}

      {/* TAB 5: PROJECTS */}
      {activeTab === 'projects' && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900">Client Projects</h3>
            <button
              onClick={() => navigate(`/workspace/projects?clientId=${clientId}`)}
              className="px-3.5 py-1.5 text-xs font-semibold text-[#4F39F6] bg-[#4F39F6]/10 hover:bg-[#4F39F6]/20 rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              New Project
            </button>
          </div>

          {tabData.projects && tabData.projects.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tabData.projects.map((proj) => (
                <div
                  key={proj.id}
                  onClick={() => navigate(`/workspace/projects/${proj.id}`)}
                  className="p-4 rounded-xl border border-gray-200 bg-[#F8F9FC] hover:bg-white hover:border-[#4F39F6]/40 transition-all cursor-pointer space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-bold text-gray-900 text-xs truncate">{proj.name}</h4>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white border border-gray-200 text-gray-700">
                      {proj.status}
                    </span>
                  </div>
                  {proj.description && (
                    <p className="text-[11px] text-gray-500 line-clamp-2">{proj.description}</p>
                  )}
                  <div className="flex items-center justify-between pt-2 border-t border-gray-200 text-[10px] text-gray-400">
                    <span>{proj.content_count || 0} Posts</span>
                    <span>{proj.task_count || 0} Tasks</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center bg-[#F8F9FC] rounded-xl text-gray-400 text-xs">
              No projects created for this client yet.
            </div>
          )}
        </div>
      )}

      {/* TAB 6: ASSETS */}
      {activeTab === 'assets' && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900">Client Media & Files ({tabData.assets?.length || 0})</h3>
            <button
              onClick={() => navigate(`/workspace/assets?clientId=${clientId}`)}
              className="px-3.5 py-1.5 text-xs font-semibold text-[#4F39F6] bg-[#4F39F6]/10 hover:bg-[#4F39F6]/20 rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
            >
              Open Assets Manager →
            </button>
          </div>

          {tabData.assets && tabData.assets.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {tabData.assets.map((asset) => (
                <div key={asset.id} className="p-2 rounded-xl border border-gray-200 bg-[#F8F9FC] text-center space-y-2">
                  <div className="w-full h-20 rounded-lg bg-white border border-gray-200 flex items-center justify-center overflow-hidden">
                    {asset.file_url?.match(/\.(jpg|jpeg|png|webp|svg|gif)$/i) ? (
                      <img src={asset.file_url} alt={asset.display_name} className="max-h-full max-w-full object-contain" />
                    ) : (
                      <FileText className="w-6 h-6 text-gray-400" />
                    )}
                  </div>
                  <p className="text-[11px] font-semibold text-gray-900 truncate">{asset.display_name || asset.file_name}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center bg-[#F8F9FC] rounded-xl text-gray-400 text-xs">
              No assets uploaded for this client yet.
            </div>
          )}
        </div>
      )}

      {/* TAB 7: BRAND KIT */}
      {activeTab === 'brandkit' && (
        <BrandKitTab
          clientId={clientId}
          clientName={client?.companyName || client?.name}
          currentUser={currentUser}
        />
      )}

      {/* TAB 8: TEAM */}
      {activeTab === 'team' && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-gray-900">Assigned Team Members ({client?.assignedTeam?.length || 0})</h3>
          {client?.assignedTeam && client.assignedTeam.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {client.assignedTeam.map((member) => (
                <div key={member.id} className="p-4 rounded-xl border border-gray-200 bg-[#F8F9FC] flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center font-bold text-[#4F39F6] text-sm overflow-hidden shrink-0 shadow-2xs">
                    {member.avatar ? (
                      <img src={member.avatar} alt={member.name} className="w-full h-full object-cover" />
                    ) : (
                      <span>{getInitials(member.name)}</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-gray-900 truncate">{member.name}</h4>
                    <p className="text-[11px] text-gray-400 truncate">{member.email}</p>
                    <span className="inline-block mt-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[#4F39F6]/10 text-[#4F39F6]">
                      {member.role || 'Team Member'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center bg-[#F8F9FC] rounded-xl text-gray-400 text-xs">
              No team members assigned to this client yet.
            </div>
          )}
        </div>
      )}

      {/* TAB 9: ACTIVITY LOG */}
      {activeTab === 'activity' && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-gray-900">Client Activity & Audit Stream</h3>
          {overviewData?.recentActivity && overviewData.recentActivity.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {overviewData.recentActivity.map((act) => (
                <div key={act.id} className="py-3.5 flex items-start gap-3.5 text-xs">
                  <div className="w-8 h-8 rounded-xl bg-[#F8F9FC] border border-gray-200 flex items-center justify-center font-bold text-[#4F39F6] text-xs shrink-0 mt-0.5">
                    {act.userName ? getInitials(act.userName) : 'SD'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-900 font-medium">{act.description}</p>
                    <span className="text-[11px] text-gray-400">
                      {act.userName} • {new Date(act.timestamp).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center bg-[#F8F9FC] rounded-xl text-gray-400 text-xs">
              No activity recorded for this client.
            </div>
          )}
        </div>
      )}

      {/* Edit Client Modal */}
      {isEditModalOpen && (
        <EditClientModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          client={client}
          onSuccess={(updated) => {
            setClient(updated);
            loadClientData();
          }}
        />
      )}
    </div>
  );
};
