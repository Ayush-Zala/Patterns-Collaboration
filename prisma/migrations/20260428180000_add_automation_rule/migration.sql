-- CreateTable
CREATE TABLE `AutomationRule` (
    `id` VARCHAR(64) NOT NULL,
    `organizationId` VARCHAR(64) NULL,
    `name` VARCHAR(120) NOT NULL,
    `triggers` LONGTEXT NOT NULL,
    `conditions` LONGTEXT NOT NULL,
    `actions` LONGTEXT NOT NULL,
    `stopProcessing` BOOLEAN NOT NULL DEFAULT false,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdBy` VARCHAR(64) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `AutomationRule_organizationId_fkey`(`organizationId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `AutomationRule` ADD CONSTRAINT `AutomationRule_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `AuthOrganization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
