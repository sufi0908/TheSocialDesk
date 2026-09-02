import React, { useState } from 'react';
import {
  X,
  Building2,
  User,
  Mail,
  Phone,
  Globe,
  Lock,
  FileText,
  Share2,
  Sparkles,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { ClientLogoUploader } from './ClientLogoUploader';
import { clientService } from '../../services/clientService';

export const CreateClientModal = ({ isOpen, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [logoFile, setLogoFile] = useState(null);

  const [formData, setFormData] = useState({
    companyName: '',
    contactName: '',
    email: '',
    phone: '',
    industry: '',
    website: '',
    address: '',
    notes: '',
    password: '',
    confirmPassword: '',
    socialProfiles: {
      instagram: '',
      facebook: '',
      linkedin: '',
      twitter: '',
      youtube: '',
    },
  });

  if (!isOpen) return null;

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
    if (!formData.email.trim()) {
      setError('A valid email address is required.');
      return;
    }
    if (formData.password && formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const result = await clientService.createClient(
        {
          companyName: formData.companyName.trim(),
          clientName: formData.companyName.trim(),
          contactName: formData.contactName.trim() || formData.companyName.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim() || undefined,
          industry: formData.industry.trim() || undefined,
          website: formData.website.trim() || undefined,
          address: formData.address.trim() || undefined,
          notes: formData.notes.trim() || undefined,
          password: formData.password || undefined,
          confirmPassword: formData.confirmPassword || undefined,
          socialProfiles: Object.values(formData.socialProfiles).some(Boolean)
            ? formData.socialProfiles
            : undefined,
        },
        logoFile
      );

      if (onSuccess) onSuccess(result);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to create client.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] shadow-2xl border border-gray-100 flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4.5 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#4F39F6]/10 text-[#4F39F6] flex items-center justify-center font-bold">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Add New Client</h2>
              <p className="text-xs text-gray-500">
                Create a client workspace account, brand portfolio & user access.
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

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center gap-2">
              <X className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Section 1: Logo & Basic Info */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">
              1. Brand Identity & Logo
            </h3>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-2">
                Client Brand Logo
              </label>
              <ClientLogoUploader
                clientName={formData.companyName || 'Client'}
                onFileSelect={(file) => setLogoFile(file)}
                onRemove={() => setLogoFile(null)}
                size="md"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Company / Brand Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={formData.companyName}
                    onChange={(e) => handleChange('companyName', e.target.value)}
                    placeholder="e.g. Acme Studio"
                    className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-[#F8F9FC] border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#4F39F6]/20 focus:border-[#4F39F6] transition-all font-medium text-gray-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Industry / Category
                </label>
                <input
                  type="text"
                  value={formData.industry}
                  onChange={(e) => handleChange('industry', e.target.value)}
                  placeholder="e.g. E-Commerce, Fashion, Tech"
                  className="w-full px-3.5 py-2.5 text-xs bg-[#F8F9FC] border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#4F39F6]/20 focus:border-[#4F39F6] transition-all text-gray-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                    className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-[#F8F9FC] border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#4F39F6]/20 focus:border-[#4F39F6] transition-all text-gray-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Primary Location / Address
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                  placeholder="City, Country"
                  className="w-full px-3.5 py-2.5 text-xs bg-[#F8F9FC] border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#4F39F6]/20 focus:border-[#4F39F6] transition-all text-gray-900"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Contact & Portal Account */}
          <div className="space-y-4 pt-3 border-t border-gray-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">
              2. Client Contact & Portal Access
            </h3>

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
                    placeholder="e.g. Sarah Connor"
                    className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-[#F8F9FC] border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#4F39F6]/20 focus:border-[#4F39F6] transition-all font-medium text-gray-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Client Email <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    placeholder="client@company.com"
                    className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-[#F8F9FC] border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#4F39F6]/20 focus:border-[#4F39F6] transition-all font-medium text-gray-900"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                    className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-[#F8F9FC] border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#4F39F6]/20 focus:border-[#4F39F6] transition-all text-gray-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Client Portal Password (Optional)
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => handleChange('password', e.target.value)}
                    placeholder="Leave empty to auto-generate"
                    className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-[#F8F9FC] border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#4F39F6]/20 focus:border-[#4F39F6] transition-all text-gray-900"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Social Links & Notes */}
          <div className="space-y-4 pt-3 border-t border-gray-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">
              3. Social Profiles & Description
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                  Instagram Handle
                </label>
                <input
                  type="text"
                  value={formData.socialProfiles.instagram}
                  onChange={(e) => handleSocialChange('instagram', e.target.value)}
                  placeholder="@handle"
                  className="w-full px-3 py-2 text-xs bg-[#F8F9FC] border border-gray-200 rounded-lg text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#4F39F6]/20 focus:border-[#4F39F6]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                  LinkedIn Page
                </label>
                <input
                  type="text"
                  value={formData.socialProfiles.linkedin}
                  onChange={(e) => handleSocialChange('linkedin', e.target.value)}
                  placeholder="company/name"
                  className="w-full px-3 py-2 text-xs bg-[#F8F9FC] border border-gray-200 rounded-lg text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#4F39F6]/20 focus:border-[#4F39F6]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                  Facebook Page
                </label>
                <input
                  type="text"
                  value={formData.socialProfiles.facebook}
                  onChange={(e) => handleSocialChange('facebook', e.target.value)}
                  placeholder="pagename"
                  className="w-full px-3 py-2 text-xs bg-[#F8F9FC] border border-gray-200 rounded-lg text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#4F39F6]/20 focus:border-[#4F39F6]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Client Description / Account Notes
              </label>
              <textarea
                rows={2}
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                placeholder="Key goals, target audience, tone of voice or internal account notes..."
                className="w-full px-3.5 py-2.5 text-xs bg-[#F8F9FC] border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#4F39F6]/20 focus:border-[#4F39F6] transition-all text-gray-900 resize-none"
              />
            </div>
          </div>
        </form>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3 bg-[#F8F9FC] shrink-0">
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
                <span>Creating Client...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Create Client</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
