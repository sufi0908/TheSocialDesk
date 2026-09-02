-- ==================================================
-- SOCIALDESK MYSQL DATABASE SCHEMA
-- Compatible with MySQL Community Server 8.0+ & MySQL Workbench
-- ==================================================

CREATE DATABASE IF NOT EXISTS `socialdesk` 
  DEFAULT CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci;

USE `socialdesk`;

SET FOREIGN_KEY_CHECKS = 0;

-- --------------------------------------------------
-- 1. ROLES TABLE
-- --------------------------------------------------
DROP TABLE IF EXISTS `roles`;
CREATE TABLE `roles` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(50) NOT NULL UNIQUE,
  `display_name` VARCHAR(100) NOT NULL,
  `description` VARCHAR(255) DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------
-- 2. USERS TABLE
-- --------------------------------------------------
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `role_id` INT UNSIGNED NOT NULL,
  `full_name` VARCHAR(150) NOT NULL,
  `email` VARCHAR(191) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `avatar_url` VARCHAR(500) DEFAULT NULL,
  `phone` VARCHAR(30) DEFAULT NULL,
  `job_title` VARCHAR(150) DEFAULT NULL,
  `department` VARCHAR(150) DEFAULT NULL,
  `bio` TEXT DEFAULT NULL,
  `status` ENUM('ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING') NOT NULL DEFAULT 'ACTIVE',
  `must_change_password` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` DATETIME DEFAULT NULL,
  CONSTRAINT `fk_users_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  INDEX `idx_users_email` (`email`),
  INDEX `idx_users_status` (`status`),
  INDEX `idx_users_role_id` (`role_id`),
  INDEX `idx_users_deleted_at` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------
-- 3. WORKSPACES TABLE
-- --------------------------------------------------
DROP TABLE IF EXISTS `workspaces`;
CREATE TABLE `workspaces` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `owner_id` INT UNSIGNED NOT NULL,
  `name` VARCHAR(150) NOT NULL,
  `slug` VARCHAR(150) NOT NULL UNIQUE,
  `logo_url` VARCHAR(500) DEFAULT NULL,
  `status` ENUM('ACTIVE', 'INACTIVE', 'SUSPENDED', 'ARCHIVED') NOT NULL DEFAULT 'ACTIVE',
  `settings` JSON DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` DATETIME DEFAULT NULL,
  CONSTRAINT `fk_workspaces_owner` FOREIGN KEY (`owner_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  INDEX `idx_workspaces_owner_id` (`owner_id`),
  INDEX `idx_workspaces_slug` (`slug`),
  INDEX `idx_workspaces_status` (`status`),
  INDEX `idx_workspaces_deleted_at` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------
-- 4. WORKSPACE_USERS TABLE (Junction Table)
-- --------------------------------------------------
DROP TABLE IF EXISTS `workspace_users`;
CREATE TABLE `workspace_users` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `workspace_id` INT UNSIGNED NOT NULL,
  `user_id` INT UNSIGNED NOT NULL,
  `role` ENUM('OWNER', 'MANAGER', 'MEMBER', 'GUEST') NOT NULL DEFAULT 'MEMBER',
  `status` ENUM('ACTIVE', 'INVITED', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_wu_workspace` FOREIGN KEY (`workspace_id`) REFERENCES `workspaces` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_wu_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  UNIQUE KEY `uk_workspace_user` (`workspace_id`, `user_id`),
  INDEX `idx_wu_workspace_id` (`workspace_id`),
  INDEX `idx_wu_user_id` (`user_id`),
  INDEX `idx_wu_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------
-- 5. CLIENTS TABLE
-- --------------------------------------------------
DROP TABLE IF EXISTS `clients`;
CREATE TABLE `clients` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `workspace_id` INT UNSIGNED NOT NULL,
  `name` VARCHAR(150) NOT NULL,
  `company_name` VARCHAR(150) DEFAULT NULL,
  `email` VARCHAR(191) DEFAULT NULL,
  `phone` VARCHAR(30) DEFAULT NULL,
  `logo_url` VARCHAR(500) DEFAULT NULL,
  `status` ENUM('ACTIVE', 'INACTIVE', 'ARCHIVED') NOT NULL DEFAULT 'ACTIVE',
  `notes` TEXT DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` DATETIME DEFAULT NULL,
  CONSTRAINT `fk_clients_workspace` FOREIGN KEY (`workspace_id`) REFERENCES `workspaces` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  INDEX `idx_clients_workspace_id` (`workspace_id`),
  INDEX `idx_clients_status` (`status`),
  INDEX `idx_clients_deleted_at` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------
-- 6. CLIENT_TEAM TABLE (Assigned Team Members)
-- --------------------------------------------------
DROP TABLE IF EXISTS `client_team`;
CREATE TABLE `client_team` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `client_id` INT UNSIGNED NOT NULL,
  `user_id` INT UNSIGNED NOT NULL,
  `role` VARCHAR(50) DEFAULT 'MEMBER',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_ct_client` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_ct_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  UNIQUE KEY `uk_client_user` (`client_id`, `user_id`),
  INDEX `idx_ct_client_id` (`client_id`),
  INDEX `idx_ct_user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------
-- 7. PROJECTS TABLE
-- --------------------------------------------------
DROP TABLE IF EXISTS `projects`;
CREATE TABLE `projects` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `workspace_id` INT UNSIGNED NOT NULL,
  `client_id` INT UNSIGNED NOT NULL,
  `created_by` INT UNSIGNED NOT NULL,
  `name` VARCHAR(150) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `status` ENUM('PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'ACTIVE',
  `start_date` DATE DEFAULT NULL,
  `due_date` DATE DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` DATETIME DEFAULT NULL,
  CONSTRAINT `fk_projects_workspace` FOREIGN KEY (`workspace_id`) REFERENCES `workspaces` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_projects_client` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_projects_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  INDEX `idx_projects_workspace_id` (`workspace_id`),
  INDEX `idx_projects_client_id` (`client_id`),
  INDEX `idx_projects_status` (`status`),
  INDEX `idx_projects_deleted_at` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------
-- 8. PROJECT_MEMBERS TABLE
-- --------------------------------------------------
DROP TABLE IF EXISTS `project_members`;
CREATE TABLE `project_members` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `project_id` INT UNSIGNED NOT NULL,
  `user_id` INT UNSIGNED NOT NULL,
  `role` VARCHAR(50) DEFAULT 'MEMBER',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_pm_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_pm_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  UNIQUE KEY `uk_project_user` (`project_id`, `user_id`),
  INDEX `idx_pm_project_id` (`project_id`),
  INDEX `idx_pm_user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------
-- 9. TASKS TABLE
-- --------------------------------------------------
DROP TABLE IF EXISTS `tasks`;
CREATE TABLE `tasks` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `workspace_id` INT UNSIGNED NOT NULL,
  `client_id` INT UNSIGNED DEFAULT NULL,
  `project_id` INT UNSIGNED DEFAULT NULL,
  `content_id` INT UNSIGNED DEFAULT NULL,
  `assigned_to` INT UNSIGNED DEFAULT NULL,
  `created_by` INT UNSIGNED NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `status` ENUM('TODO', 'IN_PROGRESS', 'REVIEW', 'REVISION', 'COMPLETED') NOT NULL DEFAULT 'TODO',
  `priority` ENUM('LOW', 'MEDIUM', 'HIGH', 'URGENT') NOT NULL DEFAULT 'MEDIUM',
  `due_date` DATETIME DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` DATETIME DEFAULT NULL,
  CONSTRAINT `fk_tasks_workspace` FOREIGN KEY (`workspace_id`) REFERENCES `workspaces` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_tasks_client` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_tasks_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_tasks_content` FOREIGN KEY (`content_id`) REFERENCES `content` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_tasks_assigned_to` FOREIGN KEY (`assigned_to`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_tasks_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  INDEX `idx_tasks_workspace_id` (`workspace_id`),
  INDEX `idx_tasks_client_id` (`client_id`),
  INDEX `idx_tasks_project_id` (`project_id`),
  INDEX `idx_tasks_content_id` (`content_id`),
  INDEX `idx_tasks_user_id` (`assigned_to`),
  INDEX `idx_tasks_status` (`status`),
  INDEX `idx_tasks_deleted_at` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------
-- 10. CONTENT TABLE
-- --------------------------------------------------
DROP TABLE IF EXISTS `content`;
CREATE TABLE `content` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `workspace_id` INT UNSIGNED NOT NULL,
  `client_id` INT UNSIGNED NOT NULL,
  `project_id` INT UNSIGNED DEFAULT NULL,
  `created_by` INT UNSIGNED NOT NULL,
  `assigned_to` INT UNSIGNED DEFAULT NULL,
  `reviewer_id` INT UNSIGNED DEFAULT NULL,
  `title` VARCHAR(255) NOT NULL,
  `caption` LONGTEXT DEFAULT NULL,
  `body_text` LONGTEXT DEFAULT NULL,
  `content_type` VARCHAR(50) NOT NULL DEFAULT 'POST',
  `internal_notes` TEXT DEFAULT NULL,
  `status` ENUM(
    'DRAFT',
    'IN_PROGRESS',
    'INTERNAL_REVIEW',
    'CLIENT_REVIEW',
    'REVISION_REQUIRED',
    'APPROVED',
    'SCHEDULED',
    'PUBLISHED',
    'REJECTED'
  ) NOT NULL DEFAULT 'DRAFT',
  `due_date` DATETIME DEFAULT NULL,
  `scheduled_at` DATETIME DEFAULT NULL,
  `published_at` DATETIME DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` DATETIME DEFAULT NULL,
  CONSTRAINT `fk_content_workspace` FOREIGN KEY (`workspace_id`) REFERENCES `workspaces` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_content_client` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_content_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_content_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_content_assigned_to` FOREIGN KEY (`assigned_to`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_content_reviewer_id` FOREIGN KEY (`reviewer_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  INDEX `idx_content_workspace_id` (`workspace_id`),
  INDEX `idx_content_client_id` (`client_id`),
  INDEX `idx_content_project_id` (`project_id`),
  INDEX `idx_content_user_id` (`assigned_to`),
  INDEX `idx_content_reviewer_id` (`reviewer_id`),
  INDEX `idx_content_status` (`status`),
  INDEX `idx_content_scheduled_at` (`scheduled_at`),
  INDEX `idx_content_created_at` (`created_at`),
  INDEX `idx_content_deleted_at` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------
-- 11. CONTENT_PLATFORMS TABLE (Relationship Table)
-- --------------------------------------------------
DROP TABLE IF EXISTS `content_platforms`;
CREATE TABLE `content_platforms` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `content_id` INT UNSIGNED NOT NULL,
  `platform` ENUM('INSTAGRAM', 'FACEBOOK', 'TWITTER', 'X', 'LINKEDIN', 'TIKTOK', 'YOUTUBE', 'PINTEREST') NOT NULL,
  `status` ENUM('PENDING', 'SCHEDULED', 'PUBLISHED', 'FAILED') NOT NULL DEFAULT 'PENDING',
  `platform_post_id` VARCHAR(255) DEFAULT NULL,
  `scheduled_at` DATETIME DEFAULT NULL,
  `published_at` DATETIME DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_cp_content` FOREIGN KEY (`content_id`) REFERENCES `content` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  UNIQUE KEY `uk_content_platform` (`content_id`, `platform`),
  INDEX `idx_cp_content_id` (`content_id`),
  INDEX `idx_cp_platform` (`platform`),
  INDEX `idx_cp_status` (`status`),
  INDEX `idx_cp_scheduled_at` (`scheduled_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------
-- 12. CONTENT_VERSIONS TABLE
-- --------------------------------------------------
DROP TABLE IF EXISTS `content_versions`;
CREATE TABLE `content_versions` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `content_id` INT UNSIGNED NOT NULL,
  `created_by` INT UNSIGNED NOT NULL,
  `version_number` INT UNSIGNED NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `body_text` LONGTEXT DEFAULT NULL,
  `media_assets` JSON DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_cv_content` FOREIGN KEY (`content_id`) REFERENCES `content` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_cv_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  UNIQUE KEY `uk_content_version` (`content_id`, `version_number`),
  INDEX `idx_cv_content_id` (`content_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------
-- 13. CONTENT_COMMENTS TABLE
-- --------------------------------------------------
DROP TABLE IF EXISTS `content_comments`;
CREATE TABLE `content_comments` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `content_id` INT UNSIGNED NOT NULL,
  `revision_request_id` INT UNSIGNED DEFAULT NULL,
  `user_id` INT UNSIGNED NOT NULL,
  `parent_id` INT UNSIGNED DEFAULT NULL,
  `comment_text` TEXT NOT NULL,
  `comment_type` ENUM('INTERNAL', 'CLIENT') NOT NULL DEFAULT 'CLIENT',
  `is_internal` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` DATETIME DEFAULT NULL,
  CONSTRAINT `fk_cc_content` FOREIGN KEY (`content_id`) REFERENCES `content` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_cc_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_cc_parent` FOREIGN KEY (`parent_id`) REFERENCES `content_comments` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  INDEX `idx_cc_content_id` (`content_id`),
  INDEX `idx_cc_revision_request_id` (`revision_request_id`),
  INDEX `idx_cc_user_id` (`user_id`),
  INDEX `idx_cc_deleted_at` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------
-- 13b. REVISION_REQUESTS TABLE
-- --------------------------------------------------
DROP TABLE IF EXISTS `revision_requests`;
CREATE TABLE `revision_requests` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `content_id` INT UNSIGNED NOT NULL,
  `requested_by` INT UNSIGNED NOT NULL,
  `assigned_to` INT UNSIGNED DEFAULT NULL,
  `workspace_id` INT UNSIGNED NOT NULL,
  `client_id` INT UNSIGNED NOT NULL,
  `reason` TEXT NOT NULL,
  `priority` ENUM('LOW', 'MEDIUM', 'HIGH', 'URGENT') NOT NULL DEFAULT 'MEDIUM',
  `due_date` DATE DEFAULT NULL,
  `due_time` TIME DEFAULT NULL,
  `status` ENUM('OPEN', 'IN_PROGRESS', 'RESUBMITTED', 'RESOLVED', 'CANCELLED') NOT NULL DEFAULT 'OPEN',
  `started_at` DATETIME DEFAULT NULL,
  `started_by` INT UNSIGNED DEFAULT NULL,
  `resubmitted_at` DATETIME DEFAULT NULL,
  `changes_made` TEXT DEFAULT NULL,
  `resolved_at` DATETIME DEFAULT NULL,
  `resolved_by` INT UNSIGNED DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` DATETIME DEFAULT NULL,
  CONSTRAINT `fk_rr_content` FOREIGN KEY (`content_id`) REFERENCES `content` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_rr_requested_by` FOREIGN KEY (`requested_by`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_rr_assigned_to` FOREIGN KEY (`assigned_to`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_rr_workspace` FOREIGN KEY (`workspace_id`) REFERENCES `workspaces` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_rr_client` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  INDEX `idx_rr_content_id` (`content_id`),
  INDEX `idx_rr_requested_by` (`requested_by`),
  INDEX `idx_rr_assigned_to` (`assigned_to`),
  INDEX `idx_rr_workspace_id` (`workspace_id`),
  INDEX `idx_rr_client_id` (`client_id`),
  INDEX `idx_rr_status` (`status`),
  INDEX `idx_rr_due_date` (`due_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------
-- 14. CONTENT_APPROVALS TABLE
-- --------------------------------------------------
DROP TABLE IF EXISTS `content_approvals`;
CREATE TABLE `content_approvals` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `workspace_id` INT UNSIGNED DEFAULT NULL,
  `content_id` INT UNSIGNED NOT NULL,
  `reviewer_id` INT UNSIGNED NOT NULL,
  `approval_type` ENUM('INTERNAL', 'CLIENT') NOT NULL DEFAULT 'INTERNAL',
  `status` VARCHAR(50) NOT NULL,
  `notes` TEXT DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_ca_workspace` FOREIGN KEY (`workspace_id`) REFERENCES `workspaces` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_ca_content` FOREIGN KEY (`content_id`) REFERENCES `content` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_ca_reviewer` FOREIGN KEY (`reviewer_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  INDEX `idx_ca_workspace_id` (`workspace_id`),
  INDEX `idx_ca_content_id` (`content_id`),
  INDEX `idx_ca_reviewer_id` (`reviewer_id`),
  INDEX `idx_ca_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------
-- 15. CALENDAR_EVENTS TABLE
-- --------------------------------------------------
DROP TABLE IF EXISTS `calendar_events`;
CREATE TABLE `calendar_events` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `workspace_id` INT UNSIGNED NOT NULL,
  `client_id` INT UNSIGNED DEFAULT NULL,
  `content_id` INT UNSIGNED DEFAULT NULL,
  `created_by` INT UNSIGNED NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `event_type` ENUM('POST_SCHEDULE', 'CAMPAIGN_LAUNCH', 'MEETING', 'DEADLINE', 'OTHER') NOT NULL DEFAULT 'POST_SCHEDULE',
  `start_time` DATETIME NOT NULL,
  `end_time` DATETIME DEFAULT NULL,
  `timezone` VARCHAR(50) DEFAULT 'UTC',
  `is_all_day` TINYINT(1) NOT NULL DEFAULT 0,
  `status` ENUM('SCHEDULED', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'SCHEDULED',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` DATETIME DEFAULT NULL,
  CONSTRAINT `fk_ce_workspace` FOREIGN KEY (`workspace_id`) REFERENCES `workspaces` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_ce_client` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_ce_content` FOREIGN KEY (`content_id`) REFERENCES `content` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_ce_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  INDEX `idx_ce_workspace_id` (`workspace_id`),
  INDEX `idx_ce_client_id` (`client_id`),
  INDEX `idx_ce_content_id` (`content_id`),
  INDEX `idx_ce_start_time` (`start_time`),
  INDEX `idx_ce_status` (`status`),
  INDEX `idx_ce_deleted_at` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------
-- 15b. ASSET_FOLDERS TABLE
-- --------------------------------------------------
DROP TABLE IF EXISTS `asset_folders`;
CREATE TABLE `asset_folders` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `workspace_id` INT UNSIGNED NOT NULL,
  `client_id` INT UNSIGNED DEFAULT NULL,
  `name` VARCHAR(255) NOT NULL,
  `created_by` INT UNSIGNED NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` DATETIME DEFAULT NULL,
  CONSTRAINT `fk_af_workspace` FOREIGN KEY (`workspace_id`) REFERENCES `workspaces` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_af_client` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_af_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  INDEX `idx_af_workspace_id` (`workspace_id`),
  INDEX `idx_af_client_id` (`client_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------
-- 16. ASSETS TABLE
-- --------------------------------------------------
DROP TABLE IF EXISTS `assets`;
CREATE TABLE `assets` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `workspace_id` INT UNSIGNED NOT NULL,
  `client_id` INT UNSIGNED DEFAULT NULL,
  `project_id` INT UNSIGNED DEFAULT NULL,
  `content_id` INT UNSIGNED DEFAULT NULL,
  `folder_id` INT UNSIGNED DEFAULT NULL,
  `uploaded_by` INT UNSIGNED NOT NULL,
  `display_name` VARCHAR(255) DEFAULT NULL,
  `file_name` VARCHAR(255) NOT NULL,
  `original_filename` VARCHAR(255) DEFAULT NULL,
  `storage_path` VARCHAR(500) DEFAULT NULL,
  `file_url` VARCHAR(500) DEFAULT NULL,
  `file_type` VARCHAR(50) NOT NULL,
  `file_size` BIGINT UNSIGNED DEFAULT 0,
  `mime_type` VARCHAR(100) DEFAULT NULL,
  `file_hash` VARCHAR(64) DEFAULT NULL,
  `width` INT UNSIGNED DEFAULT NULL,
  `height` INT UNSIGNED DEFAULT NULL,
  `duration` DOUBLE DEFAULT NULL,
  `category` VARCHAR(50) DEFAULT NULL,
  `tags` JSON DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` DATETIME DEFAULT NULL,
  CONSTRAINT `fk_assets_workspace` FOREIGN KEY (`workspace_id`) REFERENCES `workspaces` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_assets_client` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_assets_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_assets_content` FOREIGN KEY (`content_id`) REFERENCES `content` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_assets_folder` FOREIGN KEY (`folder_id`) REFERENCES `asset_folders` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_assets_uploaded_by` FOREIGN KEY (`uploaded_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  INDEX `idx_assets_workspace_id` (`workspace_id`),
  INDEX `idx_assets_client_id` (`client_id`),
  INDEX `idx_assets_project_id` (`project_id`),
  INDEX `idx_assets_content_id` (`content_id`),
  INDEX `idx_assets_folder_id` (`folder_id`),
  INDEX `idx_assets_user_id` (`uploaded_by`),
  INDEX `idx_assets_file_hash` (`file_hash`),
  INDEX `idx_assets_file_size` (`file_size`),
  INDEX `idx_assets_created_at` (`created_at`),
  INDEX `idx_assets_deleted_at` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------
-- 17. NOTIFICATIONS TABLE
-- --------------------------------------------------
DROP TABLE IF EXISTS `notifications`;
CREATE TABLE `notifications` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT UNSIGNED NOT NULL,
  `workspace_id` INT UNSIGNED DEFAULT NULL,
  `related_content_id` INT UNSIGNED DEFAULT NULL,
  `related_task_id` INT UNSIGNED DEFAULT NULL,
  `related_revision_id` INT UNSIGNED DEFAULT NULL,
  `title` VARCHAR(255) NOT NULL,
  `message` TEXT NOT NULL,
  `type` VARCHAR(50) NOT NULL DEFAULT 'SYSTEM',
  `link` VARCHAR(500) DEFAULT NULL,
  `is_read` TINYINT(1) NOT NULL DEFAULT 0,
  `read_at` DATETIME DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_notif_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_notif_workspace` FOREIGN KEY (`workspace_id`) REFERENCES `workspaces` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_notif_content` FOREIGN KEY (`related_content_id`) REFERENCES `content` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_notif_task` FOREIGN KEY (`related_task_id`) REFERENCES `tasks` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_notif_revision` FOREIGN KEY (`related_revision_id`) REFERENCES `revision_requests` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  INDEX `idx_notif_user_id` (`user_id`),
  INDEX `idx_notif_workspace_id` (`workspace_id`),
  INDEX `idx_notif_content_id` (`related_content_id`),
  INDEX `idx_notif_task_id` (`related_task_id`),
  INDEX `idx_notif_revision_id` (`related_revision_id`),
  INDEX `idx_notif_is_read` (`is_read`),
  INDEX `idx_notif_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------
-- 18. ACTIVITY_LOGS TABLE
-- --------------------------------------------------
DROP TABLE IF EXISTS `activity_logs`;
CREATE TABLE `activity_logs` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `workspace_id` INT UNSIGNED DEFAULT NULL,
  `client_id` INT UNSIGNED DEFAULT NULL,
  `user_id` INT UNSIGNED DEFAULT NULL,
  `entity_type` VARCHAR(50) NOT NULL,
  `entity_id` INT UNSIGNED NOT NULL,
  `action` VARCHAR(100) NOT NULL,
  `is_internal` TINYINT(1) NOT NULL DEFAULT 0,
  `details` JSON DEFAULT NULL,
  `ip_address` VARCHAR(45) DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_al_workspace` FOREIGN KEY (`workspace_id`) REFERENCES `workspaces` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_al_client` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_al_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  INDEX `idx_al_workspace_id` (`workspace_id`),
  INDEX `idx_al_user_id` (`user_id`),
  INDEX `idx_al_entity` (`entity_type`, `entity_id`),
  INDEX `idx_al_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------
-- 19. BRAND_KITS TABLE
-- --------------------------------------------------
DROP TABLE IF EXISTS `brand_kits`;
CREATE TABLE `brand_kits` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `client_id` INT UNSIGNED NOT NULL,
  `brand_name` VARCHAR(150) NOT NULL,
  `primary_color` VARCHAR(30) DEFAULT '#000000',
  `secondary_color` VARCHAR(30) DEFAULT '#FFFFFF',
  `accent_color` VARCHAR(30) DEFAULT NULL,
  `colors` JSON DEFAULT NULL,
  `font_family` VARCHAR(100) DEFAULT 'Inter, sans-serif',
  `fonts` JSON DEFAULT NULL,
  `logo_url` VARCHAR(500) DEFAULT NULL,
  `guidelines_notes` TEXT DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_bk_client` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  INDEX `idx_bk_client_id` (`client_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------
-- 20. BRAND_ASSETS TABLE
-- --------------------------------------------------
DROP TABLE IF EXISTS `brand_assets`;
CREATE TABLE `brand_assets` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `brand_kit_id` INT UNSIGNED NOT NULL,
  `asset_name` VARCHAR(150) NOT NULL,
  `asset_type` ENUM('LOGO', 'FONT', 'BANNER', 'ICON', 'OTHER') NOT NULL DEFAULT 'LOGO',
  `storage_path` VARCHAR(500) DEFAULT NULL,
  `file_url` VARCHAR(500) DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_ba_brand_kit` FOREIGN KEY (`brand_kit_id`) REFERENCES `brand_kits` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  INDEX `idx_ba_brand_kit_id` (`brand_kit_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------
-- 21. CONTENT_ASSETS TABLE
-- --------------------------------------------------
DROP TABLE IF EXISTS `content_assets`;
CREATE TABLE `content_assets` (
  `content_id` INT UNSIGNED NOT NULL,
  `asset_id` INT UNSIGNED NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`content_id`, `asset_id`),
  CONSTRAINT `fk_content_assets_content` FOREIGN KEY (`content_id`) REFERENCES `content` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_content_assets_asset` FOREIGN KEY (`asset_id`) REFERENCES `assets` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------
-- 22. TODOS TABLE (Personal Checklist System)
-- --------------------------------------------------
DROP TABLE IF EXISTS `todos`;
CREATE TABLE `todos` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT UNSIGNED NOT NULL,
  `workspace_id` INT UNSIGNED DEFAULT NULL,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `status` ENUM('TODO', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'TODO',
  `priority` ENUM('LOW', 'MEDIUM', 'HIGH', 'URGENT') NOT NULL DEFAULT 'MEDIUM',
  `category` VARCHAR(50) NOT NULL DEFAULT 'General',
  `due_date` DATE DEFAULT NULL,
  `due_time` TIME DEFAULT NULL,
  `completed_at` DATETIME DEFAULT NULL,
  `related_task_id` INT UNSIGNED DEFAULT NULL,
  `related_content_id` INT UNSIGNED DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` DATETIME DEFAULT NULL,
  CONSTRAINT `fk_todos_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_todos_workspace` FOREIGN KEY (`workspace_id`) REFERENCES `workspaces` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_todos_task` FOREIGN KEY (`related_task_id`) REFERENCES `tasks` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_todos_content` FOREIGN KEY (`related_content_id`) REFERENCES `content` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  INDEX `idx_todos_user_id` (`user_id`),
  INDEX `idx_todos_workspace_id` (`workspace_id`),
  INDEX `idx_todos_status` (`status`),
  INDEX `idx_todos_priority` (`priority`),
  INDEX `idx_todos_due_date` (`due_date`),
  INDEX `idx_todos_created_at` (`created_at`),
  INDEX `idx_todos_deleted_at` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------
-- 23. CHAT TABLES
-- --------------------------------------------------
DROP TABLE IF EXISTS `chat_message_reactions`;
DROP TABLE IF EXISTS `chat_message_attachments`;
DROP TABLE IF EXISTS `chat_message_reads`;
DROP TABLE IF EXISTS `chat_messages`;
DROP TABLE IF EXISTS `chat_group_members`;
DROP TABLE IF EXISTS `chat_groups`;

CREATE TABLE `chat_groups` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `workspace_id` INT UNSIGNED NOT NULL,
  `name` VARCHAR(150) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `image` VARCHAR(500) DEFAULT NULL,
  `created_by` INT UNSIGNED NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `archived_at` DATETIME DEFAULT NULL,
  CONSTRAINT `fk_cg_workspace` FOREIGN KEY (`workspace_id`) REFERENCES `workspaces` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_cg_creator` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  INDEX `idx_cg_workspace_id` (`workspace_id`),
  INDEX `idx_cg_created_by` (`created_by`),
  INDEX `idx_cg_archived_at` (`archived_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `chat_group_members` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `group_id` INT UNSIGNED NOT NULL,
  `user_id` INT UNSIGNED NOT NULL,
  `role` ENUM('ADMIN', 'MEMBER') NOT NULL DEFAULT 'MEMBER',
  `joined_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `left_at` DATETIME DEFAULT NULL,
  `is_muted` TINYINT(1) NOT NULL DEFAULT 0,
  `mute_until` DATETIME DEFAULT NULL,
  `is_pinned` TINYINT(1) NOT NULL DEFAULT 0,
  CONSTRAINT `fk_cgm_group` FOREIGN KEY (`group_id`) REFERENCES `chat_groups` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_cgm_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  UNIQUE KEY `uk_chat_group_user` (`group_id`, `user_id`),
  INDEX `idx_cgm_group_id` (`group_id`),
  INDEX `idx_cgm_user_id` (`user_id`),
  INDEX `idx_cgm_is_muted` (`is_muted`),
  INDEX `idx_cgm_is_pinned` (`is_pinned`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `chat_messages` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `group_id` INT UNSIGNED NOT NULL,
  `sender_id` INT UNSIGNED NOT NULL,
  `message_type` ENUM('TEXT', 'IMAGE', 'VIDEO', 'DOCUMENT', 'VOICE_NOTE', 'CONTENT', 'ASSET', 'TASK', 'SYSTEM') NOT NULL DEFAULT 'TEXT',
  `message` TEXT DEFAULT NULL,
  `content_id` INT UNSIGNED DEFAULT NULL,
  `task_id` INT UNSIGNED DEFAULT NULL,
  `asset_id` INT UNSIGNED DEFAULT NULL,
  `reply_to_message_id` INT UNSIGNED DEFAULT NULL,
  `is_edited` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` DATETIME DEFAULT NULL,
  CONSTRAINT `fk_cm_group` FOREIGN KEY (`group_id`) REFERENCES `chat_groups` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_cm_sender` FOREIGN KEY (`sender_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_cm_content` FOREIGN KEY (`content_id`) REFERENCES `content` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_cm_task` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_cm_asset` FOREIGN KEY (`asset_id`) REFERENCES `assets` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_cm_reply` FOREIGN KEY (`reply_to_message_id`) REFERENCES `chat_messages` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  INDEX `idx_cm_group_id` (`group_id`),
  INDEX `idx_cm_sender_id` (`sender_id`),
  INDEX `idx_cm_content_id` (`content_id`),
  INDEX `idx_cm_task_id` (`task_id`),
  INDEX `idx_cm_asset_id` (`asset_id`),
  INDEX `idx_cm_reply_to` (`reply_to_message_id`),
  INDEX `idx_cm_created_at` (`created_at`),
  INDEX `idx_cm_deleted_at` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `chat_message_attachments` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `message_id` INT UNSIGNED NOT NULL,
  `asset_id` INT UNSIGNED DEFAULT NULL,
  `file_name` VARCHAR(255) NOT NULL,
  `file_size` INT UNSIGNED DEFAULT 0,
  `mime_type` VARCHAR(100) DEFAULT NULL,
  `storage_path` VARCHAR(500) NOT NULL,
  `duration` DOUBLE DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_cma_message` FOREIGN KEY (`message_id`) REFERENCES `chat_messages` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_cma_asset` FOREIGN KEY (`asset_id`) REFERENCES `assets` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  INDEX `idx_cma_message_id` (`message_id`),
  INDEX `idx_cma_asset_id` (`asset_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `chat_message_reactions` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `message_id` INT UNSIGNED NOT NULL,
  `user_id` INT UNSIGNED NOT NULL,
  `reaction` VARCHAR(32) NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_cmr_message` FOREIGN KEY (`message_id`) REFERENCES `chat_messages` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_cmr_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  UNIQUE KEY `uk_chat_reaction` (`message_id`, `user_id`, `reaction`),
  INDEX `idx_cmr_message_id` (`message_id`),
  INDEX `idx_cmr_user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `chat_message_reads` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `group_id` INT UNSIGNED NOT NULL,
  `user_id` INT UNSIGNED NOT NULL,
  `last_read_message_id` INT UNSIGNED NOT NULL,
  `read_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_cmread_group` FOREIGN KEY (`group_id`) REFERENCES `chat_groups` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_cmread_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  UNIQUE KEY `uk_chat_group_user_read` (`group_id`, `user_id`),
  INDEX `idx_cmread_group_id` (`group_id`),
  INDEX `idx_cmread_user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
