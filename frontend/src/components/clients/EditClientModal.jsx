import React, { useState, useEffect } from 'react';
import {
  X,
  Building2,
  User,
  Mail,
  Phone,
  Globe,
  Loader2,
  Save,
  MessageCircle,
  MapPin,
  Palette,
  Share2,
  FileText,
  Briefcase,
  Layers,
  Sparkles,
} from 'lucide-react';
import { ClientLogoUploader } from './ClientLogoUploader';
import { clientService } from '../../services/clientService';

export const EditClientModal = ({ isOpen, onClose, client, onSuccess }) => {
  const [activeSection, setActiveSection] = useState('basic'); // 'basic' | 'contact' | 'social' | 'brand' | 'notes'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [logoFile, setLogoFile] = useState(null);
  const [logoRemoved, setLogoRemoved] = useState(false);

  const [formData, setFormData] = useState({
    // Section 1: Basic Information
    companyName: '',
    clientName: '',
    status: 'Active',
    industry: '',
    category: '',

    // Section 2: Contact
    contactName: '',
    email: '',
    phone: '',
    whatsapp: '',
    website: '',
    address: '',
    city: '',
    country: '',

    // Section 3: Social Profiles
    socialProfiles: {
      instagram: '',
      facebook: '',
      tiktok: '',
      linkedin: '',
      twitter: '',
      youtube: '',
      pinterest: '',
      customUrl: '',
    },

    // Section 4: Brand
    tagline: '',
    brandDescription: '',
    toneOfVoice: '',
    targetAudience: '',

    // Section 5: Notes & Preferences
    services: '',
    internalNotes: '',
  });

  useEffect(() => {
    if (client) {
      setFormData({
        companyName: client.companyName || client.name || '',
        clientName: client.name || client.companyName || '',
        status: client.status === 'Active' || client.status === 'ACTIVE' ? 'Active' : 'Inactive',
        industry: client.industry || '',
        category: client.category || '',

        contactName: client.contactPerson || client.contactName || '',
        email: client.email || '',
        phone: client.phone || '',
        whatsapp: client.whatsapp || '',
        website: client.website || '',
        address: client.address || '',
        city: client.city || '',
        country: client.country || '',

        socialProfiles: {
          instagram: client.socialProfiles?.instagram || '',
          facebook: client.socialProfiles?.facebook || '',
          tiktok: client.socialProfiles?.tiktok || '',
          linkedin: client.socialProfiles?.linkedin || '',
          twitter: client.socialProfiles?.twitter || '',
          youtube: client.socialProfiles?.youtube || '',
          pinterest: client.socialProfiles?.pinterest || '',
          customUrl: client.socialProfiles?.customUrl || '',
        },

        tagline: client.tagline || '',
        brandDescription: client.description || client.notes || '',
        toneOfVoice: client.brandVoice?.tone || '',
        targetAudience: client.targetAudience || '',

        services: client.services || '',
        internalNotes: client.notes || '',
      });
      setLogoFile(null);
      setLogoRemoved(false);
      setError('');
      setActiveSection('basic');
    }
  }, [client, isOpen]);

  if (!isOpen || !client) return null;

  const handleChange = (field, value) => {
    setError('');
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSocialChange = (platform, value) => {
    setFormData((prev) => ({
      ...prev,
      socialProfiles: { ...prev.socialProfiles, [platform]: value },
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.companyName.trim()) {
      setError('Company / Client Name is required.');
      return;
    }

    try {
      setLoading(true);
      setError('');

      let updatedLogoUrl = undefined;
      if (logoRemoved) {
        await clientService.removeClientLogo(client.id);
        updatedLogoUrl = null;
      }

      const result = await clientService.updateClient(
        client.id,
        {
          name: formData.clientName.trim() || formData.companyName.trim(),
          companyName: formData.companyName.trim(),
          contactName: formData.contactName.trim() || formData.companyName.trim(),
          contactPerson: formData.contactName.trim() || formData.companyName.trim(),
          email: formData.email.trim() || undefined,
          phone: formData.phone.trim() || undefined,
          whatsapp: formData.whatsapp.trim() || undefined,
          industry: formData.industry.trim() || undefined,
          category: formData.category.trim() || undefined,
          website: formData.website.trim() || undefined,
          address: formData.address.trim() || undefined,
          city: formData.city.trim() || undefined,
          country: formData.country.trim() || undefined,
          services: formData.services.trim() || undefined,
          status: formData.status === 'Active' ? 'ACTIVE' : 'INACTIVE',
          notes: formData.internalNotes.trim() || formData.brandDescription.trim() || undefined,
          logoUrl: updatedLogoUrl,
          socialProfiles: Object.values(formData.socialProfiles).some(Boolean)
            ? formData.socialProfiles
            : null,
        },
        logoFile
      );

      if (onSuccess) onSuccess(result);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to update client.');
    } finally {
      setLoading(false);
    }
  };

  const sections = [
    { key: 'basic', label: '1. Basic Info', icon: Building2 },
    { key: 'contact', label: '2. Contact & Location', icon: User },
    { key: 'social', label: '3. Social Profiles', icon: Share2 },
    { key: 'brand', label: '4. Brand & Audience', icon: Palette },
    { key: 'notes', label: '5. Business & Notes', icon: FileText },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white rounded-3xl w-full max-w-3xl max-h-[90vh] shadow-2xl border border-gray-100 flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4.5 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#4F39F6]/10 text-[#4F39F6] flex items-center justify-center font-bold">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                Edit {client?.companyName || client?.name}
              </h2>
              <p className="text-xs text-gray-500">
                Update brand identity, contacts, social links and business preferences.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Section Tabs Bar */}
        <div className="px-6 pt-3 border-b border-gray-100 bg-[#F8F9FC] shrink-0 overflow-x-auto">
          <div className="flex items-center gap-2 min-w-max pb-3">
            {sections.map((sec) => {
              const Icon = sec.icon;
              const isActive = activeSection === sec.key;
              return (
                <button
                  key={sec.key}
                  type="button"
                  onClick={() => setActiveSection(sec.key)}
                  className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer ${
                    isActive
                      ? 'bg-[#4F39F6] text-white shadow-xs'
                      : 'text-gray-600 hover:bg-white hover:text-gray-900'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{sec.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center gap-2">
              <X className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* SECTION 1: Basic Information */}
          {activeSection === 'basic' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2">
                  Client Brand Logo
                </label>
                <ClientLogoUploader
                  logoUrl={logoRemoved ? null : client.logoUrl}
                  clientName={formData.companyName || 'Client'}
                  onFileSelect={(file) => {
                    setLogoFile(file);
                    setLogoRemoved(false);
                  }}
                  onRemove={() => {
                    setLogoFile(null);
                    setLogoRemoved(true);
                  }}
                  size="md"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Company / Brand Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.companyName}
                    onChange={(e) => handleChange('companyName', e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs bg-[#F8F9FC] border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#4F39F6]/20 focus:border-[#4F39F6] font-medium text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Client Display Name
                  </label>
                  <input
                    type="text"
                    value={formData.clientName}
                    onChange={(e) => handleChange('clientName', e.target.value)}
                    placeholder="e.g. Acme Corp"
                    className="w-full px-3.5 py-2.5 text-xs bg-[#F8F9FC] border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#4F39F6]/20 focus:border-[#4F39F6] text-gray-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Industry
                  </label>
                  <input
                    type="text"
                    value={formData.industry}
                    onChange={(e) => handleChange('industry', e.target.value)}
                    placeholder="e.g. Fashion, SaaS, Retail"
                    className="w-full px-3.5 py-2.5 text-xs bg-[#F8F9FC] border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#4F39F6]/20 focus:border-[#4F39F6] text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Category
                  </label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => handleChange('category', e.target.value)}
                    placeholder="e.g. B2B, B2C, D2C"
                    className="w-full px-3.5 py-2.5 text-xs bg-[#F8F9FC] border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#4F39F6]/20 focus:border-[#4F39F6] text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => handleChange('status', e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs bg-[#F8F9FC] border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#4F39F6]/20 focus:border-[#4F39F6] font-semibold text-gray-900"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 2: Contact & Location */}
          {activeSection === 'contact' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Primary Contact Person
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={formData.contactName}
                      onChange={(e) => handleChange('contactName', e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-[#F8F9FC] border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#4F39F6]/20 focus:border-[#4F39F6] text-gray-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Client Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleChange('email', e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-[#F8F9FC] border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#4F39F6]/20 focus:border-[#4F39F6] text-gray-900"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => handleChange('phone', e.target.value)}
                      placeholder="+1 (555) 000-0000"
                      className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-[#F8F9FC] border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#4F39F6]/20 focus:border-[#4F39F6] text-gray-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    WhatsApp Number
                  </label>
                  <div className="relative">
                    <MessageCircle className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      value={formData.whatsapp}
                      onChange={(e) => handleChange('whatsapp', e.target.value)}
                      placeholder="+1 (555) 000-0000"
                      className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-[#F8F9FC] border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#4F39F6]/20 focus:border-[#4F39F6] text-gray-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Website URL
                  </label>
                  <div className="relative">
                    <Globe className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={formData.website}
                      onChange={(e) => handleChange('website', e.target.value)}
                      placeholder="https://example.com"
                      className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-[#F8F9FC] border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#4F39F6]/20 focus:border-[#4F39F6] text-gray-900"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-1">
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Street Address
                  </label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => handleChange('address', e.target.value)}
                    placeholder="123 Brand Way"
                    className="w-full px-3.5 py-2.5 text-xs bg-[#F8F9FC] border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#4F39F6]/20 focus:border-[#4F39F6] text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    City
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => handleChange('city', e.target.value)}
                    placeholder="New York"
                    className="w-full px-3.5 py-2.5 text-xs bg-[#F8F9FC] border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#4F39F6]/20 focus:border-[#4F39F6] text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Country
                  </label>
                  <input
                    type="text"
                    value={formData.country}
                    onChange={(e) => handleChange('country', e.target.value)}
                    placeholder="United States"
                    className="w-full px-3.5 py-2.5 text-xs bg-[#F8F9FC] border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#4F39F6]/20 focus:border-[#4F39F6] text-gray-900"
                  />
                </div>
              </div>
            </div>
          )}

          {/* SECTION 3: Social Profiles */}
          {activeSection === 'social' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <p className="text-xs text-gray-500">
                Enter full URLs or handles for all brand profiles. These appear on client header and brand kit.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Instagram URL / @handle
                  </label>
                  <input
                    type="text"
                    value={formData.socialProfiles.instagram}
                    onChange={(e) => handleSocialChange('instagram', e.target.value)}
                    placeholder="https://instagram.com/brand"
                    className="w-full px-3.5 py-2.5 text-xs bg-[#F8F9FC] border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#4F39F6]/20 focus:border-[#4F39F6] text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Facebook Page URL
                  </label>
                  <input
                    type="text"
                    value={formData.socialProfiles.facebook}
                    onChange={(e) => handleSocialChange('facebook', e.target.value)}
                    placeholder="https://facebook.com/brand"
                    className="w-full px-3.5 py-2.5 text-xs bg-[#F8F9FC] border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#4F39F6]/20 focus:border-[#4F39F6] text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    TikTok URL / @handle
                  </label>
                  <input
                    type="text"
                    value={formData.socialProfiles.tiktok}
                    onChange={(e) => handleSocialChange('tiktok', e.target.value)}
                    placeholder="https://tiktok.com/@brand"
                    className="w-full px-3.5 py-2.5 text-xs bg-[#F8F9FC] border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#4F39F6]/20 focus:border-[#4F39F6] text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    LinkedIn Company Page
                  </label>
                  <input
                    type="text"
                    value={formData.socialProfiles.linkedin}
                    onChange={(e) => handleSocialChange('linkedin', e.target.value)}
                    placeholder="https://linkedin.com/company/brand"
                    className="w-full px-3.5 py-2.5 text-xs bg-[#F8F9FC] border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#4F39F6]/20 focus:border-[#4F39F6] text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    X / Twitter URL
                  </label>
                  <input
                    type="text"
                    value={formData.socialProfiles.twitter}
                    onChange={(e) => handleSocialChange('twitter', e.target.value)}
                    placeholder="https://x.com/brand"
                    className="w-full px-3.5 py-2.5 text-xs bg-[#F8F9FC] border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#4F39F6]/20 focus:border-[#4F39F6] text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    YouTube Channel URL
                  </label>
                  <input
                    type="text"
                    value={formData.socialProfiles.youtube}
                    onChange={(e) => handleSocialChange('youtube', e.target.value)}
                    placeholder="https://youtube.com/@brand"
                    className="w-full px-3.5 py-2.5 text-xs bg-[#F8F9FC] border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#4F39F6]/20 focus:border-[#4F39F6] text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Pinterest URL
                  </label>
                  <input
                    type="text"
                    value={formData.socialProfiles.pinterest}
                    onChange={(e) => handleSocialChange('pinterest', e.target.value)}
                    placeholder="https://pinterest.com/brand"
                    className="w-full px-3.5 py-2.5 text-xs bg-[#F8F9FC] border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#4F39F6]/20 focus:border-[#4F39F6] text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Other Custom Link
                  </label>
                  <input
                    type="text"
                    value={formData.socialProfiles.customUrl}
                    onChange={(e) => handleSocialChange('customUrl', e.target.value)}
                    placeholder="https://linktr.ee/brand"
                    className="w-full px-3.5 py-2.5 text-xs bg-[#F8F9FC] border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#4F39F6]/20 focus:border-[#4F39F6] text-gray-900"
                  />
                </div>
              </div>
            </div>
          )}

          {/* SECTION 4: Brand & Audience */}
          {activeSection === 'brand' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Brand Tagline / Slogan
                  </label>
                  <input
                    type="text"
                    value={formData.tagline}
                    onChange={(e) => handleChange('tagline', e.target.value)}
                    placeholder="e.g. Innovating the Future"
                    className="w-full px-3.5 py-2.5 text-xs bg-[#F8F9FC] border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#4F39F6]/20 focus:border-[#4F39F6] text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Tone of Voice
                  </label>
                  <input
                    type="text"
                    value={formData.toneOfVoice}
                    onChange={(e) => handleChange('toneOfVoice', e.target.value)}
                    placeholder="e.g. Empathetic, bold, playful"
                    className="w-full px-3.5 py-2.5 text-xs bg-[#F8F9FC] border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#4F39F6]/20 focus:border-[#4F39F6] text-gray-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Target Audience Demographics
                </label>
                <textarea
                  rows={2}
                  value={formData.targetAudience}
                  onChange={(e) => handleChange('targetAudience', e.target.value)}
                  placeholder="e.g. Gen-Z innovators, tech founders ages 24-38, fashion enthusiasts..."
                  className="w-full px-3.5 py-2.5 text-xs bg-[#F8F9FC] border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#4F39F6]/20 focus:border-[#4F39F6] text-gray-900 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Brand Description / Story
                </label>
                <textarea
                  rows={2}
                  value={formData.brandDescription}
                  onChange={(e) => handleChange('brandDescription', e.target.value)}
                  placeholder="Key brand pillars, origin story, USP..."
                  className="w-full px-3.5 py-2.5 text-xs bg-[#F8F9FC] border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#4F39F6]/20 focus:border-[#4F39F6] text-gray-900 resize-none"
                />
              </div>
            </div>
          )}

          {/* SECTION 5: Business & Notes */}
          {activeSection === 'notes' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Services Provided
                </label>
                <input
                  type="text"
                  value={formData.services}
                  onChange={(e) => handleChange('services', e.target.value)}
                  placeholder="e.g. Social Media Management, Content Creation, Paid Ads, SEO"
                  className="w-full px-3.5 py-2.5 text-xs bg-[#F8F9FC] border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#4F39F6]/20 focus:border-[#4F39F6] text-gray-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Internal Agency Notes (Private to Team)
                </label>
                <textarea
                  rows={4}
                  value={formData.internalNotes}
                  onChange={(e) => handleChange('internalNotes', e.target.value)}
                  placeholder="Billing terms, escalation contacts, specific client preferences..."
                  className="w-full px-3.5 py-2.5 text-xs bg-[#F8F9FC] border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#4F39F6]/20 focus:border-[#4F39F6] text-gray-900 resize-none"
                />
              </div>
            </div>
          )}
        </form>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-[#F8F9FC] shrink-0">
          <div className="flex items-center gap-2">
            {activeSection !== 'basic' && (
              <button
                type="button"
                onClick={() => {
                  const idx = sections.findIndex((s) => s.key === activeSection);
                  if (idx > 0) setActiveSection(sections[idx - 1].key);
                }}
                className="px-3.5 py-2 text-xs font-semibold text-gray-600 hover:text-gray-900 rounded-xl transition-colors cursor-pointer"
              >
                ← Previous Section
              </button>
            )}
            {activeSection !== 'notes' && (
              <button
                type="button"
                onClick={() => {
                  const idx = sections.findIndex((s) => s.key === activeSection);
                  if (idx < sections.length - 1) setActiveSection(sections[idx + 1].key);
                }}
                className="px-3.5 py-2 text-xs font-semibold text-[#4F39F6] hover:underline cursor-pointer"
              >
                Next Section →
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-200/60 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="px-5 py-2 text-xs font-semibold text-white bg-[#4F39F6] hover:bg-[#4330D9] rounded-xl transition-all duration-150 flex items-center gap-2 shadow-xs disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Client Profile</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
