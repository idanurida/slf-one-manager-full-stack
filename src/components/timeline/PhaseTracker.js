// components/timeline/PhaseTracker.js
import { PROJECT_PHASES } from '@/utils/timeline-phases';
import { useAuth } from '@/context/AuthContext';

export default function PhaseTracker({ 
  projectId, 
  viewMode = 'detailed',
  filters = {},
  onPhaseChange 
}) {
  const { profile } = useAuth();
  const currentRole = profile?.role;
  
  // Filter phases based on role permissions
  const accessiblePhases = PROJECT_PHASES.filter(phase => 
    phase.permissions[currentRole]?.includes('view')
  );

  return (
    <div className="space-y-6">
      {accessiblePhases.map((phase) => (
        <PhaseCard
          key={phase.id}
          phase={phase}
          projectId={projectId}
          currentRole={currentRole}
          viewMode={viewMode}
          onActivityUpdate={onPhaseChange}
        />
      ))}
    </div>
  );
}
