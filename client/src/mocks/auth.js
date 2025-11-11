// client/src/mocks/auth.js

// Daftar lengkap pengguna mock dengan role yang berbeda
const mockUsers = {
  'admin@mock.com': {
    token: 'mock-jwt-superadmin',
    user: {
      id: 'user-superadmin',
      name: 'Super Admin',
      email: 'admin@mock.com',
      role: 'superadmin',
      avatar: 'https://i.pravatar.cc/150?u=superadmin'
    }
  },
  'lead@mock.com': {
    token: 'mock-jwt-lead',
    user: {
      id: 'user-lead',
      name: 'Project Lead Budi',
      email: 'lead@mock.com',
      role: 'project-lead',
      avatar: 'https://i.pravatar.cc/150?u=lead'
    }
  },
  'inspector@mock.com': {
    token: 'mock-jwt-inspector',
    user: {
      id: 'user-inspector',
      name: 'Inspector Citra',
      email: 'inspector@mock.com',
      role: 'inspector',
      avatar: 'https://i.pravatar.cc/150?u=inspector'
    }
  },
  'client@mock.com': {
    token: 'mock-jwt-client',
    user: {
      id: 'user-client',
      name: 'Client PT. Maju Jaya',
      email: 'client@mock.com',
      role: 'client',
      avatar: 'https://i.pravatar.cc/150?u=client'
    }
  },
  'drafter@mock.com': {
    token: 'mock-jwt-drafter',
    user: {
      id: 'user-drafter',
      name: 'Drafter Doni',
      email: 'drafter@mock.com',
      role: 'drafter',
      avatar: 'https://i.pravatar.cc/150?u=drafter'
    }
  },
  'adminlead@mock.com': {
    token: 'mock-jwt-adminlead',
    user: {
      id: 'user-adminlead',
      name: 'Admin Lead Ani',
      email: 'adminlead@mock.com',
      role: 'admin_lead',
      avatar: 'https://i.pravatar.cc/150?u=adminlead'
    }
  }
};

// Fungsi untuk mendapatkan data login berdasarkan email
export const getMockLoginResponse = (email) => {
  return mockUsers[email] || null;
};

// Data default jika diperlukan
export const mockLoginResponse = mockUsers['admin@mock.com']; 
export const mockMeResponse = { data: mockUsers['admin@mock.com'].user };
