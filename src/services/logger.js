import { api } from './db';

/**
 * Logs an action to the audit logs table
 * @param {Object} actor - The user performing the action (should have id, name/username/display_name, and role)
 * @param {string} action - Action description (e.g., "Deleted Ticket", "Created Project")
 * @param {string} entityType - The type of entity (e.g., "Ticket", "Project", "Task", "User")
 * @param {string} entityId - The ID of the entity being acted upon
 * @param {Object} details - Additional metadata (e.g., { ticketMessage: "fix login", priority: "high" })
 */
export const logAction = async (actor, action, entityType, entityId, details = {}) => {
  try {
    const logId = `LOG-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    
    // Normalize actor details
    const actorId = actor?.id || 'unknown';
    const actorName = actor?.display_name || actor?.name || actor?.client || actor?.username || 'Unknown User';
    let actorRole = actor?.role || 'member';
    if (actor?.client) actorRole = 'client'; // If it's a project object acting as client portal login
    
    const logEntry = {
      id: logId,
      actor_id: actorId,
      actor_name: actorName,
      actor_role: actorRole,
      action,
      entity_type: entityType,
      entity_id: entityId,
      details,
      created_at: new Date().toISOString()
    };

    await api.upsertRow('gpm_logs', logEntry);
    console.log('[Audit Log]', action, entityType, entityId);
  } catch (err) {
    console.error("Failed to log action:", err);
  }
};
