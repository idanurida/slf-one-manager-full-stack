// client/src/mocks/admin.js

export const mockAdminStats = {
  data: {
    totalPayments: 15,
    pendingPayments: 3,
    verifiedPayments: 10,
    rejectedPayments: 2,
  }
};

export const mockPendingPayments = {
  data: [
    {
      id: 'pay-001',
      amount: 5000000,
      payment_date: '2024-08-05T00:00:00.000Z',
      status: 'pending',
      project: {
        name: 'Renovasi Gedung A',
        owner_name: 'PT. Maju Jaya'
      }
    },
    {
      id: 'pay-002',
      amount: 12500000,
      payment_date: '2024-08-04T00:00:00.000Z',
      status: 'pending',
      project: {
        name: 'Pembangunan Hotel Bintang 5',
        owner_name: 'Grup Hotel Sejahtera'
      }
    },
    {
      id: 'pay-003',
      amount: 2000000,
      payment_date: '2024-08-03T00:00:00.000Z',
      status: 'pending',
      project: {
        name: 'Perpanjangan SLF Mall C',
        owner_name: 'PT. Retail Makmur'
      }
    }
  ]
};

export const mockPaymentDetail = {
    data: {
        id: 'pay-001',
        amount: 5000000,
        payment_date: '2024-08-05T00:00:00.000Z',
        status: 'pending',
        method: 'Bank Transfer',
        proof_url: 'https://via.placeholder.com/400x500.png?text=Bukti+Transfer',
        project: {
            id: 'proj-001',
            name: 'Renovasi Gedung A',
            owner_name: 'PT. Maju Jaya'
        },
        invoice: {
            id: 'INV-2024-001',
            issue_date: '2024-07-20T00:00:00.000Z',
            due_date: '2024-08-10T00:00:00.000Z'
        }
    }
};

export const mockProjectQuotations = {
    data: [
        {
            id: 'quo-001',
            version: 'v1.0',
            amount: 250000000,
            status: 'Sent',
            created_at: '2024-07-15T00:00:00.000Z'
        },
        {
            id: 'quo-002',
            version: 'v1.1 (revisi)',
            amount: 265000000,
            status: 'Accepted',
            created_at: '2024-07-20T00:00:00.000Z'
        }
    ]
};

export const mockProjectContracts = {
    data: [
        {
            id: 'con-001',
            title: 'Kontrak Kerja SLF Renovasi Gedung A',
            status: 'Signed',
            signed_at: '2024-07-25T00:00:00.000Z',
            file_url: '#'
        }
    ]
};
