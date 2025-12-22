# SLF One Premium Dashboard Design Template

This document serves as the official template and style guide for upgrading user role dashboards across the SLF One Manager system to a premium, modern, and mobile-responsive UI.

## 1. Design Tokens

### Colors (Tailwind Classes)
- **Primary Accent**: `#7c3aed` (Violet-600) -> `text-[#7c3aed]`, `bg-[#7c3aed]`, `shadow-[#7c3aed]/20`
- **Surface Background**: 
  - Light: `#f8fafc` (Slate-50)
  - Dark: `#0f172a` (Slate-950)
- **Card Content Background**:
  - Light: `white`
  - Dark: `#1e293b` (Slate-800)
- **Secondary Surfaces**:
  - Light: `bg-slate-50`
  - Dark: `bg-white/5`
- **Borders**: `border-slate-100` (Light) / `border-white/5` (Dark)
- **Text**:
  - Main Heading: `text-slate-900` / `text-white`
  - Subtext/Label: `text-slate-500` / `text-slate-400`

### Typography
- **Core Strategy**: Heavy contrast between black weights and wide tracking.
- **H1 Titles**: `text-4xl md:text-5xl font-black tracking-tighter uppercase leading-none`
- **Section Headers**: `text-xl font-black uppercase tracking-tighter`
- **Status/Caps Labels**: `text-[10px] font-black uppercase tracking-widest`
- **Body Semibold**: `text-sm font-semibold tracking-tight`

### Imagery & Branding
- **Official Logos**: Always use `dark:brightness-110 dark:contrast-110 bg-transparent` to ensure visibility in dark mode.
- **Geometry**: Large outer radii (`rounded-[2.5rem]`) for main content areas, medium (`rounded-2xl`) for interactive elements.

---

## 2. Core Layout Patterns

### DashboardLayout Integration
All pages must use the global `DashboardLayout` without local sidebar/header/footer definitions.
```jsx
<DashboardLayout>
  <div className="max-w-[1400px] mx-auto space-y-10">
    {/* Page Header */}
    <motion.div variants={itemVariants} className="...">
       <h1 className="...">Project <span className="text-[#7c3aed]">Tracking</span></h1>
    </motion.div>
    ...
  </div>
</DashboardLayout>
```

### Premium Header Right Actions
Standardized set of actions are now centrally handled by `DashboardLayout`. Ensure `profile` data is passed through `AuthContext`.

---

## 3. UI Components & Dependencies

### Required Imports
Ensure these libraries are imported for the premium UI to function correctly.
```javascript
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { 
  TrendingUp, CheckCircle2, Clock, AlertTriangle, Building, 
  MapPin, Calendar, FileText, Eye, RefreshCw, Search, Filter 
} from "lucide-react";
```

### Compact Stat Card (`StatSimple`)
Used for quick metric overviews without taking too much vertical space.
```jsx
function StatSimple({ title, value, icon, color, bg }) {
  return (
    <div className="flex items-center gap-3 bg-white dark:bg-[#1e293b] p-3 rounded-2xl border border-slate-100 dark:border-white/5 shadow-lg shadow-slate-200/30 dark:shadow-none transition-all hover:scale-105">
      <div className={`size-8 rounded-lg flex items-center justify-center ${bg} ${color}`}>
        {icon}
      </div>
      <div className="flex flex-col">
        <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter leading-none">{title}</span>
        <span className="text-xs font-black leading-tight mt-0.5">{value}</span>
      </div>
    </div>
  );
}
```

### Premium Table Wrap
```jsx
<div className="bg-white dark:bg-[#1e293b] rounded-[2.5rem] shadow-2xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-white/5 overflow-hidden transition-all duration-300">
  <div className="overflow-x-auto">
    <table className="w-full text-left">
      <thead className="bg-slate-50/80 dark:bg-white/5 text-slate-400 uppercase font-black text-[10px] tracking-[0.15em] border-b border-slate-100 dark:border-white/5">
        <tr>
          {/* Table cells with px-8 py-6 for premium spacing */}
        </tr>
      </thead>
      ...
    </table>
  </div>
</div>
```

### Project Timeline Card (New Standard)
A card component that visualizes project progress with a sleek progress bar and phase dots.
```jsx
const ProjectTimelineCardPremium = ({ project, onView }) => {
  // Logic to calculate progress...
  return (
    <motion.div whileHover={{ y: -10 }} className="bg-white dark:bg-[#1e293b] rounded-[2.5rem] p-8 border border-slate-100 dark:border-white/5 shadow-2xl">
      {/* Header */}
      <div className="flex justify-between mb-8">...</div>
      
      {/* Progress Bar */}
      <div className="h-2 w-full bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
        <motion.div
           initial={{ width: 0 }}
           animate={{ width: `${progress}%` }}
           className="h-full bg-gradient-to-r from-[#7c3aed] to-blue-500"
        />
      </div>
      
      {/* Phase Indicators */}
      <div className="flex justify-between mt-4">
         {/* Phase dots... */}
      </div>
    </motion.div>
  )
}
```

---

## 4. Feature Specific Patterns

### Multi-Tenancy & Data Security (CRITICAL)
All queries **must** enforce exclusivity based on the user's role.

#### 1. Admin Lead Exclusivity
Admin Leads must ONLY see projects they created OR are assigned to.
```javascript
// Fetch Projects
const { data } = await supabase
  .from('projects')
  .select('*')
  .or(`created_by.eq.${user.id},admin_lead_id.eq.${user.id}`); // Creator OR Assigned Lead
```

#### 2. Shared Resource Assignment (Staff)
When assigning staff (e.g., Inspectors) to a project, fetch from the global pool but filter the *assignment* to the specific project.
```javascript
// Fetch Available Staff (Global)
const { data: staff } = await supabase.from('profiles').select('*').neq('role', 'client');

// Assign to Specific Project
await supabase.from('project_teams').insert({ project_id: id, user_id: staffId, role: 'inspector' });
```

### Premium Chat Interface
A two-column layout optimized for dashboard integration.
- **Container**: `flex bg-white dark:bg-[#1e293b]/50 rounded-[2.5rem] border border-slate-100 dark:border-white/5 overflow-hidden h-[calc(100vh-200px)] min-h-[600px] shadow-2xl`
- **Internal Sidebar**: Fixed width `w-[380px]` with `overflow-y-auto`.
- **Chat Feed**: Scrollable area with absolute-positioned "Input Dock".

### Status Badges
Consistent badge styling using `getStatusStyles` helper mappings.
- **Style**: `inline-flex px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border`
- **Logic**: Centralize status mapping in a helper function to match `projects.status`.

### Vertical Timeline Visualization
Vertical timeline connector for process flows.
- **Vertical Line**: `absolute left-[50%] top-0 bottom-0 w-px bg-slate-200 dark:bg-white/10 -translate-x-1/2`
- **Center Node**: `size-10 rounded-full border-4 shadow-xl` (Active: `ring-4 ring-primary/20`)

---

## 5. Implementation Checklist
1. [x] **Zero Redundancy**: Remove all local `<aside>`, `<header>`, and `<Footer>` tags.
2. [x] **Typography Sync**: Apply `font-black` and `uppercase` for all status and navigation headers.
3. [x] **Radius Audit**: Ensure main containers use `2.5rem` and buttons/inputs use `2xl`.
4. [x] **Multi-Tenancy Check**: Verify all queries use `.or()` or `.eq('user_id')` filters.
5. [x] **Empty States**: Implement premium empty states with large icons (opacity 20%) and uppercase call-to-action buttons.
