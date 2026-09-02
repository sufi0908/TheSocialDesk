const { db } = require('../config/database');

function isValidHexColor(hex) {
  if (!hex || typeof hex !== 'string') return false;
  return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/i.test(hex.trim());
}

function sanitizeHex(hex, fallback = '#4F39F6') {
  if (isValidHexColor(hex)) return hex.trim().toUpperCase();
  return fallback;
}

class BrandKitService {
  /**
   * Fetch Brand Kit for a Client with logos, colors, fonts, guidelines, and social links.
   */
  async getBrandKit(workspaceId, clientId, currentUser) {
    if (!clientId) {
      const error = new Error('Client ID is required.');
      error.status = 400;
      throw error;
    }

    // Client Security Check: Client users can only access their assigned client brand kit
    if (currentUser && (currentUser.role === 'client_user' || currentUser.role === 'client')) {
      const [matches] = await db.execute(
        'SELECT id FROM client_team WHERE user_id = ? AND client_id = ?',
        [currentUser.id, clientId]
      );
      if (matches.length === 0) {
        const error = new Error('Permission denied. You can only view your assigned brand kit.');
        error.status = 403;
        throw error;
      }
    }

    // Verify client belongs to workspace
    const [clients] = await db.execute(
      'SELECT id, name, company_name, logo_url, industry, website, notes FROM clients WHERE id = ? AND workspace_id = ? AND deleted_at IS NULL',
      [clientId, workspaceId]
    );

    if (clients.length === 0) {
      const error = new Error('Client not found.');
      error.status = 404;
      throw error;
    }

    const clientItem = clients[0];
    const [rows] = await db.execute('SELECT * FROM brand_kits WHERE client_id = ?', [clientId]);

    let brandKit;
    if (rows.length === 0) {
      brandKit = {
        clientId: parseInt(clientId, 10),
        brandName: clientItem.company_name || clientItem.name,
        tagline: '',
        industry: clientItem.industry || '',
        website: clientItem.website || '',
        description: clientItem.notes || '',
        socialProfiles: null,
        brandVoice: { tone: '', style: '', keywords: [], dos: [], donts: [] },
        targetAudience: '',
        primaryColor: '#4F39F6',
        secondaryColor: '#000000',
        accentColor: '#FFFFFF',
        bgColor: '#FFFFFF',
        textColor: '#000000',
        colors: ['#4F39F6', '#000000', '#FFFFFF', '#6366F1', '#F8F9FC'],
        fontFamily: 'Inter, sans-serif',
        fonts: { primary: 'Inter', secondary: 'Outfit' },
        logoUrl: clientItem.logo_url || null,
        logoDarkUrl: null,
        logoLightUrl: null,
        iconUrl: null,
        guidelinesNotes: '',
        guidelinesFileUrl: null,
        guidelinesFileName: null,
        guidelinesFileSize: null,
        assets: [],
      };
    } else {
      const bk = rows[0];
      let parsedColors = ['#4F39F6', '#000000', '#FFFFFF'];
      if (bk.colors) {
        try {
          parsedColors = typeof bk.colors === 'string' ? JSON.parse(bk.colors) : bk.colors;
        } catch (e) {
          parsedColors = [bk.primary_color, bk.secondary_color].filter(Boolean);
        }
      }

      let parsedFonts = { primary: bk.font_family || 'Inter', secondary: 'Outfit' };
      if (bk.fonts) {
        try {
          parsedFonts = typeof bk.fonts === 'string' ? JSON.parse(bk.fonts) : bk.fonts;
        } catch (e) {}
      }

      let parsedSocialProfiles = null;
      if (bk.social_profiles) {
        try {
          parsedSocialProfiles = typeof bk.social_profiles === 'string' ? JSON.parse(bk.social_profiles) : bk.social_profiles;
        } catch (e) {}
      }

      let parsedBrandVoice = { tone: '', style: '', keywords: [], dos: [], donts: [] };
      if (bk.brand_voice) {
        try {
          parsedBrandVoice = typeof bk.brand_voice === 'string' ? JSON.parse(bk.brand_voice) : bk.brand_voice;
        } catch (e) {}
      }

      brandKit = {
        id: bk.id,
        clientId: bk.client_id,
        brandName: bk.brand_name || clientItem.company_name || clientItem.name,
        tagline: bk.tagline || '',
        industry: bk.industry || clientItem.industry || '',
        website: bk.website || clientItem.website || '',
        description: bk.description || clientItem.notes || '',
        socialProfiles: parsedSocialProfiles,
        brandVoice: parsedBrandVoice,
        targetAudience: bk.target_audience || '',
        primaryColor: sanitizeHex(bk.primary_color, '#4F39F6'),
        secondaryColor: sanitizeHex(bk.secondary_color, '#000000'),
        accentColor: sanitizeHex(bk.accent_color, '#FFFFFF'),
        bgColor: bk.bg_color ? sanitizeHex(bk.bg_color, '#FFFFFF') : '#FFFFFF',
        textColor: bk.text_color ? sanitizeHex(bk.text_color, '#000000') : '#000000',
        colors: Array.isArray(parsedColors) ? parsedColors : ['#4F39F6', '#000000', '#FFFFFF'],
        fontFamily: bk.font_family || 'Inter, sans-serif',
        fonts: parsedFonts,
        logoUrl: bk.logo_url || clientItem.logo_url || null,
        logoDarkUrl: bk.logo_dark_url || null,
        logoLightUrl: bk.logo_light_url || null,
        iconUrl: bk.icon_url || null,
        guidelinesNotes: bk.guidelines_notes || '',
        guidelinesFileUrl: bk.guidelines_file_url || null,
        guidelinesFileName: bk.guidelines_file_name || null,
        guidelinesFileSize: bk.guidelines_file_size || null,
      };

      const [baRows] = await db.execute(
        'SELECT id, asset_name as assetName, asset_type as assetType, file_url as fileUrl, created_at as createdAt FROM brand_assets WHERE brand_kit_id = ? ORDER BY created_at DESC',
        [bk.id]
      );
      brandKit.assets = baRows;
    }

    return brandKit;
  }

  /**
   * Upload and associate an asset to a Client's Brand Kit.
   */
  async uploadBrandAsset(currentUser, workspaceId, clientId, file, data = {}) {
    if (!clientId) {
      const error = new Error('Client ID is required.');
      error.status = 400;
      throw error;
    }
    if (!file) {
      const error = new Error('File is required.');
      error.status = 400;
      throw error;
    }

    const assetService = require('./assetService');
    const assetType = (data.assetType || data.type || 'LOGO').toUpperCase();
    const uploadedAsset = await assetService.createUploadedAsset(currentUser, workspaceId, file, {
      clientId,
      category: 'BRAND',
      name: data.assetName || data.name || file.originalname,
      tags: ['BrandKit', assetType],
    });

    const [existingKits] = await db.execute('SELECT id FROM brand_kits WHERE client_id = ?', [clientId]);
    let brandKitId;
    if (existingKits.length === 0) {
      const [newKit] = await db.execute(
        'INSERT INTO brand_kits (client_id, brand_name, primary_color, secondary_color, accent_color, created_at) VALUES (?, ?, "#4F39F6", "#000000", "#FFFFFF", NOW())',
        [clientId, data.brandName || 'Brand Kit']
      );
      brandKitId = newKit.insertId;
    } else {
      brandKitId = existingKits[0].id;
    }

    const validAssetType = ['LOGO', 'PRIMARY_LOGO', 'DARK_LOGO', 'LIGHT_LOGO', 'ICON', 'GUIDELINES', 'DOCUMENT', 'FONT', 'BANNER', 'OTHER'].includes(assetType)
      ? assetType
      : 'LOGO';

    const [baResult] = await db.execute(
      `INSERT INTO brand_assets (brand_kit_id, asset_name, asset_type, storage_path, file_url, created_at)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [
        brandKitId,
        data.assetName || file.originalname,
        validAssetType,
        uploadedAsset.storage_path || null,
        uploadedAsset.file_url,
      ]
    );

    // If marked as primary logo or is Logo, update brand_kit and client logo_url
    if (data.isPrimaryLogo || validAssetType === 'PRIMARY_LOGO' || validAssetType === 'LOGO' || data.assetRole === 'primary_logo') {
      await db.execute('UPDATE brand_kits SET logo_url = ?, updated_at = NOW() WHERE id = ?', [uploadedAsset.file_url, brandKitId]);
      await db.execute('UPDATE clients SET logo_url = ?, updated_at = NOW() WHERE id = ? AND workspace_id = ?', [uploadedAsset.file_url, clientId, workspaceId]);
    } else if (validAssetType === 'DARK_LOGO') {
      await db.execute('UPDATE brand_kits SET logo_dark_url = ?, updated_at = NOW() WHERE id = ?', [uploadedAsset.file_url, brandKitId]);
    } else if (validAssetType === 'LIGHT_LOGO') {
      await db.execute('UPDATE brand_kits SET logo_light_url = ?, updated_at = NOW() WHERE id = ?', [uploadedAsset.file_url, brandKitId]);
    } else if (validAssetType === 'ICON') {
      await db.execute('UPDATE brand_kits SET icon_url = ?, updated_at = NOW() WHERE id = ?', [uploadedAsset.file_url, brandKitId]);
    } else if (validAssetType === 'GUIDELINES' || validAssetType === 'DOCUMENT' || file.mimetype === 'application/pdf') {
      await db.execute(
        'UPDATE brand_kits SET guidelines_file_url = ?, guidelines_file_name = ?, guidelines_file_size = ?, updated_at = NOW() WHERE id = ?',
        [uploadedAsset.file_url, file.originalname, file.size, brandKitId]
      );
    }

    return {
      success: true,
      message: 'Brand asset uploaded successfully.',
      brandAssetId: baResult.insertId,
      asset: uploadedAsset,
      brandKit: await this.getBrandKit(workspaceId, clientId, currentUser),
    };
  }

  /**
   * Delete a brand asset.
   */
  async deleteBrandAsset(currentUser, workspaceId, clientId, brandAssetId) {
    const [rows] = await db.execute(
      `SELECT ba.id, ba.storage_path, ba.file_url, ba.brand_kit_id
       FROM brand_assets ba
       JOIN brand_kits bk ON ba.brand_kit_id = bk.id
       JOIN clients c ON bk.client_id = c.id
       WHERE ba.id = ? AND c.id = ? AND c.workspace_id = ?`,
      [brandAssetId, clientId, workspaceId]
    );

    if (rows.length === 0) {
      const error = new Error('Brand asset not found.');
      error.status = 404;
      throw error;
    }

    await db.execute('DELETE FROM brand_assets WHERE id = ?', [brandAssetId]);
    return { success: true, message: 'Brand asset deleted successfully.', brandAssetId: parseInt(brandAssetId, 10) };
  }

  /**
   * Upsert Brand Kit (colors, fonts, logos, guidelines, information).
   */
  async upsertBrandKit(currentUser, workspaceId, clientId, data) {
    if (!clientId) {
      const error = new Error('Client ID is required.');
      error.status = 400;
      throw error;
    }

    const {
      brandName,
      tagline,
      industry,
      website,
      description,
      socialProfiles,
      primaryColor,
      secondaryColor,
      accentColor,
      bgColor,
      textColor,
      colors,
      fontFamily,
      fonts,
      logoUrl,
      guidelinesNotes,
      brandVoice,
      targetAudience,
    } = data || {};

    const [clients] = await db.execute(
      'SELECT id, name, company_name FROM clients WHERE id = ? AND workspace_id = ? AND deleted_at IS NULL',
      [clientId, workspaceId]
    );

    if (clients.length === 0) {
      const error = new Error('Client not found.');
      error.status = 404;
      throw error;
    }

    // Validate colors if provided
    let cleanPrimary = primaryColor ? sanitizeHex(primaryColor, '#4F39F6') : null;
    let cleanSecondary = secondaryColor ? sanitizeHex(secondaryColor, '#000000') : null;
    let cleanAccent = accentColor ? sanitizeHex(accentColor, '#FFFFFF') : null;
    let cleanBg = bgColor ? sanitizeHex(bgColor, '#FFFFFF') : null;
    let cleanText = textColor ? sanitizeHex(textColor, '#000000') : null;

    let cleanColorsList = null;
    if (colors && Array.isArray(colors)) {
      cleanColorsList = colors
        .filter((c) => typeof c === 'string' && isValidHexColor(c))
        .map((c) => c.trim().toUpperCase());
    }

    const finalBrandName = brandName || clients[0].company_name || clients[0].name;

    const [existing] = await db.execute('SELECT id FROM brand_kits WHERE client_id = ?', [clientId]);

    if (existing.length === 0) {
      await db.execute(
        `INSERT INTO brand_kits (
          client_id, brand_name, tagline, industry, website, description,
          social_profiles, brand_voice, target_audience, primary_color, secondary_color, accent_color,
          bg_color, text_color, colors, font_family, fonts, logo_url, guidelines_notes, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          clientId,
          finalBrandName || '',
          tagline || null,
          industry || null,
          website || null,
          description || null,
          socialProfiles ? (typeof socialProfiles === 'string' ? socialProfiles : JSON.stringify(socialProfiles)) : null,
          brandVoice ? (typeof brandVoice === 'string' ? brandVoice : JSON.stringify(brandVoice)) : null,
          targetAudience || null,
          cleanPrimary || '#4F39F6',
          cleanSecondary || '#000000',
          cleanAccent || '#FFFFFF',
          cleanBg || '#FFFFFF',
          cleanText || '#000000',
          cleanColorsList ? JSON.stringify(cleanColorsList) : JSON.stringify(['#4F39F6', '#000000', '#FFFFFF']),
          fontFamily || 'Inter, sans-serif',
          fonts ? (typeof fonts === 'string' ? fonts : JSON.stringify(fonts)) : JSON.stringify({ primary: 'Inter', secondary: 'Outfit' }),
          logoUrl || null,
          guidelinesNotes || null,
        ]
      );
    } else {
      const updates = [];
      const params = [];

      if (brandName !== undefined) {
        updates.push('brand_name = ?');
        params.push(finalBrandName);
      }
      if (tagline !== undefined) {
        updates.push('tagline = ?');
        params.push(tagline || null);
      }
      if (industry !== undefined) {
        updates.push('industry = ?');
        params.push(industry || null);
      }
      if (website !== undefined) {
        updates.push('website = ?');
        params.push(website || null);
      }
      if (description !== undefined) {
        updates.push('description = ?');
        params.push(description || null);
      }
      if (socialProfiles !== undefined) {
        updates.push('social_profiles = ?');
        params.push(socialProfiles ? (typeof socialProfiles === 'string' ? socialProfiles : JSON.stringify(socialProfiles)) : null);
      }
      if (brandVoice !== undefined) {
        updates.push('brand_voice = ?');
        params.push(brandVoice ? (typeof brandVoice === 'string' ? brandVoice : JSON.stringify(brandVoice)) : null);
      }
      if (targetAudience !== undefined) {
        updates.push('target_audience = ?');
        params.push(targetAudience || null);
      }
      if (cleanPrimary !== null) {
        updates.push('primary_color = ?');
        params.push(cleanPrimary);
      }
      if (cleanSecondary !== null) {
        updates.push('secondary_color = ?');
        params.push(cleanSecondary);
      }
      if (cleanAccent !== null) {
        updates.push('accent_color = ?');
        params.push(cleanAccent);
      }
      if (cleanBg !== null) {
        updates.push('bg_color = ?');
        params.push(cleanBg);
      }
      if (cleanText !== null) {
        updates.push('text_color = ?');
        params.push(cleanText);
      }
      if (cleanColorsList !== null) {
        updates.push('colors = ?');
        params.push(JSON.stringify(cleanColorsList));
      }
      if (fontFamily !== undefined) {
        updates.push('font_family = ?');
        params.push(fontFamily || null);
      }
      if (fonts !== undefined) {
        updates.push('fonts = ?');
        params.push(fonts ? (typeof fonts === 'string' ? fonts : JSON.stringify(fonts)) : null);
      }
      if (logoUrl !== undefined) {
        updates.push('logo_url = ?');
        params.push(logoUrl || null);
      }
      if (guidelinesNotes !== undefined) {
        updates.push('guidelines_notes = ?');
        params.push(guidelinesNotes || null);
      }

      if (updates.length > 0) {
        updates.push('updated_at = NOW()');
        params.push(existing[0].id);
        await db.execute(
          `UPDATE brand_kits SET ${updates.join(', ')} WHERE id = ?`,
          params
        );
      }
    }

    // Sync client logo_url if provided
    if (logoUrl) {
      await db.execute(
        'UPDATE clients SET logo_url = ?, updated_at = NOW() WHERE id = ? AND workspace_id = ?',
        [logoUrl, clientId, workspaceId]
      );
    }

    return this.getBrandKit(workspaceId, clientId, currentUser);
  }
}

module.exports = new BrandKitService();

