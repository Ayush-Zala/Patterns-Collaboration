-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(64) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `firstName` VARCHAR(80) NULL,
    `lastName` VARCHAR(80) NULL,
    `username` VARCHAR(80) NULL,
    `email` VARCHAR(191) NOT NULL,
    `passwordHash` VARCHAR(255) NULL,
    `role` VARCHAR(40) NOT NULL,
    `status` VARCHAR(40) NOT NULL DEFAULT 'available',
    `twoFactorEnabled` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_username_key`(`username`),
    UNIQUE INDEX `User_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `OAuthAccount` (
    `id` VARCHAR(64) NOT NULL,
    `userId` VARCHAR(64) NULL,
    `provider` VARCHAR(40) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `accessToken` LONGTEXT NOT NULL,
    `refreshToken` LONGTEXT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `oauth_provider_email_unique`(`provider`, `email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Channel` (
    `id` VARCHAR(64) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `emailAddress` VARCHAR(191) NOT NULL,
    `provider` VARCHAR(40) NOT NULL,
    `oauthAccountId` VARCHAR(64) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Channel_emailAddress_key`(`emailAddress`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Inbox` (
    `id` VARCHAR(64) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `description` VARCHAR(500) NOT NULL DEFAULT '',
    `createdBy` VARCHAR(64) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TemplateFolder` (
    `id` VARCHAR(64) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MessageTemplate` (
    `id` VARCHAR(64) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `subject` VARCHAR(255) NOT NULL,
    `folderId` VARCHAR(64) NOT NULL,
    `createdBy` VARCHAR(64) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Delegation` (
    `id` VARCHAR(64) NOT NULL,
    `name` VARCHAR(160) NOT NULL,
    `permissionScope` VARCHAR(64) NOT NULL,
    `createdBy` VARCHAR(64) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DelegationInbox` (
    `id` VARCHAR(64) NOT NULL,
    `delegationId` VARCHAR(64) NOT NULL,
    `inboxId` VARCHAR(64) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `delegation_inbox_unique`(`delegationId`, `inboxId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DelegationDelegate` (
    `id` VARCHAR(64) NOT NULL,
    `delegationId` VARCHAR(64) NOT NULL,
    `delegateEmail` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Signature` (
    `id` VARCHAR(64) NOT NULL,
    `name` VARCHAR(160) NOT NULL,
    `displayName` VARCHAR(120) NOT NULL,
    `senderFromLines` JSON NOT NULL,
    `createdBy` VARCHAR(64) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SignatureChannel` (
    `id` VARCHAR(64) NOT NULL,
    `signatureId` VARCHAR(64) NOT NULL,
    `channelId` VARCHAR(64) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `signature_channel_unique`(`signatureId`, `channelId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Thread` (
    `id` VARCHAR(64) NOT NULL,
    `channelId` VARCHAR(64) NOT NULL,
    `externalThreadKey` VARCHAR(191) NULL,
    `subject` VARCHAR(500) NOT NULL,
    `subjectKey` VARCHAR(500) NOT NULL,
    `participants` JSON NOT NULL,
    `status` VARCHAR(40) NOT NULL DEFAULT 'open',
    `assignmentState` VARCHAR(40) NOT NULL DEFAULT 'unassigned',
    `assignedTo` VARCHAR(64) NULL,
    `priority` VARCHAR(40) NOT NULL DEFAULT 'normal',
    `tags` JSON NOT NULL,
    `lastActivityAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Thread_externalThreadKey_key`(`externalThreadKey`),
    INDEX `thread_channel_subject_idx`(`channelId`, `subjectKey`),
    INDEX `thread_activity_idx`(`lastActivityAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Message` (
    `id` VARCHAR(64) NOT NULL,
    `threadId` VARCHAR(64) NOT NULL,
    `channelId` VARCHAR(64) NOT NULL,
    `providerMessageId` VARCHAR(191) NULL,
    `fromEmail` VARCHAR(191) NOT NULL,
    `toRecipients` JSON NOT NULL,
    `ccRecipients` JSON NOT NULL,
    `bodyText` LONGTEXT NOT NULL,
    `bodyHtml` LONGTEXT NOT NULL,
    `attachments` JSON NOT NULL,
    `receivedAt` DATETIME(3) NOT NULL,
    `direction` VARCHAR(40) NOT NULL,
    `createdBy` VARCHAR(64) NULL,

    INDEX `message_thread_time_idx`(`threadId`, `receivedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Comment` (
    `id` VARCHAR(64) NOT NULL,
    `threadId` VARCHAR(64) NOT NULL,
    `authorId` VARCHAR(64) NOT NULL,
    `body` LONGTEXT NOT NULL,
    `visibility` VARCHAR(40) NOT NULL DEFAULT 'internal',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `comment_thread_time_idx`(`threadId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `OAuthAccount` ADD CONSTRAINT `OAuthAccount_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MessageTemplate` ADD CONSTRAINT `MessageTemplate_folderId_fkey` FOREIGN KEY (`folderId`) REFERENCES `TemplateFolder`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DelegationInbox` ADD CONSTRAINT `DelegationInbox_delegationId_fkey` FOREIGN KEY (`delegationId`) REFERENCES `Delegation`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DelegationInbox` ADD CONSTRAINT `DelegationInbox_inboxId_fkey` FOREIGN KEY (`inboxId`) REFERENCES `Inbox`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DelegationDelegate` ADD CONSTRAINT `DelegationDelegate_delegationId_fkey` FOREIGN KEY (`delegationId`) REFERENCES `Delegation`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SignatureChannel` ADD CONSTRAINT `SignatureChannel_signatureId_fkey` FOREIGN KEY (`signatureId`) REFERENCES `Signature`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SignatureChannel` ADD CONSTRAINT `SignatureChannel_channelId_fkey` FOREIGN KEY (`channelId`) REFERENCES `Channel`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Thread` ADD CONSTRAINT `Thread_channelId_fkey` FOREIGN KEY (`channelId`) REFERENCES `Channel`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Message` ADD CONSTRAINT `Message_threadId_fkey` FOREIGN KEY (`threadId`) REFERENCES `Thread`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Message` ADD CONSTRAINT `Message_channelId_fkey` FOREIGN KEY (`channelId`) REFERENCES `Channel`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Comment` ADD CONSTRAINT `Comment_threadId_fkey` FOREIGN KEY (`threadId`) REFERENCES `Thread`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
