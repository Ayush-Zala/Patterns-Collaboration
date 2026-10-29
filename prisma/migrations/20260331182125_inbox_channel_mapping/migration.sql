-- CreateTable
CREATE TABLE `InboxChannel` (
    `id` VARCHAR(64) NOT NULL,
    `inboxId` VARCHAR(64) NOT NULL,
    `channelId` VARCHAR(64) NOT NULL,
    `createdBy` VARCHAR(64) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `inbox_channel_unique`(`inboxId`, `channelId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `InboxChannel` ADD CONSTRAINT `InboxChannel_inboxId_fkey` FOREIGN KEY (`inboxId`) REFERENCES `Inbox`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InboxChannel` ADD CONSTRAINT `InboxChannel_channelId_fkey` FOREIGN KEY (`channelId`) REFERENCES `Channel`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
