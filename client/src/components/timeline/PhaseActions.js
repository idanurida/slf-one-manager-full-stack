// components/timeline/PhaseActions.js
export default function PhaseActions({ phase, currentRole, projectId }) {
  const canApprove = phase.permissions[currentRole]?.includes('approve');
  const canEdit = phase.permissions[currentRole]?.includes('edit');
  
  if (!canApprove && !canEdit) return null;

  return (
    <div className="flex gap-2">
      {canApprove && (
        <Button size="sm" variant="outline">
          <CheckCircle className="w-4 h-4 mr-1" />
          Approve Fase
        </Button>
      )}
      
      {canEdit && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="outline">
              <Settings className="w-4 h-4 mr-1" />
              Kelola
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>
              <Edit3 className="w-4 h-4 mr-2" />
              Edit Durasi
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Users className="w-4 h-4 mr-2" />
              Assign Resources
            </DropdownMenuItem>
            <DropdownMenuItem>
              <MessageSquare className="w-4 h-4 mr-2" />
              Kirim Notifikasi
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}