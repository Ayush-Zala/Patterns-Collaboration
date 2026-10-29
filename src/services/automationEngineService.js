class AutomationEngineService {
  constructor({ store }) {
    this.store = store;
    this.roundRobinState = new Map(); // ruleId -> lastAssignedIndex
  }

  async handleInboundMessage(payload) {
    const { orgId, channelId, threadId, message, isNewThread } = payload;
    if (!orgId || !threadId) return;

    try {
      console.log(`[AutomationEngine] Evaluating inbound_received for thread ${threadId}`);
      
      const channel = await this.store.getChannel(channelId);
      if (!channel) return;

      // 1. Fetch active rules for the org that match the channel's scope
      const rules = await this.store.prisma.automationRule.findMany({
        where: { 
          organizationId: orgId, 
          isActive: true,
          scopeType: channel.scopeType || "company",
          scopeId: channel.scopeId || "global"
        },
        orderBy: { createdAt: 'asc' }
      });

      if (!rules.length) return;

      const thread = await this.store.getThread(threadId);
      if (!thread) return;

      for (const rule of rules) {
        let shouldStop = false;

        // Verify triggers
        let triggers = [];
        try { triggers = JSON.parse(rule.triggers || '[]'); } catch (e) {}
        
        const isTriggered = triggers.some(t => t.type === 'inbound_received');
        if (!isTriggered) continue;

        // Verify conditions
        let conditions = [];
        try { conditions = JSON.parse(rule.conditions || '[]'); } catch (e) {}

        const matchesConditions = conditions.every(c => {
          if (c.field === 'status_open') return thread.status === 'open';
          if (c.field === 'status_archived') return thread.status === 'archived';
          if (c.field === 'status_snoozed') return thread.status === 'snoozed';
          if (c.field === 'in_inbox') {
            // Note: simple check, assumes channel name match or any
            return c.value === 'any' || (channel && channel.name && channel.name.toLowerCase() === c.value.toLowerCase());
          }
          return true; // Unknown condition passes by default
        });

        if (!matchesConditions) continue;

        // Execute actions
        let actions = [];
        try { actions = JSON.parse(rule.actions || '[]'); } catch (e) {}

        for (const act of actions) {
          console.log(`[AutomationEngine] Executing action ${act.action} for rule ${rule.id} on thread ${threadId}`);
          
          if (act.action === 'archive') {
            await this.store.updateThread(threadId, { status: 'archived' });
          } else if (act.action === 'snooze') {
            const snoozeUntil = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // Default 24h
            await this.store.updateThread(threadId, { status: 'snoozed', snooze_until: snoozeUntil });
          } else if (act.action === 'assign') {
            if (act.value && act.value !== 'round_robin') {
              await this.store.assignThread({ thread_id: threadId, assigned_to: act.value, actor_id: 'system' });
            } else if (act.value === 'round_robin') {
              const orgUsers = await this.store.prisma.user.findMany({
                where: { organizationId: orgId }
              });
              if (orgUsers.length > 0) {
                const lastIndex = this.roundRobinState.get(rule.id) || 0;
                const nextIndex = (lastIndex + 1) % orgUsers.length;
                this.roundRobinState.set(rule.id, nextIndex);
                const assignedUser = orgUsers[nextIndex];
                
                await this.store.assignThread({ thread_id: threadId, assigned_to: assignedUser.id, actor_id: 'system' });
                console.log(`[AutomationEngine] Round Robin assigned thread ${threadId} to ${assignedUser.id}`);
              }
            }
          } else if (act.action === 'add_tag') {
             if (act.value) {
               let currentTags = [];
               try { currentTags = JSON.parse(thread.tags || '[]'); } catch (e) {}
               if (!Array.isArray(currentTags)) currentTags = [];
               
               if (!currentTags.includes(act.value)) {
                 currentTags.push(act.value);
                 await this.store.updateThread(threadId, { tags: currentTags });
                 thread.tags = JSON.stringify(currentTags);
                 console.log(`[AutomationEngine] Added tag ${act.value} to thread ${threadId}`);
               }
             }
          }
        }

        // Add execution telemetry
        if (actions.length > 0) {
          try {
            await this.store.addComment({
              thread_id: threadId,
              created_by: null, // System comment
              body_text: `⚙️ Automation Rule: '${rule.name}' executed.`,
              body_html: `<p>⚙️ <strong>Automation Rule:</strong> '${rule.name}' executed.</p>`
            });
            console.log(`[AutomationEngine] Telemetry logged for rule ${rule.name}`);
          } catch (err) {
            console.warn(`[AutomationEngine] Failed to log telemetry for rule ${rule.name}:`, err);
          }
        }

        if (rule.stopProcessing) {
          console.log(`[AutomationEngine] stopProcessing is true, halting further rules.`);
          break;
        }
      }
    } catch (error) {
      console.error(`[AutomationEngine] Error evaluating rules for thread ${threadId}:`, error);
    }
  }

  async executeMacro(payload) {
    const { orgId, ruleId, threadId, actorId } = payload;
    try {
      console.log(`[AutomationEngine] Executing manual macro ${ruleId} for thread ${threadId}`);
      
      const rule = await this.store.prisma.automationRule.findUnique({
        where: { id: ruleId }
      });

      if (!rule || !rule.isActive) {
        console.warn(`[AutomationEngine] Macro ${ruleId} is inactive or not found.`);
        return;
      }

      const thread = await this.store.getThread(threadId);
      if (!thread) return;

      let actions = [];
      try { actions = JSON.parse(rule.actions || '[]'); } catch (e) {}

      // Execute actions
      for (const act of actions) {
        if (act.action === 'archive') {
          await this.store.updateThread(threadId, { status: 'archived' });
        } else if (act.action === 'snooze') {
          const snoozeUntil = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
          await this.store.updateThread(threadId, { status: 'snoozed', snooze_until: snoozeUntil });
        } else if (act.action === 'assign') {
          if (act.value && act.value !== 'round_robin') {
            await this.store.assignThread({ thread_id: threadId, assigned_to: act.value, actor_id: actorId });
          } else if (act.value === 'round_robin') {
            const orgUsers = await this.store.prisma.user.findMany({ where: { organizationId: orgId } });
            if (orgUsers.length > 0) {
              const lastIndex = this.roundRobinState.get(rule.id) || 0;
              const nextIndex = (lastIndex + 1) % orgUsers.length;
              this.roundRobinState.set(rule.id, nextIndex);
              const assignedUser = orgUsers[nextIndex];
              await this.store.assignThread({ thread_id: threadId, assigned_to: assignedUser.id, actor_id: actorId });
            }
          }
        } else if (act.action === 'add_tag') {
           if (act.value) {
             let currentTags = [];
             try { currentTags = JSON.parse(thread.tags || '[]'); } catch (e) {}
             if (!Array.isArray(currentTags)) currentTags = [];
             if (!currentTags.includes(act.value)) {
               currentTags.push(act.value);
               await this.store.updateThread(threadId, { tags: currentTags });
               thread.tags = JSON.stringify(currentTags);
             }
           }
        }
      }

      // Telemetry
      if (actions.length > 0) {
        try {
          await this.store.addComment({
            thread_id: threadId,
            created_by: actorId, // Show who triggered the macro
            body_text: `⚡ Macro Executed: '${rule.name}'`,
            body_html: `<p>⚡ <strong>Macro Executed:</strong> '${rule.name}'</p>`
          });
        } catch (err) {
          console.warn(`[AutomationEngine] Failed to log telemetry for macro ${rule.name}:`, err);
        }
      }

    } catch (error) {
      console.error(`[AutomationEngine] Error executing macro ${ruleId} for thread ${threadId}:`, error);
    }
  }
}

module.exports = { AutomationEngineService };
