import React, { useState, useEffect } from 'react';
import {
  Palette,
  Type,
  FileText,
  Upload,
  Download,
  Copy,
  Check,
  Plus,
  Trash2,
  Image as ImageIcon,
  Save,
  Loader2,
  Sparkles,
  ExternalLink,
  Info,
  FolderOpen,
  Mic,
  Users,
  Share2,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { brandKitService } from '../../services/brandKitService';

export const BrandKitTab = ({ clientId, clientName, currentUser }) => {
  const [brandKit, setBrandKit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [copiedHex, setCopiedHex] = useState(null);

  // Form states
  const [tagline, setTagline] = useState('');
  const [industry, setIndustry] = useState('');
  const [website, setWebsite] = useState('');
  const [description, setDescription] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#4F39F6');
  const [secondaryColor, setSecondaryColor] = useState('#000000');
  const [accentColor, setAccentColor] = useState('#FFFFFF');
  const [bgColor, setBgColor] = useState('#FFFFFF');
  const [textColor, setTextColor] = useState('#000000');
  const [swatches, setSwatches] = useState(['#4F39F6', '#000000', '#FFFFFF', '#6366F1', '#F8F9FC']);
  const [primaryFont, setPrimaryFont] = useState('Inter');
  const [secondaryFont, setSecondaryFont] = useState('Outfit');
  const [guidelinesNotes, setGuidelinesNotes] = useState('');
  const [targetAudience, setTargetAudience] = useState('');

  // Brand voice states
  const [tone, setTone] = useState('');
  const [style, setStyle] = useState('');
  const [keywords, setKeywords] = useState('');
  const [dos, setDos] = useState('');
  const [donts, setDonts] = useState('');

  // Social profiles state
  const [socialProfiles, setSocialProfiles] = useState({
    instagram: '',
    facebook: '',
    tiktok: '',
    linkedin: '',
    twitter: '',
    youtube: '',
    pinterest: '',
  });

  // Asset upload states
  const [uploadingAsset, setUploadingAsset] = useState(false);

  useEffect(() => {
    loadBrandKit();
  }, [clientId]);

  const loadBrandKit = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await brandKitService.getBrandKit(clientId);
      if (data) {
        setBrandKit(data);
        setTagline(data.tagline || '');
        setIndustry(data.industry || '');
        setWebsite(data.website || '');
        setDescription(data.description || '');
        setPrimaryColor(data.primaryColor || '#4F39F6');
        setSecondaryColor(data.secondaryColor || '#000000');
        setAccentColor(data.accentColor || '#FFFFFF');
        setBgColor(data.bgColor || '#FFFFFF');
        setTextColor(data.textColor || '#000000');
        setSwatches(data.colors || ['#4F39F6', '#000000', '#FFFFFF']);
        setPrimaryFont(data.fonts?.primary || data.fontFamily || 'Inter');
        setSecondaryFont(data.fonts?.secondary || 'Outfit');
        setGuidelinesNotes(data.guidelinesNotes || '');
        setTargetAudience(data.targetAudience || '');

        if (data.brandVoice) {
          setTone(data.brandVoice.tone || '');
          setStyle(data.brandVoice.style || '');
          setKeywords(Array.isArray(data.brandVoice.keywords) ? data.brandVoice.keywords.join(', ') : (data.brandVoice.keywords || ''));
          setDos(Array.isArray(data.brandVoice.dos) ? data.brandVoice.dos.join('\n') : (data.brandVoice.dos || ''));
          setDonts(Array.isArray(data.brandVoice.donts) ? data.brandVoice.donts.join('\n') : (data.brandVoice.donts || ''));
        }

        if (data.socialProfiles) {
          setSocialProfiles({
            instagram: data.socialProfiles.instagram || '',
            facebook: data.socialProfiles.facebook || '',
            tiktok: data.socialProfiles.tiktok || '',
            linkedin: data.socialProfiles.linkedin || '',
            twitter: data.socialProfiles.twitter || '',
            youtube: data.socialProfiles.youtube || '',
            pinterest: data.socialProfiles.pinterest || '',
          });
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to load brand kit.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (hex) => {
    navigator.clipboard.writeText(hex);
    setCopiedHex(hex);
    setTimeout(() => setCopiedHex(null), 2000);
  };

  const handleAddSwatch = () => {
    if (swatches.length >= 10) return;
    setSwatches([...swatches, '#6366F1']);
  };

  const handleUpdateSwatch = (index, newHex) => {
    const updated = [...swatches];
    updated[index] = newHex;
    setSwatches(updated);
  };

  const handleRemoveSwatch = (index) => {
    setSwatches(swatches.filter((_, i) => i !== index));
  };

  const handleSaveBrandKit = async () => {
    try {
      setSaving(true);
      setError('');
      setSuccessMsg('');

      const parsedKeywords = keywords.split(',').map((k) => k.trim()).filter(Boolean);
      const parsedDos = dos.split('\n').map((d) => d.trim()).filter(Boolean);
      const parsedDonts = donts.split('\n').map((d) => d.trim()).filter(Boolean);

      const updated = await brandKitService.updateBrandKit(clientId, {
        brandName: clientName,
        tagline: tagline.trim(),
        industry: industry.trim(),
        website: website.trim(),
        description: description.trim(),
        targetAudience: targetAudience.trim(),
        primaryColor,
        secondaryColor,
        accentColor,
        bgColor,
        textColor,
        colors: swatches,
        fontFamily: primaryFont,
        fonts: { primary: primaryFont, secondary: secondaryFont },
        guidelinesNotes: guidelinesNotes.trim(),
        brandVoice: {
          tone: tone.trim(),
          style: style.trim(),
          keywords: parsedKeywords,
          dos: parsedDos,
          donts: parsedDonts,
        },
        socialProfiles: Object.values(socialProfiles).some(Boolean) ? socialProfiles : null,
      });

      setBrandKit(updated);
      setSuccessMsg('Brand Kit updated successfully!');
      setTimeout(() => setSuccessMsg(''), 3500);
    } catch (err) {
      setError(err.message || 'Failed to save brand kit.');
    } finally {
      setSaving(false);
    }
  };

  const handleUploadAssetFile = async (e, type = 'LOGO') => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingAsset(true);
      setError('');
      await brandKitService.uploadBrandAsset(clientId, file, {
        assetType: type,
        assetName: file.name,
        isPrimaryLogo: type === 'PRIMARY_LOGO' || type === 'LOGO',
      });
      await loadBrandKit();
      setSuccessMsg(`${type} uploaded successfully.`);
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setError(err.message || 'Asset upload failed.');
    } finally {
      setUploadingAsset(false);
      e.target.value = '';
    }
  };

  const handleDeleteAsset = async (assetId) => {
    try {
      await brandKitService.deleteBrandAsset(clientId, assetId);
      await loadBrandKit();
    } catch (err) {
      setError(err.message || 'Failed to delete asset.');
    }
  };

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-gray-400 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-[#4F39F6]" />
        <p className="text-xs font-medium">Loading Brand Kit & Portfolios...</p>
      </div>
    );
  }

  const isManagerOrAdmin =
    currentUser?.role === 'workspace_manager' ||
    currentUser?.role === 'superadmin' ||
    currentUser?.role === 'OWNER';

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-200">
      {/* Notifications */}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError('')} className="p-1 hover:bg-red-100 rounded-md">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium flex items-center gap-2">
          <Check className="w-4 h-4" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Top Banner: Brand Overview & Save Actions */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl font-bold text-gray-900">
              {brandKit?.brandName || clientName} Official Brand Kit
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#4F39F6]/10 text-[#4F39F6] border border-[#4F39F6]/20">
              Active Portfolio
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Centralized design tokens, official logos, palette swatches, typography, voice & brand guidelines.
          </p>
        </div>

        {isManagerOrAdmin && (
          <button
            type="button"
            onClick={handleSaveBrandKit}
            disabled={saving}
            className="px-5 py-2.5 bg-[#4F39F6] hover:bg-[#4330D9] text-white font-semibold text-xs rounded-xl transition-all duration-150 flex items-center gap-2 shadow-xs disabled:opacity-50 cursor-pointer shrink-0"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Brand Kit</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* SECTION 1: Brand Information & Tagline */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
          <Info className="w-4 h-4 text-[#4F39F6]" />
          Brand Overview & Positioning
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Brand Tagline / Slogan
            </label>
            <input
              type="text"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder="e.g. Elevating Everyday Living"
              disabled={!isManagerOrAdmin}
              className="w-full px-3.5 py-2.5 text-xs bg-[#F8F9FC] border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#4F39F6]/20 focus:border-[#4F39F6] text-gray-900"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Industry / Sector
            </label>
            <input
              type="text"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              placeholder="e.g. Luxury Skincare & Cosmetics"
              disabled={!isManagerOrAdmin}
              className="w-full px-3.5 py-2.5 text-xs bg-[#F8F9FC] border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#4F39F6]/20 focus:border-[#4F39F6] text-gray-900"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Official Website
            </label>
            <input
              type="text"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://example.com"
              disabled={!isManagerOrAdmin}
              className="w-full px-3.5 py-2.5 text-xs bg-[#F8F9FC] border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#4F39F6]/20 focus:border-[#4F39F6] text-gray-900"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Brand Story / Description
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Core mission, brand values, background..."
              disabled={!isManagerOrAdmin}
              className="w-full px-3.5 py-2.5 text-xs bg-[#F8F9FC] border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#4F39F6]/20 focus:border-[#4F39F6] text-gray-900 resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Target Audience
            </label>
            <textarea
              rows={2}
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              placeholder="Demographics, psychographics, key persona..."
              disabled={!isManagerOrAdmin}
              className="w-full px-3.5 py-2.5 text-xs bg-[#F8F9FC] border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#4F39F6]/20 focus:border-[#4F39F6] text-gray-900 resize-none"
            />
          </div>
        </div>
      </div>

      {/* SECTION 2: Official Logos & Variations */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-[#4F39F6]" />
            Official Brand Logos & Variations
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. Primary Logo */}
          <div className="p-4 rounded-xl border border-gray-200 bg-[#F8F9FC] flex flex-col justify-between items-center text-center">
            <span className="text-xs font-bold text-gray-700 mb-2">Primary Logo</span>
            <div className="w-full h-28 rounded-lg bg-white border border-gray-200 flex items-center justify-center p-3 mb-3 shadow-2xs overflow-hidden">
              {brandKit?.logoUrl ? (
                <img src={brandKit.logoUrl} alt="Primary Logo" className="max-h-full max-w-full object-contain" />
              ) : (
                <span className="text-xs text-gray-400 font-medium">No Logo Uploaded</span>
              )}
            </div>
            {isManagerOrAdmin && (
              <label className="px-3 py-1.5 text-xs font-semibold text-[#4F39F6] bg-white border border-gray-200 hover:bg-[#4F39F6]/10 rounded-lg transition-colors cursor-pointer w-full">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleUploadAssetFile(e, 'PRIMARY_LOGO')}
                  className="hidden"
                />
                {brandKit?.logoUrl ? 'Replace Logo' : 'Upload Logo'}
              </label>
            )}
          </div>

          {/* 2. Dark Background Logo */}
          <div className="p-4 rounded-xl border border-gray-200 bg-[#0F172B] flex flex-col justify-between items-center text-center">
            <span className="text-xs font-bold text-white mb-2">Dark Surface Logo</span>
            <div className="w-full h-28 rounded-lg bg-slate-800/80 border border-slate-700 flex items-center justify-center p-3 mb-3 shadow-2xs overflow-hidden">
              {brandKit?.logoDarkUrl ? (
                <img src={brandKit.logoDarkUrl} alt="Dark Logo" className="max-h-full max-w-full object-contain" />
              ) : (
                <span className="text-xs text-slate-400 font-medium">Optional</span>
              )}
            </div>
            {isManagerOrAdmin && (
              <label className="px-3 py-1.5 text-xs font-semibold text-white bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors cursor-pointer w-full">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleUploadAssetFile(e, 'DARK_LOGO')}
                  className="hidden"
                />
                {brandKit?.logoDarkUrl ? 'Replace' : 'Upload'}
              </label>
            )}
          </div>

          {/* 3. Light / Monochrome Logo */}
          <div className="p-4 rounded-xl border border-gray-200 bg-[#F8F9FC] flex flex-col justify-between items-center text-center">
            <span className="text-xs font-bold text-gray-700 mb-2">Light Logo</span>
            <div className="w-full h-28 rounded-lg bg-white border border-gray-200 flex items-center justify-center p-3 mb-3 shadow-2xs overflow-hidden">
              {brandKit?.logoLightUrl ? (
                <img src={brandKit.logoLightUrl} alt="Light Logo" className="max-h-full max-w-full object-contain" />
              ) : (
                <span className="text-xs text-gray-400 font-medium">Optional</span>
              )}
            </div>
            {isManagerOrAdmin && (
              <label className="px-3 py-1.5 text-xs font-semibold text-[#4F39F6] bg-white border border-gray-200 hover:bg-[#4F39F6]/10 rounded-lg transition-colors cursor-pointer w-full">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleUploadAssetFile(e, 'LIGHT_LOGO')}
                  className="hidden"
                />
                {brandKit?.logoLightUrl ? 'Replace' : 'Upload'}
              </label>
            )}
          </div>

          {/* 4. App Icon / Favicon */}
          <div className="p-4 rounded-xl border border-gray-200 bg-[#F8F9FC] flex flex-col justify-between items-center text-center">
            <span className="text-xs font-bold text-gray-700 mb-2">App Icon / Favicon</span>
            <div className="w-full h-28 rounded-lg bg-white border border-gray-200 flex items-center justify-center p-3 mb-3 shadow-2xs overflow-hidden">
              {brandKit?.iconUrl ? (
                <img src={brandKit.iconUrl} alt="Icon" className="w-12 h-12 object-contain" />
              ) : (
                <span className="text-xs text-gray-400 font-medium">Optional</span>
              )}
            </div>
            {isManagerOrAdmin && (
              <label className="px-3 py-1.5 text-xs font-semibold text-[#4F39F6] bg-white border border-gray-200 hover:bg-[#4F39F6]/10 rounded-lg transition-colors cursor-pointer w-full">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleUploadAssetFile(e, 'ICON')}
                  className="hidden"
                />
                {brandKit?.iconUrl ? 'Replace' : 'Upload'}
              </label>
            )}
          </div>
        </div>
      </div>

      {/* SECTION 3: Interactive Color Palette */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Palette className="w-4 h-4 text-[#4F39F6]" />
              Brand Color System
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Click any HEX badge to copy. Use color pickers to customize swatches.
            </p>
          </div>
          {isManagerOrAdmin && swatches.length < 10 && (
            <button
              type="button"
              onClick={handleAddSwatch}
              className="px-3 py-1.5 text-xs font-semibold text-[#4F39F6] bg-[#4F39F6]/10 hover:bg-[#4F39F6]/20 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Swatch
            </button>
          )}
        </div>

        {/* 5 Core Palette Colors */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* 1. Primary */}
          <div className="p-3.5 rounded-xl border border-gray-200 bg-[#F8F9FC]">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold text-gray-700">Primary Accent</span>
              <button
                type="button"
                onClick={() => handleCopy(primaryColor)}
                className="text-xs text-gray-400 hover:text-gray-900"
                title="Copy HEX"
              >
                {copiedHex === primaryColor ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
            <div
              className="w-full h-12 rounded-lg border border-black/10 shadow-2xs mb-2 cursor-pointer"
              style={{ backgroundColor: primaryColor }}
              onClick={() => handleCopy(primaryColor)}
            />
            <div className="flex items-center gap-1.5">
              <input
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value.toUpperCase())}
                disabled={!isManagerOrAdmin}
                className="w-7 h-7 rounded border border-gray-300 cursor-pointer p-0 bg-white"
              />
              <input
                type="text"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value.toUpperCase())}
                disabled={!isManagerOrAdmin}
                className="flex-1 px-2 py-1 text-[11px] font-mono font-bold bg-white border border-gray-200 rounded text-gray-900"
              />
            </div>
          </div>

          {/* 2. Secondary */}
          <div className="p-3.5 rounded-xl border border-gray-200 bg-[#F8F9FC]">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold text-gray-700">Secondary Dark</span>
              <button
                type="button"
                onClick={() => handleCopy(secondaryColor)}
                className="text-xs text-gray-400 hover:text-gray-900"
                title="Copy HEX"
              >
                {copiedHex === secondaryColor ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
            <div
              className="w-full h-12 rounded-lg border border-black/10 shadow-2xs mb-2 cursor-pointer"
              style={{ backgroundColor: secondaryColor }}
              onClick={() => handleCopy(secondaryColor)}
            />
            <div className="flex items-center gap-1.5">
              <input
                type="color"
                value={secondaryColor}
                onChange={(e) => setSecondaryColor(e.target.value.toUpperCase())}
                disabled={!isManagerOrAdmin}
                className="w-7 h-7 rounded border border-gray-300 cursor-pointer p-0 bg-white"
              />
              <input
                type="text"
                value={secondaryColor}
                onChange={(e) => setSecondaryColor(e.target.value.toUpperCase())}
                disabled={!isManagerOrAdmin}
                className="flex-1 px-2 py-1 text-[11px] font-mono font-bold bg-white border border-gray-200 rounded text-gray-900"
              />
            </div>
          </div>

          {/* 3. Accent */}
          <div className="p-3.5 rounded-xl border border-gray-200 bg-[#F8F9FC]">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold text-gray-700">Accent Light</span>
              <button
                type="button"
                onClick={() => handleCopy(accentColor)}
                className="text-xs text-gray-400 hover:text-gray-900"
                title="Copy HEX"
              >
                {copiedHex === accentColor ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
            <div
              className="w-full h-12 rounded-lg border border-black/10 shadow-2xs mb-2 cursor-pointer"
              style={{ backgroundColor: accentColor }}
              onClick={() => handleCopy(accentColor)}
            />
            <div className="flex items-center gap-1.5">
              <input
                type="color"
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value.toUpperCase())}
                disabled={!isManagerOrAdmin}
                className="w-7 h-7 rounded border border-gray-300 cursor-pointer p-0 bg-white"
              />
              <input
                type="text"
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value.toUpperCase())}
                disabled={!isManagerOrAdmin}
                className="flex-1 px-2 py-1 text-[11px] font-mono font-bold bg-white border border-gray-200 rounded text-gray-900"
              />
            </div>
          </div>

          {/* 4. Background */}
          <div className="p-3.5 rounded-xl border border-gray-200 bg-[#F8F9FC]">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold text-gray-700">Background</span>
              <button
                type="button"
                onClick={() => handleCopy(bgColor)}
                className="text-xs text-gray-400 hover:text-gray-900"
                title="Copy HEX"
              >
                {copiedHex === bgColor ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
            <div
              className="w-full h-12 rounded-lg border border-black/10 shadow-2xs mb-2 cursor-pointer"
              style={{ backgroundColor: bgColor }}
              onClick={() => handleCopy(bgColor)}
            />
            <div className="flex items-center gap-1.5">
              <input
                type="color"
                value={bgColor}
                onChange={(e) => setBgColor(e.target.value.toUpperCase())}
                disabled={!isManagerOrAdmin}
                className="w-7 h-7 rounded border border-gray-300 cursor-pointer p-0 bg-white"
              />
              <input
                type="text"
                value={bgColor}
                onChange={(e) => setBgColor(e.target.value.toUpperCase())}
                disabled={!isManagerOrAdmin}
                className="flex-1 px-2 py-1 text-[11px] font-mono font-bold bg-white border border-gray-200 rounded text-gray-900"
              />
            </div>
          </div>

          {/* 5. Text Neutral */}
          <div className="p-3.5 rounded-xl border border-gray-200 bg-[#F8F9FC]">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold text-gray-700">Text Neutral</span>
              <button
                type="button"
                onClick={() => handleCopy(textColor)}
                className="text-xs text-gray-400 hover:text-gray-900"
                title="Copy HEX"
              >
                {copiedHex === textColor ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
            <div
              className="w-full h-12 rounded-lg border border-black/10 shadow-2xs mb-2 cursor-pointer"
              style={{ backgroundColor: textColor }}
              onClick={() => handleCopy(textColor)}
            />
            <div className="flex items-center gap-1.5">
              <input
                type="color"
                value={textColor}
                onChange={(e) => setTextColor(e.target.value.toUpperCase())}
                disabled={!isManagerOrAdmin}
                className="w-7 h-7 rounded border border-gray-300 cursor-pointer p-0 bg-white"
              />
              <input
                type="text"
                value={textColor}
                onChange={(e) => setTextColor(e.target.value.toUpperCase())}
                disabled={!isManagerOrAdmin}
                className="flex-1 px-2 py-1 text-[11px] font-mono font-bold bg-white border border-gray-200 rounded text-gray-900"
              />
            </div>
          </div>
        </div>

        {/* Custom Swatches Row */}
        <div>
          <span className="text-xs font-bold text-gray-600 block mb-3">Custom Palette Swatches</span>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            {swatches.map((colorHex, idx) => (
              <div
                key={idx}
                className="p-2.5 rounded-xl border border-gray-200 bg-white flex flex-col gap-2 group relative shadow-2xs"
              >
                <div
                  className="w-full h-12 rounded-lg border border-black/10 cursor-pointer transition-transform hover:scale-105"
                  style={{ backgroundColor: colorHex }}
                  onClick={() => handleCopy(colorHex)}
                  title="Click to copy HEX"
                />
                <div className="flex items-center justify-between gap-1">
                  <span
                    onClick={() => handleCopy(colorHex)}
                    className="text-[11px] font-mono font-semibold text-gray-800 hover:text-[#4F39F6] cursor-pointer"
                  >
                    {copiedHex === colorHex ? 'COPIED!' : colorHex}
                  </span>
                  {isManagerOrAdmin && (
                    <div className="flex items-center gap-1">
                      <input
                        type="color"
                        value={colorHex}
                        onChange={(e) => handleUpdateSwatch(idx, e.target.value.toUpperCase())}
                        className="w-4 h-4 rounded cursor-pointer p-0 border-0 bg-transparent"
                      />
                      {swatches.length > 2 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveSwatch(idx)}
                          className="text-gray-300 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* SECTION 4: Brand Voice & Target Persona */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
          <Mic className="w-4 h-4 text-[#4F39F6]" />
          Brand Voice, Tone & Creative Rules
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Tone of Voice
            </label>
            <input
              type="text"
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              placeholder="e.g. Authoritative, Empathetic, Witty"
              disabled={!isManagerOrAdmin}
              className="w-full px-3.5 py-2.5 text-xs bg-[#F8F9FC] border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#4F39F6]/20 focus:border-[#4F39F6] text-gray-900"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Content & Copy Style
            </label>
            <input
              type="text"
              value={style}
              onChange={(e) => setStyle(e.target.value)}
              placeholder="e.g. Concise, data-driven, storytelling"
              disabled={!isManagerOrAdmin}
              className="w-full px-3.5 py-2.5 text-xs bg-[#F8F9FC] border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#4F39F6]/20 focus:border-[#4F39F6] text-gray-900"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Keywords (comma-separated)
            </label>
            <input
              type="text"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="e.g. Innovation, Sustainability, Premium"
              disabled={!isManagerOrAdmin}
              className="w-full px-3.5 py-2.5 text-xs bg-[#F8F9FC] border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#4F39F6]/20 focus:border-[#4F39F6] text-gray-900"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/40 space-y-2">
            <div className="flex items-center gap-1.5 text-emerald-800 font-bold text-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Brand Do's (One per line)</span>
            </div>
            <textarea
              rows={3}
              value={dos}
              onChange={(e) => setDos(e.target.value)}
              placeholder="Use active voice&#10;Include product benefit in first 2 lines&#10;Celebrate customer achievements"
              disabled={!isManagerOrAdmin}
              className="w-full px-3 py-2 text-xs bg-white border border-emerald-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-gray-900 resize-none"
            />
          </div>

          <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/40 space-y-2">
            <div className="flex items-center gap-1.5 text-rose-800 font-bold text-xs">
              <XCircle className="w-4 h-4 text-rose-600" />
              <span>Brand Don'ts (One per line)</span>
            </div>
            <textarea
              rows={3}
              value={donts}
              onChange={(e) => setDonts(e.target.value)}
              placeholder="Do not use generic buzzwords&#10;Avoid all-caps headlines&#10;Never stretch or alter logos"
              disabled={!isManagerOrAdmin}
              className="w-full px-3 py-2 text-xs bg-white border border-rose-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500/20 text-gray-900 resize-none"
            />
          </div>
        </div>
      </div>

      {/* SECTION 5: Typography */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs space-y-6">
        <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
          <Type className="w-4 h-4 text-[#4F39F6]" />
          Brand Typography & Typefaces
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Primary Font */}
          <div className="p-4 rounded-xl border border-gray-200 bg-[#F8F9FC] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-700">Primary Font (Headings)</span>
              <span className="text-[11px] font-semibold text-[#4F39F6]">{primaryFont}</span>
            </div>
            {isManagerOrAdmin ? (
              <select
                value={primaryFont}
                onChange={(e) => setPrimaryFont(e.target.value)}
                className="w-full px-3.5 py-2 text-xs bg-white border border-gray-200 rounded-lg text-gray-900 font-medium"
              >
                <option value="Inter">Inter (Clean Sans)</option>
                <option value="Outfit">Outfit (Modern Tech)</option>
                <option value="Poppins">Poppins (Friendly Geometric)</option>
                <option value="Plus Jakarta Sans">Plus Jakarta Sans</option>
                <option value="Playfair Display">Playfair Display (Editorial Serif)</option>
                <option value="Montserrat">Montserrat (Strong Headline)</option>
              </select>
            ) : null}

            <div
              className="p-3 bg-white border border-gray-200 rounded-xl space-y-1"
              style={{ fontFamily: primaryFont }}
            >
              <h4 className="text-base font-bold text-gray-900">
                The quick brown fox jumps over the lazy dog.
              </h4>
              <p className="text-xs text-gray-500">
                Aa Bb Cc Dd Ee Ff Gg Hh Ii Jj Kk Ll Mm Nn Oo Pp Qq Rr Ss Tt Uu Vv Ww Xx Yy Zz 0123456789
              </p>
            </div>
          </div>

          {/* Secondary Font */}
          <div className="p-4 rounded-xl border border-gray-200 bg-[#F8F9FC] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-700">Secondary Font (Body)</span>
              <span className="text-[11px] font-semibold text-[#4F39F6]">{secondaryFont}</span>
            </div>
            {isManagerOrAdmin ? (
              <select
                value={secondaryFont}
                onChange={(e) => setSecondaryFont(e.target.value)}
                className="w-full px-3.5 py-2 text-xs bg-white border border-gray-200 rounded-lg text-gray-900 font-medium"
              >
                <option value="Inter">Inter (Readable Body)</option>
                <option value="Outfit">Outfit</option>
                <option value="Roboto">Roboto</option>
                <option value="Open Sans">Open Sans</option>
                <option value="Lato">Lato</option>
              </select>
            ) : null}

            <div
              className="p-3 bg-white border border-gray-200 rounded-xl space-y-1"
              style={{ fontFamily: secondaryFont }}
            >
              <p className="text-xs text-gray-800 leading-relaxed">
                Consistency in spacing, hierarchy, and font pairing ensures a unified brand voice across all social touchpoints and deliverables.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 6: Brand Guidelines Document & Editorial Notes */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs space-y-6">
        <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
          <FileText className="w-4 h-4 text-[#4F39F6]" />
          Brand Guidelines & Documentation
        </h3>

        {/* Guidelines Document Card */}
        <div className="p-4 rounded-xl border border-gray-200 bg-[#F8F9FC] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-[#4F39F6]/10 text-[#4F39F6] flex items-center justify-center shrink-0 font-bold">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-gray-900">
                {brandKit?.guidelinesFileName || 'Official Brand Guidelines Document'}
              </h4>
              <p className="text-[11px] text-gray-500">
                {brandKit?.guidelinesFileSize
                  ? `${(brandKit.guidelinesFileSize / 1024 / 1024).toFixed(2)} MB PDF/DOCX Document`
                  : 'Upload official Brand Identity guidelines document for client onboarding.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {brandKit?.guidelinesFileUrl ? (
              <a
                href={brandKit.guidelinesFileUrl}
                target="_blank"
                rel="noreferrer"
                download
                className="px-3.5 py-2 text-xs font-semibold text-white bg-[#4F39F6] hover:bg-[#4330D9] rounded-xl transition-colors flex items-center gap-1.5 shadow-2xs"
              >
                <Download className="w-3.5 h-3.5" />
                Download Document
              </a>
            ) : null}

            {isManagerOrAdmin && (
              <label className="px-3.5 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs">
                <Upload className="w-3.5 h-3.5" />
                <input
                  type="file"
                  accept="application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={(e) => handleUploadAssetFile(e, 'GUIDELINES')}
                  className="hidden"
                />
                {brandKit?.guidelinesFileUrl ? 'Replace Document' : 'Upload Document'}
              </label>
            )}
          </div>
        </div>

        {/* Editorial Notes */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1.5">
            Editorial Guidelines & Creative Rules
          </label>
          <textarea
            rows={3}
            value={guidelinesNotes}
            onChange={(e) => setGuidelinesNotes(e.target.value)}
            placeholder="e.g. Always keep 20% clear space around the logo. Never stretch or recolor the icon. Preferred tone of voice: professional, empathetic, and modern."
            disabled={!isManagerOrAdmin}
            className="w-full px-3.5 py-2.5 text-xs bg-[#F8F9FC] border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#4F39F6]/20 focus:border-[#4F39F6] text-gray-900 resize-none"
          />
        </div>
      </div>

      {/* SECTION 7: Brand Assets Repository */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-[#4F39F6]" />
            Brand Assets Gallery ({brandKit?.assets?.length || 0})
          </h3>

          {isManagerOrAdmin && (
            <label className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#4F39F6] hover:bg-[#4330D9] rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs self-start">
              <Plus className="w-3.5 h-3.5" />
              Upload Asset
              <input
                type="file"
                onChange={(e) => handleUploadAssetFile(e, 'OTHER')}
                className="hidden"
              />
            </label>
          )}
        </div>

        {brandKit?.assets && brandKit.assets.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-2">
            {brandKit.assets.map((asset) => (
              <div
                key={asset.id}
                className="group relative p-2 rounded-xl border border-gray-200 bg-[#F8F9FC] hover:bg-white hover:border-[#4F39F6]/40 transition-all flex flex-col justify-between"
              >
                <div className="w-full h-24 rounded-lg bg-white border border-gray-200 flex items-center justify-center p-2 mb-2 overflow-hidden">
                  {asset.fileUrl?.match(/\.(jpg|jpeg|png|webp|svg|gif)$/i) ? (
                    <img src={asset.fileUrl} alt={asset.assetName} className="max-h-full max-w-full object-contain" />
                  ) : (
                    <FileText className="w-8 h-8 text-gray-400" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold text-gray-900 truncate" title={asset.assetName}>
                    {asset.assetName}
                  </p>
                  <span className="text-[9px] font-bold text-[#4F39F6] uppercase">
                    {asset.assetType || 'ASSET'}
                  </span>
                </div>

                {/* Quick actions */}
                <div className="flex items-center justify-between mt-2 pt-1 border-t border-gray-200">
                  <a
                    href={asset.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    download
                    className="text-gray-400 hover:text-[#4F39F6]"
                    title="Download"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </a>
                  {isManagerOrAdmin && (
                    <button
                      type="button"
                      onClick={() => handleDeleteAsset(asset.id)}
                      className="text-gray-400 hover:text-red-500"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center bg-[#F8F9FC] rounded-xl border border-dashed border-gray-200 text-gray-400 text-xs">
            No brand assets uploaded yet. Upload vectors, banners, icons or guidelines files above.
          </div>
        )}
      </div>
    </div>
  );
};
