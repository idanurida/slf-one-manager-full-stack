# SLF One Manager App

A comprehensive management system for SLF (Surat Layanan Fungsional) with role-based dashboard.

## ?? Features

- **??? Drafter Dashboard** - Complete dashboard for drafters
- **?? Project Management** - Manage construction projects
- **?? Document Management** - Handle SLF documents and approvals
- **?? Multi-role System** - Admin, Drafter, Project Lead roles
- **?? Modern UI** - Built with shadcn/ui and Tailwind CSS
- **?? Secure Authentication** - Supabase Auth integration

## ?? Tech Stack

- **Frontend**: Next.js 14, React 18
- **Styling**: Tailwind CSS, shadcn/ui
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Icons**: Lucide React
- **UI Components**: Radix UI, shadcn/ui

## ?? Project Structure

\\\
src/
+-- components/          # Reusable components
¦   +-- ui/             # shadcn/ui components
¦   +-- layouts/        # Layout components
+-- pages/              # Next.js pages
¦   +-- dashboard/      # Role-based dashboards
+-- context/            # React context providers
+-- utils/              # Utility functions
+-- styles/             # Global styles
\\\

## ??? Dashboard Structure

- \/dashboard/drafter\ - Drafter dashboard
- \/dashboard/drafter/projects\ - Project management
- \/dashboard/drafter/documents\ - Document management
- \/dashboard/admin-lead\ - Admin lead dashboard

## ?? Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account

### Installation

1. **Clone the repository**
   \\\ash
   git clone https://github.com/idanurida/slf-one-manager-app.git
   cd slf-one-manager-app
   \\\

2. **Install dependencies**
   \\\ash
   npm install
   \\\

3. **Environment Setup**
   - Copy \.env.example\ to \.env.local\
   - Add your Supabase credentials:
     \\\
     NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
     NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
     \\\

4. **Run development server**
   \\\ash
   npm run dev
   \\\

5. **Open your browser**
   - Navigate to [http://localhost:3000](http://localhost:3000)

## ?? Available Scripts

- \
pm run dev\ - Start development server
- \
pm run build\ - Build for production
- \
pm run start\ - Start production server
- \
pm run lint\ - Run ESLint

## ?? Deployment

### Vercel (Recommended)
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/idanurida/slf-one-manager-app)

### Netlify
[![Deploy with Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/idanurida/slf-one-manager-app)

## ?? Roles & Permissions

- **Drafter**: Create and manage documents, view assigned projects
- **Project Lead**: Review and verify documents, manage projects
- **Admin Lead**: System administration, user management

## ?? Development

### Adding New Components
\\\ash
npx shadcn-ui@latest add [component-name]
\\\

### Database Schema
See \supabase/\ directory for database schema and migrations.

## ?? Contributing

1. Fork the repository
2. Create your feature branch (\git checkout -b feature/AmazingFeature\)
3. Commit your changes (\git commit -m 'Add some AmazingFeature'\)
4. Push to the branch (\git push origin feature/AmazingFeature\)
5. Open a Pull Request

## ?? License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## ?? Acknowledgments

- [Next.js](https://nextjs.org/) - The React Framework
- [Supabase](https://supabase.com/) - Open Source Firebase Alternative
- [shadcn/ui](https://ui.shadcn.com/) - Reusable components
- [Tailwind CSS](https://tailwindcss.com/) - CSS framework
