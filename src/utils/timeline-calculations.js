// utils/timeline-calculations.js
export const updateActivityStatus = async (activityId, newStatus, updatedBy) => {
  // Update di database
  await supabase
    .from('project_activities')
    .update({ 
      status: newStatus,
      updated_by: updatedBy,
      updated_at: new Date().toISOString()
    })
    .eq('id', activityId);

  // Trigger notifications ke roles terkait
  await sendPhaseNotification(activityId, newStatus, updatedBy);
};
