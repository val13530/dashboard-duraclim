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
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#F0F4F8' }}>
      <div style={{ background: '#fff', borderRadius: 14, padding: '40px 44px', boxShadow: '0 4px 24px rgba(0,0,0,0.10)', width: 380 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#1A2B4A', letterSpacing: 0.5 }}>DURACLIM</div>
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
