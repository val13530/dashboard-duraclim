import { useState } from 'react';
import { supabase } from './supabaseClient';

export default function Login({ onLogin }) {
  const [nom, setNom] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!nom || !pin) { setError('Remplis tous les champs.'); return; }
    setLoading(true);
    setError('');
    try {
      const { data, error: dbError } = await supabase
        .from('utilisateurs')
        .select('nom, role, gestionnaire_name')
        .ilike('nom', nom.trim())
        .eq('pin', pin.trim())
        .single();
      if (dbError || !data) throw new Error('Nom ou PIN incorrect.');
      const user = { username: data.nom, role: data.role, gestionnaireName: data.gestionnaire_name || '' };
      sessionStorage.setItem('duraclim_user', JSON.stringify(user));
      onLogin(user);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'linear-gradient(160deg, #0a3d8f 0%, #1A2B4A 60%, #0d1f3c 100%)' }}>
      <div style={{ background: '#fff', borderRadius: 14, padding: '40px 44px', boxShadow: '0 8px 40px rgba(0,0,0,0.25)', width: 380 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <img src="data:image/jpeg;base64,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" alt="DuraClim" style={{ height: 48, objectFit: 'contain', marginBottom: 8 }} />
          <div style={{ fontSize: 13, color: '#6B7280', marginTop: 4 }}>Dashboard Operations</div>
        </div>
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Nom complet</div>
          <input
            type="text"
            value={nom}
            onChange={e => setNom(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            placeholder="ex: Hajar El Habachi"
            style={{ width: '100%', border: '1.5px solid #D1D5DB', borderRadius: 7, padding: '10px 12px', fontSize: 14, outline: 'none', boxSizing: 'border-box', color: '#1A2B4A', background: '#F9FAFB' }}
          />
        </div>
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>PIN</div>
          <input
            type="password"
            value={pin}
            onChange={e => setPin(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            placeholder="••••"
            maxLength={4}
            style={{ width: '100%', border: '1.5px solid #D1D5DB', borderRadius: 7, padding: '10px 12px', fontSize: 14, outline: 'none', boxSizing: 'border-box', color: '#1A2B4A', background: '#F9FAFB' }}
          />
        </div>
        {error && (
          <div style={{ background: '#FDECEA', border: '1px solid #F87171', borderRadius: 7, padding: '10px 14px', fontSize: 13, color: '#C0392B', marginBottom: 16 }}>{error}</div>
        )}
        <button
          onClick={handleSubmit}
          disabled={loading}
          style={{ width: '100%', background: loading ? '#93C5FD' : '#1A2B4A', color: '#fff', border: 'none', borderRadius: 7, padding: '12px', fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', transition: 'background 0.2s' }}
        >
          {loading ? 'Connexion...' : 'Se connecter'}
        </button>
      </div>
    </div>
  );
}
