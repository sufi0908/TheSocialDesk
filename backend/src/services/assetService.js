const { db } = require('../config/database');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { allowedTypes, resolveFileDefinition, uploadRoot, cleanupUploadedFile } = require('../middleware/uploadMiddleware');

class AssetService {
  /**
   * Helper to compute SHA-256 hash of a local file.
   */
  async computeFileHash(filePath) {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const stream = fs.createReadStream(filePath);
      stream.on('data', (data) => hash.update(data));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', (err) => reject(err));
    });
  }

  /**
   * Upload asset with SHA-256 duplicate detection and metadata.
   */
  async createUploadedAsset(currentUser, workspaceId, file, data = {}) {
    if (!file) {
      const error = new Error('A file is required.');
      error.status = 400;
      throw error;
    }

    const definition = resolveFileDefinition(file.originalname, file.mimetype);
    if (file.size > (definition.max || 250 * 1024 * 1024)) {
      await cleanupUploadedFile(file);
      const error = new Error('The uploaded file exceeds the maximum allowed size limit.');
      error.status = 400;
      throw error;
    }

    // Safely validate clientId
    let validClientId = null;
    if (data.clientId !== undefined && data.clientId !== null && data.clientId !== '' && data.clientId !== 'All' && data.clientId !== 'all') {
      const parsedClientId = parseInt(data.clientId, 10);
      if (!isNaN(parsedClientId) && parsedClientId > 0) {
        const [clients] = await db.execute(
          'SELECT id FROM clients WHERE id = ? AND workspace_id = ? AND deleted_at IS NULL',
          [parsedClientId, workspaceId]
        );
        if (clients.length > 0) {
          validClientId = clients[0].id;
        }
      }
    }

    // Safely validate folderId
    let validFolderId = null;
    if (data.folderId !== undefined && data.folderId !== null && data.folderId !== '' && data.folderId !== 'ROOT' && data.folderId !== 'root' && data.folderId !== 'All' && data.folderId !== 'all') {
      const parsedFolderId = parseInt(data.folderId, 10);
      if (!isNaN(parsedFolderId) && parsedFolderId > 0) {
        const [folders] = await db.execute(
          'SELECT id FROM asset_folders WHERE id = ? AND workspace_id = ? AND deleted_at IS NULL',
          [parsedFolderId, workspaceId]
        );
        if (folders.length > 0) {
          validFolderId = folders[0].id;
        }
      }
    }

    // Safely validate projectId
    let validProjectId = null;
    if (data.projectId !== undefined && data.projectId !== null && data.projectId !== '') {
      const parsedProjectId = parseInt(data.projectId, 10);
      if (!isNaN(parsedProjectId) && parsedProjectId > 0) {
        const [projects] = await db.execute(
          'SELECT id FROM projects WHERE id = ? AND workspace_id = ? AND deleted_at IS NULL',
          [parsedProjectId, workspaceId]
        );
        if (projects.length > 0) {
          validProjectId = projects[0].id;
        }
      }
    }

    // Safely validate contentId
    let validContentId = null;
    if (data.contentId !== undefined && data.contentId !== null && data.contentId !== '') {
      const parsedContentId = parseInt(data.contentId, 10);
      if (!isNaN(parsedContentId) && parsedContentId > 0) {
        const [contents] = await db.execute(
          'SELECT id FROM content WHERE id = ? AND workspace_id = ? AND deleted_at IS NULL',
          [parsedContentId, workspaceId]
        );
        if (contents.length > 0) {
          validContentId = contents[0].id;
        }
      }
    }

    // 1. Compute SHA-256 Hash for Duplicate Detection
    const fileHash = await this.computeFileHash(file.path);

    // Check if exact duplicate exists in workspace
    const [duplicates] = await db.execute(
      `SELECT id, file_name, file_url, created_at
       FROM assets
       WHERE workspace_id = ? AND file_hash = ? AND deleted_at IS NULL`,
      [workspaceId, fileHash]
    );

    if (duplicates.length > 0 && !data.forceUpload) {
      await cleanupUploadedFile(file);
      const existing = await this.getAsset(workspaceId, duplicates[0].id, currentUser);
      return {
        ...existing,
        isDuplicate: true,
        message: 'An identical asset already exists in your workspace.',
        existingAsset: existing,
      };
    }

    const extension = path.extname(file.originalname).toLowerCase();
    const workspaceDirectory = path.join(uploadRoot, `workspace-${workspaceId}`, 'assets');
    await fs.promises.mkdir(workspaceDirectory, { recursive: true });
    const storageName = `${crypto.randomUUID()}${extension}`;
    const storagePath = path.join(workspaceDirectory, storageName);
    await fs.promises.rename(file.path, storagePath);

    const relativeStoragePath = path.relative(uploadRoot, storagePath).replace(/\\/g, '/');

    const [result] = await db.execute(
      `INSERT INTO assets
       (workspace_id, client_id, project_id, content_id, folder_id, uploaded_by, display_name, file_name, original_filename, storage_path, file_url, file_type, file_size, mime_type, file_hash, category, tags, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        workspaceId,
        validClientId,
        validProjectId,
        validContentId,
        validFolderId,
        currentUser.id,
        data.displayName || data.fileName || file.originalname,
        data.fileName || data.name || file.originalname,
        file.originalname,
        relativeStoragePath,
        '/api/assets/pending/file',
        definition.type,
        file.size,
        file.mimetype || definition.mime,
        fileHash,
        data.category || null,
        data.tags ? (typeof data.tags === 'string' ? data.tags : JSON.stringify(data.tags)) : null,
      ]
    );

    const assetId = result.insertId;
    await db.execute('UPDATE assets SET file_url = ? WHERE id = ?', [`/api/assets/${assetId}/file`, assetId]);

    if (validContentId) {
      await db.execute(
        `INSERT INTO content_assets (content_id, asset_id, created_at)
         VALUES (?, ?, NOW())
         ON DUPLICATE KEY UPDATE asset_id = VALUES(asset_id)`,
        [validContentId, assetId]
      );
    }

    return this.getAsset(workspaceId, assetId, currentUser);
  }

  async createUploadedAssetsBulk(currentUser, workspaceId, files = [], data = {}) {
    if (!Array.isArray(files) || files.length === 0) {
      const error = new Error('At least one file is required.');
      error.status = 400;
      throw error;
    }

    const results = [];
    for (const file of files) {
      const asset = await this.createUploadedAsset(currentUser, workspaceId, file, data);
      results.push(asset);
    }
    return results;
  }

  /**
   * Real MySQL Aggregations & Storage Statistics.
   */
  async getAssetStats(workspaceId, currentUser) {
    let clientFilterSql = '';
    const params = [workspaceId];

    if (currentUser && (currentUser.role === 'client_user' || currentUser.role === 'client')) {
      clientFilterSql = ' AND client_id IN (SELECT client_id FROM client_team WHERE user_id = ?)';
      params.push(currentUser.id);
    }

    // 1. Core Counters & Storage Aggregation
    const [overallRows] = await db.execute(
      `SELECT
         COUNT(*) as total_assets,
         COALESCE(SUM(file_size), 0) as total_storage_bytes,
         COALESCE(AVG(file_size), 0) as avg_file_size_bytes,
         COALESCE(MAX(file_size), 0) as largest_file_bytes,
         MAX(created_at) as newest_upload,
         MIN(created_at) as oldest_upload
       FROM assets
       WHERE workspace_id = ? AND deleted_at IS NULL ${clientFilterSql}`,
      params
    );

    const overall = overallRows[0];

    // 2. Type Counts
    const [typeRows] = await db.execute(
      `SELECT file_type, COUNT(*) as count, COALESCE(SUM(file_size), 0) as size_bytes
       FROM assets
       WHERE workspace_id = ? AND deleted_at IS NULL ${clientFilterSql}
       GROUP BY file_type`,
      params
    );

    let imagesCount = 0;
    let videosCount = 0;
    let documentsCount = 0;
    let otherCount = 0;

    let imagesBytes = 0;
    let videosBytes = 0;
    let documentsBytes = 0;
    let otherBytes = 0;

    typeRows.forEach((r) => {
      const type = (r.file_type || '').toUpperCase();
      const count = parseInt(r.count, 10);
      const bytes = parseInt(r.size_bytes, 10);

      if (type === 'IMAGE') {
        imagesCount += count;
        imagesBytes += bytes;
      } else if (type === 'VIDEO') {
        videosCount += count;
        videosBytes += bytes;
      } else if (type === 'DOCUMENT' || type === 'PDF') {
        documentsCount += count;
        documentsBytes += bytes;
      } else {
        otherCount += count;
        otherBytes += bytes;
      }
    });

    // 3. Storage By Client Aggregation
    const [clientStorageRows] = await db.execute(
      `SELECT c.id as client_id, c.company_name, c.name, COUNT(a.id) as asset_count, COALESCE(SUM(a.file_size), 0) as storage_bytes
       FROM assets a
       JOIN clients c ON a.client_id = c.id
       WHERE a.workspace_id = ? AND a.deleted_at IS NULL ${clientFilterSql}
       GROUP BY c.id, c.company_name, c.name
       ORDER BY storage_bytes DESC`,
      params
    );

    // 4. Default Storage Quota (20 GB in bytes = 21,474,836,480)
    const storageQuotaBytes = 20 * 1024 * 1024 * 1024;

    return {
      totalAssets: parseInt(overall.total_assets, 10),
      totalStorageBytes: parseInt(overall.total_storage_bytes, 10),
      avgFileSizeBytes: Math.round(overall.avg_file_size_bytes),
      largestFileBytes: parseInt(overall.largest_file_bytes, 10),
      newestUpload: overall.newest_upload,
      oldestUpload: overall.oldest_upload,
      storageQuotaBytes,
      counts: {
        images: imagesCount,
        videos: videosCount,
        documents: documentsCount,
        other: otherCount,
      },
      storageByType: {
        imagesBytes,
        videosBytes,
        documentsBytes,
        otherBytes,
      },
      storageByClient: clientStorageRows.map((r) => ({
        clientId: r.client_id,
        clientName: r.company_name || r.name,
        assetCount: parseInt(r.asset_count, 10),
        storageBytes: parseInt(r.storage_bytes, 10),
      })),
    };
  }

  /**
   * Advanced Paginated, Filtered, Sorted Asset Search.
   */
  async listAssets(workspaceId, filters = {}) {
    const {
      clientId,
      projectId,
      contentId,
      folderId,
      uploaderId,
      fileType,
      category,
      dateRange,
      sizeRange,
      search,
      sortBy = 'newest',
      page = 1,
      limit = 20,
      currentUser,
    } = filters;

    let query = `
      SELECT a.id, a.workspace_id, a.client_id, a.project_id, a.content_id, a.folder_id, a.uploaded_by,
             a.display_name, a.file_name, a.original_filename, a.storage_path, a.file_url, a.file_type, a.file_size, a.mime_type, a.file_hash,
             a.width, a.height, a.duration, a.category, a.tags, a.created_at,
             cli.name as client_name, cli.company_name as client_company_name,
             p.name as project_name,
             f.name as folder_name,
             u.full_name as uploader_name
      FROM assets a
      LEFT JOIN clients cli ON a.client_id = cli.id
      LEFT JOIN projects p ON a.project_id = p.id
      LEFT JOIN asset_folders f ON a.folder_id = f.id
      JOIN users u ON a.uploaded_by = u.id
      WHERE a.workspace_id = ? AND a.deleted_at IS NULL
    `;
    const params = [workspaceId];

    // Client Security Check
    if (currentUser && (currentUser.role === 'client_user' || currentUser.role === 'client')) {
      query += ' AND a.client_id IN (SELECT client_id FROM client_team WHERE user_id = ?)';
      params.push(currentUser.id);
    } else if (clientId && clientId !== 'All') {
      query += ' AND a.client_id = ?';
      params.push(clientId);
    }

    if (projectId && projectId !== 'All') {
      query += ' AND a.project_id = ?';
      params.push(projectId);
    }

    if (contentId) {
      query += ' AND a.content_id = ?';
      params.push(contentId);
    }

    if (folderId && folderId !== 'All') {
      if (folderId === 'ROOT') {
        query += ' AND a.folder_id IS NULL';
      } else {
        query += ' AND a.folder_id = ?';
        params.push(folderId);
      }
    }

    if (uploaderId && uploaderId !== 'All') {
      query += ' AND a.uploaded_by = ?';
      params.push(uploaderId);
    }

    if (fileType && fileType !== 'All') {
      query += ' AND a.file_type = ?';
      params.push(fileType.toUpperCase());
    }

    if (category && category !== 'All') {
      query += ' AND a.category = ?';
      params.push(category);
    }

    // Size Filter
    if (sizeRange && sizeRange !== 'All') {
      if (sizeRange === '<1MB') {
        query += ' AND a.file_size < 1048576';
      } else if (sizeRange === '1-10MB') {
        query += ' AND a.file_size BETWEEN 1048576 AND 10485760';
      } else if (sizeRange === '10-50MB') {
        query += ' AND a.file_size BETWEEN 10485760 AND 52428800';
      } else if (sizeRange === '50-100MB') {
        query += ' AND a.file_size BETWEEN 52428800 AND 104857600';
      } else if (sizeRange === '100MB+') {
        query += ' AND a.file_size > 104857600';
      }
    }

    // Date Range Filter
    if (dateRange && dateRange !== 'All') {
      if (dateRange === 'today') {
        query += ' AND DATE(a.created_at) = CURDATE()';
      } else if (dateRange === 'yesterday') {
        query += ' AND DATE(a.created_at) = DATE_SUB(CURDATE(), INTERVAL 1 DAY)';
      } else if (dateRange === 'last7days') {
        query += ' AND a.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
      } else if (dateRange === 'last30days') {
        query += ' AND a.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)';
      } else if (dateRange === 'thisMonth') {
        query += ' AND MONTH(a.created_at) = MONTH(NOW()) AND YEAR(a.created_at) = YEAR(NOW())';
      }
    }

    // Search
    if (search && search.trim()) {
      query += ' AND (a.file_name LIKE ? OR a.original_filename LIKE ? OR cli.name LIKE ? OR cli.company_name LIKE ? OR u.full_name LIKE ?)';
      const term = `%${search.trim()}%`;
      params.push(term, term, term, term, term);
    }

    // Sorting
    switch (sortBy) {
      case 'oldest':
        query += ' ORDER BY a.created_at ASC';
        break;
      case 'largest':
        query += ' ORDER BY a.file_size DESC';
        break;
      case 'smallest':
        query += ' ORDER BY a.file_size ASC';
        break;
      case 'name_asc':
        query += ' ORDER BY a.file_name ASC';
        break;
      case 'name_desc':
        query += ' ORDER BY a.file_name DESC';
        break;
      case 'newest':
      default:
        query += ' ORDER BY a.created_at DESC';
        break;
    }

    // Count Total matching rows
    const countQuery = `SELECT COUNT(*) as total FROM (${query}) AS subquery`;
    const [countRows] = await db.execute(countQuery, params);
    const total = countRows[0].total;

    // Apply Pagination LIMIT & OFFSET
    const numPage = Math.max(1, parseInt(page, 10));
    const numLimit = Math.max(1, parseInt(limit, 10));
    const offset = (numPage - 1) * numLimit;

    query += ' LIMIT ? OFFSET ?';
    params.push(numLimit, offset);

    const [rows] = await db.execute(query, params);

    for (const r of rows) {
      if (!r.file_size || r.file_size === 0) {
        await this.fixMissingFileSize(r);
      }
    }

    return {
      assets: rows,
      total,
      page: numPage,
      limit: numLimit,
      totalPages: Math.ceil(total / numLimit) || 1,
    };
  }

  /**
   * Auto-repair missing or 0 file_size from disk file stats.
   */
  async fixMissingFileSize(asset) {
    if (!asset || (asset.file_size && Number(asset.file_size) > 0)) {
      return asset;
    }
    if (asset.storage_path) {
      try {
        const absolutePath = path.isAbsolute(asset.storage_path)
          ? asset.storage_path
          : path.join(uploadRoot, asset.storage_path);
        if (fs.existsSync(absolutePath)) {
          const stats = fs.statSync(absolutePath);
          asset.file_size = stats.size;
          db.execute('UPDATE assets SET file_size = ? WHERE id = ?', [stats.size, asset.id]).catch(() => {});
        }
      } catch (err) {
        // ignore disk stat errors
      }
    }
    return asset;
  }

  /**
   * Get Asset Details + Usage breakdown.
   */
  async getAsset(workspaceId, assetId, currentUser) {
    let whereSql = 'a.id = ? AND a.deleted_at IS NULL';
    const params = [assetId];

    if (workspaceId !== undefined && workspaceId !== null) {
      whereSql = 'a.workspace_id = ? AND a.id = ? AND a.deleted_at IS NULL';
      params.unshift(workspaceId);
    }

    const [rows] = await db.execute(
      `SELECT a.id, a.workspace_id, a.client_id, a.project_id, a.content_id, a.folder_id, a.uploaded_by,
              a.display_name, a.file_name, a.original_filename, a.storage_path, a.file_url, a.file_type, a.file_size, a.mime_type, a.file_hash,
              a.width, a.height, a.duration, a.category, a.tags, a.created_at, a.updated_at,
              cli.name as client_name, cli.company_name as client_company_name,
              p.name as project_name,
              f.name as folder_name,
              u.full_name as uploader_name
       FROM assets a
       LEFT JOIN clients cli ON a.client_id = cli.id
       LEFT JOIN projects p ON a.project_id = p.id
       LEFT JOIN asset_folders f ON a.folder_id = f.id
       JOIN users u ON a.uploaded_by = u.id
       WHERE ${whereSql}`,
      params
    );

    if (rows.length === 0) {
      const error = new Error('Asset not found.');
      error.status = 404;
      throw error;
    }

    const asset = rows[0];
    if (!asset.file_size || asset.file_size === 0) {
      await this.fixMissingFileSize(asset);
    }


    // Client security check
    if (currentUser && (currentUser.role === 'client_user' || currentUser.role === 'client')) {
      if (asset.client_id) {
        const [matches] = await db.execute(
          'SELECT id FROM client_team WHERE user_id = ? AND client_id = ?',
          [currentUser.id, asset.client_id]
        );
        if (matches.length === 0) {
          const error = new Error('Permission denied. You cannot access this asset.');
          error.status = 403;
          throw error;
        }
      }
    }

    // Get asset usage across content, projects, and tasks
    const effectiveWorkspaceId = workspaceId || asset.workspace_id;
    const usage = await this.getAssetUsage(effectiveWorkspaceId, assetId);
    asset.usage = usage;

    return asset;
  }

  /**
   * Get Usage Breakdown for an asset (Content posts, projects, tasks).
   */
  async getAssetUsage(workspaceId, assetId) {
    let whereWorkspace = '';
    const params = [assetId, assetId];
    if (workspaceId !== undefined && workspaceId !== null) {
      whereWorkspace = ' AND c.workspace_id = ?';
      params.push(workspaceId);
    }

    // 1. Content Posts
    const [contentRows] = await db.execute(
      `SELECT DISTINCT c.id, c.title, c.status, c.created_at
       FROM content c
       LEFT JOIN content_assets ca ON c.id = ca.content_id
       WHERE (c.id IN (SELECT content_id FROM assets WHERE id = ?) OR ca.asset_id = ?)
         ${whereWorkspace} AND c.deleted_at IS NULL`,
      params
    );

    // 2. Projects
    let projWhere = '';
    const projParams = [assetId];
    if (workspaceId !== undefined && workspaceId !== null) {
      projWhere = ' AND workspace_id = ?';
      projParams.push(workspaceId);
    }
    const [projectRows] = await db.execute(
      `SELECT id, name, status FROM projects WHERE id IN (SELECT project_id FROM assets WHERE id = ?) ${projWhere} AND deleted_at IS NULL`,
      projParams
    );

    // 3. Tasks
    let taskWhere = '';
    const taskParams = [`%asset:${assetId}%`, `%asset:${assetId}%`];
    if (workspaceId !== undefined && workspaceId !== null) {
      taskWhere = 'workspace_id = ? AND ';
      taskParams.unshift(workspaceId);
    }
    const [taskRows] = await db.execute(
      `SELECT id, title, status FROM tasks WHERE ${taskWhere}deleted_at IS NULL AND (description LIKE ? OR title LIKE ?)`,
      taskParams
    );

    const totalUsageCount = contentRows.length + projectRows.length + taskRows.length;

    return {
      totalCount: totalUsageCount,
      contentPosts: contentRows,
      projects: projectRows,
      tasks: taskRows,
    };
  }

  async getAssetFile(workspaceId, assetId, currentUser) {
    const asset = await this.getAsset(workspaceId, assetId, currentUser);
    if (!asset.storage_path) {
      const error = new Error('Asset has no stored file.');
      error.status = 404;
      throw error;
    }

    const root = path.resolve(uploadRoot);
    const filePath = path.resolve(root, asset.storage_path);
    if (!filePath.startsWith(`${root}${path.sep}`)) {
      const error = new Error('Invalid asset path.');
      error.status = 400;
      throw error;
    }

    await fs.promises.access(filePath, fs.constants.R_OK);
    return { asset, filePath };
  }

  /**
   * Rename asset / update folder, category, tags.
   */
  async updateAsset(currentUser, workspaceId, assetId, data) {
    await this.getAsset(workspaceId, assetId, currentUser);

    const { fileName, displayName, name, category, tags, folderId, clientId, projectId, contentId } = data;
    const finalFileName = fileName || name || displayName;

    await db.execute(
      `UPDATE assets
       SET file_name = COALESCE(?, file_name),
           display_name = COALESCE(?, display_name),
           category = COALESCE(?, category),
           tags = COALESCE(?, tags),
           folder_id = COALESCE(?, folder_id),
           client_id = COALESCE(?, client_id),
           project_id = COALESCE(?, project_id),
           content_id = COALESCE(?, content_id),
           updated_at = NOW()
       WHERE id = ? AND workspace_id = ?`,
      [
        finalFileName || null,
        displayName || finalFileName || null,
        category || null,
        tags ? JSON.stringify(tags) : null,
        folderId || null,
        clientId || null,
        projectId || null,
        contentId || null,
        assetId,
        workspaceId,
      ]
    );

    return this.getAsset(workspaceId, assetId, currentUser);
  }

  /**
   * Delete Protection & Soft Deletion.
   */
  async deleteAsset(workspaceId, assetId, options = {}) {
    const asset = await this.getAsset(workspaceId, assetId);

    // Protection check
    if (asset.usage && asset.usage.totalCount > 0 && !options.forceDelete) {
      const error = new Error(`Cannot delete asset: It is currently used in ${asset.usage.totalCount} item(s).`);
      error.status = 409;
      error.usage = asset.usage;
      throw error;
    }

    await db.execute('UPDATE assets SET deleted_at = NOW() WHERE id = ? AND workspace_id = ?', [assetId, workspaceId]);
    await db.execute('DELETE FROM content_assets WHERE asset_id = ?', [assetId]);

    return { success: true, message: 'Asset soft-deleted successfully.', assetId: parseInt(assetId, 10) };
  }

  /**
   * Bulk Operations: Delete assets.
   */
  async bulkDeleteAssets(workspaceId, assetIds = [], options = {}) {
    if (!Array.isArray(assetIds) || assetIds.length === 0) return { success: true, count: 0 };

    let deletedCount = 0;
    for (const id of assetIds) {
      try {
        await this.deleteAsset(workspaceId, id, options);
        deletedCount++;
      } catch (e) {
        // Skip protected assets if bulk deleting without force
      }
    }
    return { success: true, count: deletedCount };
  }

  /**
   * Bulk Operations: Move assets to folder.
   */
  async bulkMoveAssets(workspaceId, assetIds = [], folderId = null) {
    if (!Array.isArray(assetIds) || assetIds.length === 0) return { success: true, count: 0 };

    const placeholders = assetIds.map(() => '?').join(',');
    await db.execute(
      `UPDATE assets SET folder_id = ?, updated_at = NOW() WHERE workspace_id = ? AND id IN (${placeholders})`,
      [folderId || null, workspaceId, ...assetIds]
    );

    return { success: true, count: assetIds.length };
  }

  // --- FOLDER MANAGEMENT METHODS ---

  async listFolders(workspaceId, clientId = null) {
    let query = `
      SELECT f.id, f.workspace_id, f.client_id, f.name, f.description, f.created_by, f.created_at,
             COUNT(a.id) as asset_count
      FROM asset_folders f
      LEFT JOIN assets a ON a.folder_id = f.id AND a.deleted_at IS NULL
      WHERE f.workspace_id = ? AND f.deleted_at IS NULL
    `;
    const params = [workspaceId];

    if (clientId && clientId !== 'All' && clientId !== 'all') {
      query += ' AND (f.client_id = ? OR f.client_id IS NULL)';
      params.push(clientId);
    }

    query += ' GROUP BY f.id, f.workspace_id, f.client_id, f.name, f.description, f.created_by, f.created_at ORDER BY f.name ASC';
    const [rows] = await db.execute(query, params);
    return rows;
  }

  async createFolder(currentUser, workspaceId, { name, description, clientId }) {
    if (currentUser && (currentUser.role === 'client' || currentUser.role === 'client_user')) {
      const error = new Error("You don't have permission to create folders.");
      error.status = 403;
      throw error;
    }

    if (!name || !name.trim()) {
      const error = new Error('Folder name is required.');
      error.status = 400;
      throw error;
    }

    const trimmedName = name.trim();
    if (trimmedName.length > 255) {
      const error = new Error('Folder name cannot exceed 255 characters.');
      error.status = 400;
      throw error;
    }

    const trimmedDesc = description && description.trim() ? description.trim() : null;

    const [result] = await db.execute(
      `INSERT INTO asset_folders (workspace_id, client_id, name, description, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
      [workspaceId, clientId || null, trimmedName, trimmedDesc, currentUser.id]
    );

    return {
      id: result.insertId,
      workspace_id: workspaceId,
      client_id: clientId || null,
      name: trimmedName,
      description: trimmedDesc,
      asset_count: 0,
      created_by: currentUser.id,
      created_at: new Date().toISOString(),
    };
  }

  async renameFolder(currentUser, workspaceId, folderId, data) {
    if (currentUser && (currentUser.role === 'client' || currentUser.role === 'client_user')) {
      const error = new Error("You don't have permission to modify this folder.");
      error.status = 403;
      throw error;
    }

    if (!folderId || folderId === 'All' || folderId === 'ROOT' || folderId === 'all' || folderId === 'root') {
      const error = new Error('System folders cannot be modified.');
      error.status = 400;
      throw error;
    }

    const parsedFolderId = parseInt(folderId, 10);
    if (isNaN(parsedFolderId)) {
      const error = new Error('Invalid folder ID.');
      error.status = 400;
      throw error;
    }

    const name = typeof data === 'object' && data !== null ? data.name : data;
    const description = typeof data === 'object' && data !== null ? data.description : undefined;

    if (!name || !name.trim()) {
      const error = new Error('Folder name is required.');
      error.status = 400;
      throw error;
    }

    const trimmedName = name.trim();
    if (trimmedName.length > 255) {
      const error = new Error('Folder name cannot exceed 255 characters.');
      error.status = 400;
      throw error;
    }

    // Verify folder exists and belongs to current workspace
    const [existing] = await db.execute(
      'SELECT id, name, description FROM asset_folders WHERE id = ? AND workspace_id = ? AND deleted_at IS NULL',
      [parsedFolderId, workspaceId]
    );

    if (existing.length === 0) {
      const error = new Error('Folder not found.');
      error.status = 404;
      throw error;
    }

    const trimmedDesc = description !== undefined ? (description && description.trim() ? description.trim() : null) : existing[0].description;

    await db.execute(
      'UPDATE asset_folders SET name = ?, description = ?, updated_at = NOW() WHERE id = ? AND workspace_id = ?',
      [trimmedName, trimmedDesc, parsedFolderId, workspaceId]
    );

    return {
      success: true,
      data: {
        id: parsedFolderId,
        workspace_id: workspaceId,
        name: trimmedName,
        description: trimmedDesc,
      },
    };
  }

  async deleteFolder(currentUser, workspaceId, folderId) {
    if (currentUser && (currentUser.role === 'client' || currentUser.role === 'client_user')) {
      const error = new Error("You don't have permission to modify this folder.");
      error.status = 403;
      throw error;
    }

    if (!folderId || folderId === 'All' || folderId === 'ROOT' || folderId === 'all' || folderId === 'root') {
      const error = new Error('System folders cannot be deleted.');
      error.status = 400;
      throw error;
    }

    const parsedFolderId = parseInt(folderId, 10);
    if (isNaN(parsedFolderId)) {
      const error = new Error('Invalid folder ID.');
      error.status = 400;
      throw error;
    }

    // Transactional deletion: Move contained assets to Unorganized (Root) -> folder_id = NULL, then soft-delete folder
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      // 1. Check folder exists in this workspace
      const [folders] = await connection.execute(
        'SELECT id, name FROM asset_folders WHERE id = ? AND workspace_id = ? AND deleted_at IS NULL FOR UPDATE',
        [parsedFolderId, workspaceId]
      );

      if (folders.length === 0) {
        const error = new Error('Folder not found.');
        error.status = 404;
        throw error;
      }

      const folderName = folders[0].name;

      // 2. Move all assets inside this folder to Unorganized (Root)
      await connection.execute(
        'UPDATE assets SET folder_id = NULL, updated_at = NOW() WHERE folder_id = ? AND workspace_id = ?',
        [parsedFolderId, workspaceId]
      );

      // 3. Soft-delete the folder
      await connection.execute(
        'UPDATE asset_folders SET deleted_at = NOW(), updated_at = NOW() WHERE id = ? AND workspace_id = ?',
        [parsedFolderId, workspaceId]
      );

      await connection.commit();

      return {
        success: true,
        folderId: parsedFolderId,
        message: `Folder "${folderName}" deleted. Assets moved to Unorganized (Root).`,
      };
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }
}

module.exports = new AssetService();
