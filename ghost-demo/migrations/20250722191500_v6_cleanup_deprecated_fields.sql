ALTER TABLE posts DROP COLUMN created_by;
ALTER TABLE posts DROP COLUMN updated_by;
ALTER TABLE users DROP COLUMN created_by;
ALTER TABLE users DROP COLUMN updated_by;
ALTER TABLE tags DROP COLUMN created_by;
ALTER TABLE tags DROP COLUMN updated_by;
ALTER TABLE settings DROP COLUMN created_by;
ALTER TABLE settings DROP COLUMN updated_by;
ALTER TABLE members DROP COLUMN created_by;
ALTER TABLE members DROP COLUMN updated_by;

DELETE FROM settings WHERE `key` = 'amp' OR `key` = 'amp_gtag_id';
