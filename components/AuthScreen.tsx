'use client';
import { FormEvent, useState } from 'react';
import { BookOpen, Eye, EyeOff, GraduationCap, LockKeyhole, UserRound } from 'lucide-react';
import { supabase } from '@/lib/supabase';

function usernameEmail(username: string) {
  const clean = username.trim().toLowerCase();
  if (!/^[a-z0-9._-]{3,24}$/.test(clean)) return null;
  return `${clean}@users.vocabrise.app`;
}

export default function AuthScreen() {
  const [mode, setMode] = useState<'login'|'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function submit(e: FormEvent) {
    e.preventDefault(); setMessage(''); setError('');
    if (!supabase) { setError('Supabase belum dikonfigurasi. Isi NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY.'); return; }
    const email = usernameEmail(username);
    if (!email) { setError('Username harus 3–24 karakter dan hanya boleh berisi huruf, angka, titik, garis bawah, atau tanda hubung.'); return; }
    if (password.length < 8) { setError('Password minimal 8 karakter.'); return; }
    setBusy(true);
    try {
      if (mode === 'register') {
        const { error: signUpError } = await supabase.auth.signUp({ email, password, options: { data: { username: username.trim().toLowerCase() } } });
        if (signUpError) throw signUpError;
        setMessage('Akun berhasil dibuat. Jika konfirmasi email aktif di Supabase, nonaktifkan untuk mode username/password tanpa email. Coba login setelah pendaftaran.');
        setMode('login');
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
      }
    } catch (err) { setError(err instanceof Error ? err.message : 'Terjadi kesalahan. Coba lagi.'); }
    finally { setBusy(false); }
  }

  return <main className="auth-page">
    <div className="auth-glow auth-glow-one"/><div className="auth-glow auth-glow-two"/>
    <section className="auth-card">
      <div className="auth-brand"><div className="auth-brand-mark"><GraduationCap size={26}/></div><div><b>VocabRise</b><span>Grow your English</span></div></div>
      <div className="auth-icon"><BookOpen size={23}/></div>
      <p className="auth-eyebrow">YOUR DAILY ENGLISH SPACE</p>
      <h1>{mode === 'login' ? 'Welcome back.' : 'Start growing.'}</h1>
      <p className="auth-subtitle">{mode === 'login' ? 'Masuk dan lanjutkan perjalanan kosakatamu.' : 'Buat akun untuk menyimpan progres belajarmu.'}</p>
      <form onSubmit={submit} className="auth-form">
        <label htmlFor="username">Username</label>
        <div className="auth-input-wrap"><UserRound size={17}/><input id="username" autoComplete="username" value={username} onChange={e=>setUsername(e.target.value)} placeholder="contoh: masigoo" minLength={3} maxLength={24} required/></div>
        <label htmlFor="password">Password</label>
        <div className="auth-input-wrap"><LockKeyhole size={17}/><input id="password" type={showPassword?'text':'password'} autoComplete={mode==='login'?'current-password':'new-password'} value={password} onChange={e=>setPassword(e.target.value)} placeholder="Minimal 8 karakter" minLength={8} required/><button type="button" aria-label={showPassword?'Sembunyikan password':'Tampilkan password'} onClick={()=>setShowPassword(!showPassword)}>{showPassword?<EyeOff size={17}/>:<Eye size={17}/>}</button></div>
        {error && <div className="auth-alert auth-error">{error}</div>}{message && <div className="auth-alert auth-success">{message}</div>}
        <button className="auth-submit" disabled={busy}>{busy?'Memproses…':mode==='login'?'Login':'Buat akun'} <span>→</span></button>
      </form>
      <div className="auth-switch">{mode==='login'?"Belum punya akun?":"Sudah punya akun?"} <button onClick={()=>{setMode(mode==='login'?'register':'login');setError('');setMessage('');}}>{mode==='login'?'Daftar sekarang':'Login'}</button></div>
      <p className="auth-note">Username dan password saja. Gunakan username yang mudah diingat.</p>
    </section>
    <footer className="auth-footer">© 2026 VocabRise | Igoo</footer>
  </main>;
}
