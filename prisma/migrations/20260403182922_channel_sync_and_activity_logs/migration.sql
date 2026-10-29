-- CreateTable
CREATE TABLE `ChannelSyncState` (
    `id` VARCHAR(64) NOT NULL,
    `channelId` VARCHAR(64) NOT NULL,
    `provider` VARCHAR(40) NOT NULL,
    `syncEnabled` BOOLEAN NOT NULL DEFAULT false,
    `status` VARCHAR(40) NOT NULL DEFAULT 'idle',
    `cursor` VARCHAR(191) NULL,
    `watchExpirationAt` DATETIME(3) NULL,
    `lastSyncedAt` DATETIME(3) NULL,
    `lastError` VARCHAR(1000) NULL,
    `updatedAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `ChannelSyncState_channelId_key`(`channelId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ActivityLog` (
    `id` VARCHAR(64) NOT NULL,
    `type` VARCHAR(80) NOT NULL,
    `actorId` VARCHAR(64) NULL,
    `entityType` VARCHAR(80) NULL,
    `entityId` VARCHAR(64) NULL,
    `metadata` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `activity_created_idx`(`createdAt`),
    INDEX `activity_type_created_idx`(`type`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ChannelSyncState` ADD CONSTRAINT `ChannelSyncState_channelId_fkey` FOREIGN KEY (`channelId`) REFERENCES `Channel`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
