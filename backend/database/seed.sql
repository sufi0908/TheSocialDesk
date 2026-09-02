-- ==================================================
-- SOCIALDESK MYSQL DATABASE SEED DATA
-- Clean Production Seed Data
-- ==================================================

USE `socialdesk`;

SET FOREIGN_KEY_CHECKS = 0;

-- 1. SEED SYSTEM & TEAM ROLES
INSERT INTO `roles` (`id`, `name`, `display_name`, `description`) VALUES
(1, 'superadmin', 'Super Administrator', 'Global system administrator with full platform access'),
(2, 'workspace_manager', 'Workspace Manager', 'Manages agency workspace, team members, and clients'),
(3, 'team_member', 'Team Member', 'Creates content, designs graphics, and handles tasks'),
(4, 'client_user', 'Client User', 'Client stakeholder who reviews and approves social content'),
(5, 'social_media_manager', 'Social Media Manager', 'Social media strategist'),
(6, 'graphic_team_head', 'Graphic Team Head', 'Manages graphic team'),
(7, 'graphic_designer', 'Graphic Designer', 'Designs visual assets'),
(8, 'video_editor', 'Video Editor', 'Edits video content'),
(9, 'content_writer', 'Content Writer', 'Writes captions and content'),
(10, 'reviewer', 'Content Reviewer', 'Reviews content internally')
ON DUPLICATE KEY UPDATE `display_name` = VALUES(`display_name`);

-- 2. SEED INITIAL SUPERADMIN (Password: sufyan0908@76)
-- Bcrypt Hash for 'sufyan0908@76': $2b$10$oVnUV0LhWFcnmPb7jVt3OurqkOChoxDYGLSNG4RWWwFH8Ed7FAam6
INSERT INTO `users` (`id`, `role_id`, `full_name`, `email`, `password_hash`, `status`, `must_change_password`) VALUES
(1, 1, 'Superadmin', 'sufi@socialdesk.com', '$2b$10$oVnUV0LhWFcnmPb7jVt3OurqkOChoxDYGLSNG4RWWwFH8Ed7FAam6', 'ACTIVE', 0)
ON DUPLICATE KEY UPDATE `full_name` = VALUES(`full_name`), `password_hash` = VALUES(`password_hash`);

SET FOREIGN_KEY_CHECKS = 1;

