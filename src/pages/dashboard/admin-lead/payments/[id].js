"use client";

import { useRouter } from 'next/router';

export default function MinimalPage() {
  const router = useRouter();
  const { id } = router?.query || {};
  
  return (
    <div style={{padding: '2rem', textAlign: 'center'}}>
      <h1>Page Loading</h1>
      <p>Dynamic content loading for ID: {id || 'N/A'}</p>
      <p>Full functionality available after deployment stabilization.</p>
    </div>
  );
}
