// client/src/mocks/todos.js

const mockTodos = {
  superadmin: [
    { id: 1, text: 'Review system performance logs', completed: false },
    { id: 2, text: 'Backup database', completed: true },
    { id: 3, text: 'Onboard new client PT. Sejahtera', completed: false },
  ],
  admin_lead: [
    { id: 1, text: 'Follow up payment for Proyek Hotel Bintang 5', completed: false },
    { id: 2, text: 'Prepare contract for Renovasi Gedung A', completed: false },
    { id: 3, text: 'Schedule kick-off meeting for Mall C', completed: true },
  ],
  project_lead: [
    { id: 1, text: 'Assign inspector for Gedung A', completed: false },
    { id: 2, text: 'Review draft report from Doni', completed: false },
    { id: 3, text: 'Check project timeline for Hotel Bintang 5', completed: true },
  ],
  inspector: [
    { id: 1, text: 'Prepare tools for inspection at Gedung A', completed: false },
    { id: 2, text: 'Upload photos for Mall C inspection', completed: true },
    { id: 3, text: 'Finalize checklist responses for Hotel Bintang 5', completed: false },
  ],
  drafter: [
    { id: 1, text: 'Generate initial report for Gedung A', completed: false },
    { id: 2, text: 'Incorporate revisions for Mall C report', completed: true },
  ],
  client: [
    { id: 1, text: 'Review and approve schedule for kick-off meeting', completed: false },
    { id: 2, text: 'Upload IMB document for Renovasi Gedung A', completed: true },
    { id: 3, text: 'Sign contract for Hotel Bintang 5', completed: false },
  ],
};

export const getTodosByRole = (role) => {
    return mockTodos[role] || [];
}
