-- Add custom fields storage for inboxes
ALTER TABLE `inbox` ADD COLUMN `customFields` LONGTEXT NOT NULL DEFAULT ('{}');
