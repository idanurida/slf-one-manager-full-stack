// components/timeline/ActivityItem.js
export default function ActivityItem({ 
  activity, 
  currentRole, 
  projectId,
  onStatusChange 
}) {
  const [currentStatus, setCurrentStatus] = useState(activity.status);
  const canUpdate = activity.permissions[currentRole]?.includes('update');

  const handleStatusChange = async (newStatus) => {
    try {
      // Update in database
      await updateActivityStatus(activity.id, newStatus, projectId);
      setCurrentStatus(newStatus);
      onStatusChange?.(activity.id, newStatus);
      
      toast.success(`Status ${activity.name} diperbarui`);
    } catch (error) {
      toast.error('Gagal memperbarui status');
    }
  };

  return (
    <div className="flex items-center justify-between p-3 border rounded-lg bg-white">
      <div className="flex items-center gap-3 flex-1">
        <StatusBadge status={currentStatus} />
        
        <div className="flex-1">
          <p className="font-medium text-sm">{activity.name}</p>
          <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
            <span className="flex items-center gap-1">
              <User className="w-3 h-3" />
              {getRoleDisplayName(activity.role)}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {activity.duration} hari
            </span>
            {activity.dependencies.length > 0 && (
              <span className="flex items-center gap-1">
                <Link className="w-3 h-3" />
                Bergantung: {activity.dependencies.join(', ')}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Action buttons based on role permissions */}
      <div className="flex items-center gap-2">
        {canUpdate && (
          <ActivityActions 
            activity={activity}
            currentStatus={currentStatus}
            onStatusChange={handleStatusChange}
          />
        )}
        
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon">
              <Info className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-sm">
              <p><strong>Role:</strong> {getRoleDisplayName(activity.role)}</p>
              <p><strong>Durasi:</strong> {activity.duration} hari</p>
              {activity.description && (
                <p><strong>Deskripsi:</strong> {activity.description}</p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
