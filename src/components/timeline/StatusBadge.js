// components/timeline/StatusBadge.js
const STATUS_CONFIG = {
  pending: {
    label: 'Menunggu',
    variant: 'secondary',
    color: 'text-yellow-700 bg-yellow-100 border-yellow-200'
  },
  in_progress: {
    label: 'Dalam Proses', 
    variant: 'default',
    color: 'text-blue-700 bg-blue-100 border-blue-200'
  },
  completed: {
    label: 'Selesai',
    variant: 'success', 
    color: 'text-green-700 bg-green-100 border-green-200'
  },
  blocked: {
    label: 'Tertahan',
    variant: 'destructive',
    color: 'text-red-700 bg-red-100 border-red-200'
  },
  scheduled: {
    label: 'Terjadwal',
    variant: 'outline',
    color: 'text-purple-700 bg-purple-100 border-purple-200'
  }
};

export default function StatusBadge({ status, size = 'default' }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  
  return (
    <Badge 
      variant={config.variant}
      className={`${config.color} ${size === 'sm' ? 'text-xs' : ''}`}
    >
      {config.label}
    </Badge>
  );
}
