const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : '',
  database: process.env.DB_NAME || 'socialdesk',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

/**
 * Tests the MySQL database connection pool.
 * @returns {Promise<boolean>}
 */
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    await connection.ping();
    console.log(
      `[Database] Successfully connected to MySQL database "${process.env.DB_NAME || 'socialdesk'}" at ${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 3306}`
    );

    // Ensure `todos` table exists
    await connection.query(`
      CREATE TABLE IF NOT EXISTS \`todos\` (
        \`id\` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        \`user_id\` INT UNSIGNED NOT NULL,
        \`workspace_id\` INT UNSIGNED DEFAULT NULL,
        \`title\` VARCHAR(255) NOT NULL,
        \`description\` TEXT DEFAULT NULL,
        \`status\` ENUM('TODO', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'TODO',
        \`priority\` ENUM('LOW', 'MEDIUM', 'HIGH', 'URGENT') NOT NULL DEFAULT 'MEDIUM',
        \`category\` VARCHAR(50) NOT NULL DEFAULT 'General',
        \`due_date\` DATE DEFAULT NULL,
        \`due_time\` TIME DEFAULT NULL,
        \`completed_at\` DATETIME DEFAULT NULL,
        \`related_task_id\` INT UNSIGNED DEFAULT NULL,
        \`related_content_id\` INT UNSIGNED DEFAULT NULL,
        \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        \`deleted_at\` DATETIME DEFAULT NULL,
        INDEX \`idx_todos_user_id\` (\`user_id\`),
        INDEX \`idx_todos_workspace_id\` (\`workspace_id\`),
        INDEX \`idx_todos_status\` (\`status\`),
        INDEX \`idx_todos_priority\` (\`priority\`),
        INDEX \`idx_todos_due_date\` (\`due_date\`),
        INDEX \`idx_todos_created_at\` (\`created_at\`),
        INDEX \`idx_todos_deleted_at\` (\`deleted_at\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Ensure `revision_requests` table exists
    await connection.query(`
      CREATE TABLE IF NOT EXISTS \`revision_requests\` (
        \`id\` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        \`content_id\` INT UNSIGNED NOT NULL,
        \`requested_by\` INT UNSIGNED NOT NULL,
        \`assigned_to\` INT UNSIGNED DEFAULT NULL,
        \`workspace_id\` INT UNSIGNED NOT NULL,
        \`client_id\` INT UNSIGNED NOT NULL,
        \`reason\` TEXT NOT NULL,
        \`priority\` ENUM('LOW', 'MEDIUM', 'HIGH', 'URGENT') NOT NULL DEFAULT 'MEDIUM',
        \`due_date\` DATE DEFAULT NULL,
        \`due_time\` TIME DEFAULT NULL,
        \`status\` ENUM('OPEN', 'IN_PROGRESS', 'RESUBMITTED', 'RESOLVED', 'CANCELLED') NOT NULL DEFAULT 'OPEN',
        \`started_at\` DATETIME DEFAULT NULL,
        \`started_by\` INT UNSIGNED DEFAULT NULL,
        \`resubmitted_at\` DATETIME DEFAULT NULL,
        \`changes_made\` TEXT DEFAULT NULL,
        \`resolved_at\` DATETIME DEFAULT NULL,
        \`resolved_by\` INT UNSIGNED DEFAULT NULL,
        \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        \`deleted_at\` DATETIME DEFAULT NULL,
        INDEX \`idx_rr_content_id\` (\`content_id\`),
        INDEX \`idx_rr_requested_by\` (\`requested_by\`),
        INDEX \`idx_rr_assigned_to\` (\`assigned_to\`),
        INDEX \`idx_rr_workspace_id\` (\`workspace_id\`),
        INDEX \`idx_rr_client_id\` (\`client_id\`),
        INDEX \`idx_rr_status\` (\`status\`),
        INDEX \`idx_rr_due_date\` (\`due_date\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Ensure `asset_folders` table exists
    await connection.query(`
      CREATE TABLE IF NOT EXISTS \`asset_folders\` (
        \`id\` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        \`workspace_id\` INT UNSIGNED NOT NULL,
        \`client_id\` INT UNSIGNED DEFAULT NULL,
        \`name\` VARCHAR(255) NOT NULL,
        \`description\` TEXT DEFAULT NULL,
        \`created_by\` INT UNSIGNED NOT NULL,
        \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        \`deleted_at\` DATETIME DEFAULT NULL,
        INDEX \`idx_af_workspace_id\` (\`workspace_id\`),
        INDEX \`idx_af_client_id\` (\`client_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    try {
      await connection.query("ALTER TABLE `asset_folders` ADD COLUMN `description` TEXT DEFAULT NULL AFTER `name`;");
    } catch (err) {
      // Column might already exist
    }

    // Ensure chat_groups table exists
    await connection.query(`
      CREATE TABLE IF NOT EXISTS \`chat_groups\` (
        \`id\` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        \`workspace_id\` INT UNSIGNED NOT NULL,
        \`name\` VARCHAR(150) NOT NULL,
        \`description\` TEXT DEFAULT NULL,
        \`image\` VARCHAR(500) DEFAULT NULL,
        \`created_by\` INT UNSIGNED NOT NULL,
        \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        \`archived_at\` DATETIME DEFAULT NULL,
        INDEX \`idx_cg_workspace_id\` (\`workspace_id\`),
        INDEX \`idx_cg_created_by\` (\`created_by\`),
        INDEX \`idx_cg_archived_at\` (\`archived_at\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Ensure chat_group_members table exists
    await connection.query(`
      CREATE TABLE IF NOT EXISTS \`chat_group_members\` (
        \`id\` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        \`group_id\` INT UNSIGNED NOT NULL,
        \`user_id\` INT UNSIGNED NOT NULL,
        \`role\` ENUM('ADMIN', 'MEMBER') NOT NULL DEFAULT 'MEMBER',
        \`joined_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`left_at\` DATETIME DEFAULT NULL,
        \`is_muted\` TINYINT(1) NOT NULL DEFAULT 0,
        \`mute_until\` DATETIME DEFAULT NULL,
        \`is_pinned\` TINYINT(1) NOT NULL DEFAULT 0,
        UNIQUE KEY \`uk_chat_group_user\` (\`group_id\`, \`user_id\`),
        INDEX \`idx_cgm_group_id\` (\`group_id\`),
        INDEX \`idx_cgm_user_id\` (\`user_id\`),
        INDEX \`idx_cgm_is_muted\` (\`is_muted\`),
        INDEX \`idx_cgm_is_pinned\` (\`is_pinned\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Ensure chat_messages table exists
    await connection.query(`
      CREATE TABLE IF NOT EXISTS \`chat_messages\` (
        \`id\` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        \`group_id\` INT UNSIGNED NOT NULL,
        \`sender_id\` INT UNSIGNED NOT NULL,
        \`message_type\` ENUM('TEXT', 'IMAGE', 'VIDEO', 'DOCUMENT', 'VOICE_NOTE', 'CONTENT', 'ASSET', 'TASK', 'SYSTEM') NOT NULL DEFAULT 'TEXT',
        \`message\` TEXT DEFAULT NULL,
        \`content_id\` INT UNSIGNED DEFAULT NULL,
        \`task_id\` INT UNSIGNED DEFAULT NULL,
        \`asset_id\` INT UNSIGNED DEFAULT NULL,
        \`reply_to_message_id\` INT UNSIGNED DEFAULT NULL,
        \`is_edited\` TINYINT(1) NOT NULL DEFAULT 0,
        \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        \`deleted_at\` DATETIME DEFAULT NULL,
        INDEX \`idx_cm_group_id\` (\`group_id\`),
        INDEX \`idx_cm_sender_id\` (\`sender_id\`),
        INDEX \`idx_cm_content_id\` (\`content_id\`),
        INDEX \`idx_cm_task_id\` (\`task_id\`),
        INDEX \`idx_cm_asset_id\` (\`asset_id\`),
        INDEX \`idx_cm_reply_to\` (\`reply_to_message_id\`),
        INDEX \`idx_cm_created_at\` (\`created_at\`),
        INDEX \`idx_cm_deleted_at\` (\`deleted_at\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Ensure chat_message_attachments table exists
    await connection.query(`
      CREATE TABLE IF NOT EXISTS \`chat_message_attachments\` (
        \`id\` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        \`message_id\` INT UNSIGNED NOT NULL,
        \`asset_id\` INT UNSIGNED DEFAULT NULL,
        \`file_name\` VARCHAR(255) NOT NULL,
        \`file_size\` INT UNSIGNED DEFAULT 0,
        \`mime_type\` VARCHAR(100) DEFAULT NULL,
        \`storage_path\` VARCHAR(500) NOT NULL,
        \`duration\` DOUBLE DEFAULT NULL,
        \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX \`idx_cma_message_id\` (\`message_id\`),
        INDEX \`idx_cma_asset_id\` (\`asset_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Ensure chat_message_reactions table exists
    await connection.query(`
      CREATE TABLE IF NOT EXISTS \`chat_message_reactions\` (
        \`id\` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        \`message_id\` INT UNSIGNED NOT NULL,
        \`user_id\` INT UNSIGNED NOT NULL,
        \`reaction\` VARCHAR(32) NOT NULL,
        \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY \`uk_chat_reaction\` (\`message_id\`, \`user_id\`, \`reaction\`),
        INDEX \`idx_cmr_message_id\` (\`message_id\`),
        INDEX \`idx_cmr_user_id\` (\`user_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Ensure chat_message_reads table exists
    await connection.query(`
      CREATE TABLE IF NOT EXISTS \`chat_message_reads\` (
        \`id\` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        \`group_id\` INT UNSIGNED NOT NULL,
        \`user_id\` INT UNSIGNED NOT NULL,
        \`last_read_message_id\` INT UNSIGNED NOT NULL,
        \`read_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY \`uk_chat_group_user_read\` (\`group_id\`, \`user_id\`),
        INDEX \`idx_cmread_group_id\` (\`group_id\`),
        INDEX \`idx_cmread_user_id\` (\`user_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Safely add missing columns to chat_groups if needed
    try {
      await connection.query("ALTER TABLE `chat_groups` ADD COLUMN `group_type` VARCHAR(50) NOT NULL DEFAULT 'General'");
    } catch (e) {}

    // Safely add missing columns to assets if needed
    const columnsToEnsure = [
      { name: 'folder_id', type: 'INT UNSIGNED DEFAULT NULL' },
      { name: 'display_name', type: 'VARCHAR(255) DEFAULT NULL' },
      { name: 'storage_path', type: 'VARCHAR(500) DEFAULT NULL' },
      { name: 'file_hash', type: 'VARCHAR(64) DEFAULT NULL' },
      { name: 'width', type: 'INT UNSIGNED DEFAULT NULL' },
      { name: 'height', type: 'INT UNSIGNED DEFAULT NULL' },
      { name: 'duration', type: 'DOUBLE DEFAULT NULL' },
    ];

    for (const col of columnsToEnsure) {
      try {
        await connection.query(`ALTER TABLE \`assets\` ADD COLUMN \`${col.name}\` ${col.type}`);
      } catch (e) {
        // Ignore if column already exists
      }
    }

    const userColumnsToEnsure = [
      { name: 'job_title', type: 'VARCHAR(150) DEFAULT NULL' },
      { name: 'department', type: 'VARCHAR(150) DEFAULT NULL' },
      { name: 'bio', type: 'TEXT DEFAULT NULL' },
    ];

    for (const col of userColumnsToEnsure) {
      try {
        await connection.query(`ALTER TABLE \`users\` ADD COLUMN \`${col.name}\` ${col.type}`);
      } catch (e) {
        // Ignore if column already exists
      }
    }

    // Safely add missing relationship columns across tasks, content_approvals, and notifications
    try {
      await connection.query('ALTER TABLE `tasks` ADD COLUMN `content_id` INT UNSIGNED DEFAULT NULL');
    } catch (e) {}

    try {
      await connection.query('ALTER TABLE `tasks` ADD COLUMN `instructions` TEXT NULL');
    } catch (e) {}

    try {
      await connection.query('ALTER TABLE `tasks` ADD COLUMN `due_time` VARCHAR(20) NULL');
    } catch (e) {}

    try {
      await connection.query('ALTER TABLE `tasks` ADD COLUMN `completed_at` DATETIME NULL');
    } catch (e) {}

    try {
      await connection.query(`ALTER TABLE \`tasks\` MODIFY COLUMN \`status\` ENUM('TODO','IN_PROGRESS','READY_FOR_REVIEW','IN_REVIEW','REVIEW','REVISION','REVISION_REQUIRED','COMPLETED','BLOCKED','CANCELLED','REOPENED') NOT NULL DEFAULT 'TODO'`);
    } catch (e) {}

    // Ensure task_attachments table exists
    await connection.query(`
      CREATE TABLE IF NOT EXISTS \`task_attachments\` (
        \`id\` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        \`workspace_id\` INT UNSIGNED NOT NULL,
        \`task_id\` INT UNSIGNED NOT NULL,
        \`asset_id\` INT UNSIGNED NULL,
        \`user_id\` INT UNSIGNED NOT NULL,
        \`file_name\` VARCHAR(255) NOT NULL,
        \`file_url\` VARCHAR(500) NOT NULL,
        \`file_type\` VARCHAR(100) NULL,
        \`file_size\` INT UNSIGNED NULL,
        \`attachment_type\` ENUM('REFERENCE', 'SUBMISSION') DEFAULT 'REFERENCE',
        \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
        \`deleted_at\` DATETIME NULL,
        INDEX \`idx_task_id\` (\`task_id\`),
        INDEX \`idx_workspace_id\` (\`workspace_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Auto-heal legacy task_attachments with blob: URLs or missing asset_ids
    try {
      await connection.query(`
        UPDATE task_attachments ta
        JOIN assets a ON (ta.file_size = a.file_size OR ta.file_name = a.file_name)
          AND ta.workspace_id = a.workspace_id
          AND a.deleted_at IS NULL
        SET ta.asset_id = a.id,
            ta.file_url = COALESCE(a.file_url, CONCAT('/api/assets/', a.id, '/file')),
            ta.file_type = COALESCE(ta.file_type, a.file_type)
        WHERE ta.file_url LIKE 'blob:%' OR ta.asset_id IS NULL
      `);
    } catch (e) {}

    // Ensure task_activity table exists
    await connection.query(`
      CREATE TABLE IF NOT EXISTS \`task_activity\` (
        \`id\` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        \`workspace_id\` INT UNSIGNED NOT NULL,
        \`task_id\` INT UNSIGNED NOT NULL,
        \`user_id\` INT UNSIGNED NOT NULL,
        \`action\` VARCHAR(100) NOT NULL,
        \`description\` TEXT NULL,
        \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX \`idx_task_act\` (\`task_id\`),
        INDEX \`idx_ws_act\` (\`workspace_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Ensure task_comments table exists
    await connection.query(`
      CREATE TABLE IF NOT EXISTS \`task_comments\` (
        \`id\` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        \`task_id\` INT UNSIGNED NOT NULL,
        \`user_id\` INT UNSIGNED NOT NULL,
        \`message\` TEXT NOT NULL,
        \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        \`deleted_at\` DATETIME DEFAULT NULL,
        INDEX \`idx_task_comm\` (\`task_id\`),
        INDEX \`idx_user_comm\` (\`user_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Ensure brand_kits table exists
    await connection.query(`
      CREATE TABLE IF NOT EXISTS \`brand_kits\` (
        \`id\` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        \`client_id\` INT UNSIGNED NOT NULL,
        \`brand_name\` VARCHAR(150) NOT NULL,
        \`tagline\` VARCHAR(255) DEFAULT NULL,
        \`industry\` VARCHAR(100) DEFAULT NULL,
        \`website\` VARCHAR(255) DEFAULT NULL,
        \`description\` TEXT DEFAULT NULL,
        \`social_profiles\` JSON DEFAULT NULL,
        \`primary_color\` VARCHAR(30) DEFAULT '#4F39F6',
        \`secondary_color\` VARCHAR(30) DEFAULT '#000000',
        \`accent_color\` VARCHAR(30) DEFAULT '#FFFFFF',
        \`colors\` JSON DEFAULT NULL,
        \`font_family\` VARCHAR(100) DEFAULT 'Inter, sans-serif',
        \`fonts\` JSON DEFAULT NULL,
        \`logo_url\` VARCHAR(500) DEFAULT NULL,
        \`logo_dark_url\` VARCHAR(500) DEFAULT NULL,
        \`logo_light_url\` VARCHAR(500) DEFAULT NULL,
        \`icon_url\` VARCHAR(500) DEFAULT NULL,
        \`guidelines_notes\` TEXT DEFAULT NULL,
        \`guidelines_file_url\` VARCHAR(500) DEFAULT NULL,
        \`guidelines_file_name\` VARCHAR(255) DEFAULT NULL,
        \`guidelines_file_size\` INT UNSIGNED DEFAULT NULL,
        \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX \`idx_bk_client_id\` (\`client_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Ensure brand_assets table exists
    await connection.query(`
      CREATE TABLE IF NOT EXISTS \`brand_assets\` (
        \`id\` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        \`brand_kit_id\` INT UNSIGNED NOT NULL,
        \`asset_name\` VARCHAR(150) NOT NULL,
        \`asset_type\` VARCHAR(50) NOT NULL DEFAULT 'LOGO',
        \`storage_path\` VARCHAR(500) DEFAULT NULL,
        \`file_url\` VARCHAR(500) DEFAULT NULL,
        \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX \`idx_ba_brand_kit_id\` (\`brand_kit_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Safely add missing client columns
    const clientColumnsToEnsure = [
      { name: 'industry', type: 'VARCHAR(100) DEFAULT NULL' },
      { name: 'category', type: 'VARCHAR(100) DEFAULT NULL' },
      { name: 'website', type: 'VARCHAR(255) DEFAULT NULL' },
      { name: 'address', type: 'TEXT DEFAULT NULL' },
      { name: 'city', type: 'VARCHAR(100) DEFAULT NULL' },
      { name: 'country', type: 'VARCHAR(100) DEFAULT NULL' },
      { name: 'whatsapp', type: 'VARCHAR(30) DEFAULT NULL' },
      { name: 'social_profiles', type: 'JSON DEFAULT NULL' },
      { name: 'contact_name', type: 'VARCHAR(150) DEFAULT NULL' },
      { name: 'services', type: 'TEXT DEFAULT NULL' },
      { name: 'campaign_preferences', type: 'JSON DEFAULT NULL' },
      { name: 'content_preferences', type: 'JSON DEFAULT NULL' },
      { name: 'archived_at', type: 'DATETIME DEFAULT NULL' },
    ];
    for (const col of clientColumnsToEnsure) {
      try {
        await connection.query(`ALTER TABLE \`clients\` ADD COLUMN \`${col.name}\` ${col.type}`);
      } catch (e) {}
    }

    // Safely add missing brand_kit columns
    const brandKitColumnsToEnsure = [
      { name: 'tagline', type: 'VARCHAR(255) DEFAULT NULL' },
      { name: 'industry', type: 'VARCHAR(100) DEFAULT NULL' },
      { name: 'website', type: 'VARCHAR(255) DEFAULT NULL' },
      { name: 'description', type: 'TEXT DEFAULT NULL' },
      { name: 'social_profiles', type: 'JSON DEFAULT NULL' },
      { name: 'brand_voice', type: 'JSON DEFAULT NULL' },
      { name: 'target_audience', type: 'TEXT DEFAULT NULL' },
      { name: 'bg_color', type: 'VARCHAR(30) DEFAULT NULL' },
      { name: 'text_color', type: 'VARCHAR(30) DEFAULT NULL' },
      { name: 'guidelines_file_url', type: 'VARCHAR(500) DEFAULT NULL' },
      { name: 'guidelines_file_name', type: 'VARCHAR(255) DEFAULT NULL' },
      { name: 'guidelines_file_size', type: 'INT UNSIGNED DEFAULT NULL' },
      { name: 'logo_dark_url', type: 'VARCHAR(500) DEFAULT NULL' },
      { name: 'logo_light_url', type: 'VARCHAR(500) DEFAULT NULL' },
      { name: 'icon_url', type: 'VARCHAR(500) DEFAULT NULL' },
    ];
    for (const col of brandKitColumnsToEnsure) {
      try {
        await connection.query(`ALTER TABLE \`brand_kits\` ADD COLUMN \`${col.name}\` ${col.type}`);
      } catch (e) {}
    }

    try {
      await connection.query('ALTER TABLE `content_approvals` ADD COLUMN `workspace_id` INT UNSIGNED DEFAULT NULL');
    } catch (e) {}

    try {
      await connection.query('ALTER TABLE `notifications` ADD COLUMN `related_content_id` INT UNSIGNED DEFAULT NULL');
    } catch (e) {}

    try {
      await connection.query('ALTER TABLE `notifications` ADD COLUMN `related_task_id` INT UNSIGNED DEFAULT NULL');
    } catch (e) {}

    try {
      await connection.query('ALTER TABLE `notifications` ADD COLUMN `related_revision_id` INT UNSIGNED DEFAULT NULL');
    } catch (e) {}

    connection.release();
    return true;
  } catch (error) {
    console.error(
      'Database connection failed. Check MySQL Community Server and your .env configuration.'
    );
    if (error.code === 'ER_BAD_DB_ERROR') {
      console.error(
        `[Database Error] Database "${process.env.DB_NAME || 'socialdesk'}" does not exist. Please create it in MySQL Workbench.`
      );
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error(
        `[Database Error] Access denied for user "${process.env.DB_USER || 'specified user'}". Check DB_USER and DB_PASSWORD in .env.`
      );
    } else if (error.code === 'ECONNREFUSED') {
      console.error(
        `[Database Error] Could not connect to MySQL server at ${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 3306}. Make sure MySQL Community Server is running.`
      );
    } else {
      console.error(`[Database Error] ${error.message}`);
    }
    return false;
  }
}

module.exports = {
  db: pool,
  pool,
  query: (sql, params) => pool.query(sql, params),
  execute: (sql, params) => pool.execute(sql, params),
  testConnection,
};
