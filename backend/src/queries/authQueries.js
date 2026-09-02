module.exports = {
  FIND_USER_BY_EMAIL: `
    SELECT u.id, u.role_id, u.full_name, u.email, u.password_hash, u.status, u.must_change_password, u.avatar_url,
           u.phone, u.job_title, u.department, u.bio,
           r.name as role_name, r.display_name as role_display_name
    FROM users u
    JOIN roles r ON u.role_id = r.id
    WHERE LOWER(u.email) = LOWER(?) AND u.deleted_at IS NULL
    LIMIT 1
  `,
  FIND_USER_BY_ID: `
    SELECT u.id, u.role_id, u.full_name, u.email, u.status, u.must_change_password, u.avatar_url, u.phone,
           u.job_title, u.department, u.bio,
           r.name as role_name, r.display_name as role_display_name
    FROM users u
    JOIN roles r ON u.role_id = r.id
    WHERE u.id = ? AND u.deleted_at IS NULL
    LIMIT 1
  `,
  GET_USER_WORKSPACE: `
    SELECT w.id, w.name, w.slug, w.logo_url, w.status as workspace_status, wu.role as workspace_role
    FROM workspace_users wu
    JOIN workspaces w ON wu.workspace_id = w.id
    WHERE wu.user_id = ? AND w.deleted_at IS NULL
    LIMIT 1
  `,
  UPDATE_USER_PASSWORD: `
    UPDATE users
    SET password_hash = ?, must_change_password = 0, updated_at = NOW()
    WHERE id = ? AND deleted_at IS NULL
  `,
};
