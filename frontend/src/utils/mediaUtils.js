const API_ORIGIN =
  import.meta.env?.VITE_API_ORIGIN ||
  (import.meta.env?.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/api\/?$/, '') : '');

export const resolveMediaUrl = (input) => {
  if (!input) return '';

  let urlStr = '';
  if (typeof input === 'string') {
    urlStr = input;
  } else if (typeof input === 'object') {
    urlStr =
      input.url ||
      input.file_url ||
      input.fileUrl ||
      input.avatar_url ||
      input.avatarUrl ||
      input.avatar ||
      input.logo_url ||
      input.logoUrl ||
      input.logo ||
      '';
  }

  if (!urlStr || typeof urlStr !== 'string') return '';
  const trimmed = urlStr.trim();
  if (!trimmed) return '';

  // Data URLs and Blob URLs
  if (trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
    return trimmed;
  }

  // Absolute HTTP/HTTPS URLs
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  // Relative API or Upload URLs (e.g. /api/users/12/avatar, /uploads/profiles/...)
  if (trimmed.startsWith('/api/') || trimmed.startsWith('/uploads/')) {
    return `${API_ORIGIN}${trimmed}`;
  }

  if (trimmed.startsWith('uploads/')) {
    return `${API_ORIGIN}/${trimmed}`;
  }

  if (trimmed.startsWith('/')) {
    return `${API_ORIGIN}${trimmed}`;
  }

  return trimmed;
};

/**
 * Alias helper for global avatar/logo URL resolution
 */
export const getMediaUrl = (input) => resolveMediaUrl(input);

/**
 * Helper to compute user/client initials for avatar fallback display
 */
export const getInitials = (name) => {
  if (!name || typeof name !== 'string') return 'SD';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'SD';
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

/**
 * Canonical Asset Normalization Function for SocialDesk Media Pipeline
 * Normalizes snake_case or camelCase backend asset responses into ONE single source of truth:
 * { id, type, mimeType, url, thumbnailUrl, fileName, size }
 */
export const normalizeAsset = (asset) => {
  if (!asset) return null;

  // Handle URL string passed directly
  if (typeof asset === 'string') {
    const isVideo = /\.(mp4|webm|mov|mkv|avi|m4v)$/i.test(asset);
    const resolvedUrl = resolveMediaUrl(asset);
    return {
      id: asset,
      type: isVideo ? 'video' : 'image',
      mimeType: isVideo ? 'video/mp4' : 'image/jpeg',
      url: resolvedUrl,
      thumbnailUrl: isVideo ? null : resolvedUrl,
      fileName: asset.split('/').pop() || 'media_file',
      size: 'Media File',
    };
  }

  // Handle asset object (supporting both camelCase and snake_case backend fields, and unwrapping existingAsset / data)
  const rawObj = asset.existingAsset || asset.data || asset;
  const id = rawObj.id || rawObj.asset_id || rawObj.assetId || null;
  const fileName =
    rawObj.file_name ||
    rawObj.fileName ||
    rawObj.original_filename ||
    rawObj.originalFilename ||
    rawObj.name ||
    rawObj.displayName ||
    rawObj.title ||
    'Creative File';

  const rawUrl =
    rawObj.file_url ||
    rawObj.fileUrl ||
    rawObj.url ||
    rawObj.mediaUrl ||
    rawObj.media_url ||
    (id && !isNaN(Number(id)) ? `/api/assets/${id}/file` : '');

  const url = resolveMediaUrl(rawUrl);

  const mime = rawObj.mime_type || rawObj.mimeType || rawObj.mimetype || '';
  const fileType = rawObj.file_type || rawObj.fileType || rawObj.category || rawObj.type || '';
  const isVideo =
    mime.startsWith('video/') ||
    String(fileType).toUpperCase() === 'VIDEO' ||
    /\.(mp4|webm|mov|mkv|avi|m4v)$/i.test(url || fileName);

  const sizeInBytes = rawObj.file_size || rawObj.fileSize || rawObj.size_bytes || rawObj.sizeBytes;
  let formattedSize = rawObj.size || 'Media File';
  if (sizeInBytes && typeof sizeInBytes === 'number') {
    formattedSize = `${(sizeInBytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  const normalized = {
    id: id || url,
    type: isVideo ? 'video' : 'image',
    mimeType: mime || (isVideo ? 'video/mp4' : 'image/jpeg'),
    url,
    thumbnailUrl: isVideo ? null : url,
    fileName,
    size: formattedSize,
  };

  if (process.env.NODE_ENV !== 'production') {
    console.groupCollapsed(`[SocialDesk Media] Normalized Asset #${normalized.id}`);
    console.log('Raw Asset Input:', asset);
    console.log('Normalized Output:', normalized);
    console.groupEnd();
  }

  return normalized;
};
