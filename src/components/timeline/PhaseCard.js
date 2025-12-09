// components/timeline/PhaseCard.js
export default function PhaseCard({ 
  phase, 
  projectId, 
  currentRole, 
  viewMode,
  onActivityUpdate 
}) {
  const [isExpanded, setIsExpanded] = useState(viewMode === 'detailed');
  const phaseProgress = calculatePhaseProgress(phase.activities);

  return (
    <Card className={`border-l-4 ${getPhaseBorderColor(phase.number)}`}>
      <CardHeader className="cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white ${getPhaseBgColor(phase.number)}`}>
                {phase.number}
              </div>
              <div>
                <CardTitle className="text-lg">
                  Fase {phase.number}: {phase.name}
                </CardTitle>
                <CardDescription>
                  {phase.description}
                </CardDescription>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <ProgressIndicator 
              value={phaseProgress} 
              size="sm" 
              showLabel 
            />
            <ChevronDown className={`w-5 h-5 transition-transform ${
              isExpanded ? 'rotate-180' : ''
            }`} />
          </div>
        </div>
      </CardHeader>
      
      <Collapsible open={isExpanded}>
        <CardContent>
          <div className="space-y-3">
            {phase.activities.map(activity => (
              <ActivityItem
                key={activity.id}
                activity={activity}
                currentRole={currentRole}
                projectId={projectId}
                onStatusChange={onActivityUpdate}
              />
            ))}
          </div>
          
          {/* Phase-level actions */}
          <div className="mt-4 flex justify-end gap-2">
            <PhaseActions 
              phase={phase}
              currentRole={currentRole}
              projectId={projectId}
            />
          </div>
        </CardContent>
      </Collapsible>
    </Card>
  );
}
