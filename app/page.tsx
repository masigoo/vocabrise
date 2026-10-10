'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { BookOpen, CalendarDays, Check, ChevronLeft, ChevronRight, Clock3, Flame, GraduationCap, History, Home, Menu, Moon, Search, Settings2, Sun, Target, Trophy, Volume2, X, ArrowLeft, RotateCcw, CheckCircle2, ShieldCheck, Users, LogOut, Activity } from 'lucide-react';
import { loadWords } from '@/lib/words';
import type { Progress, Word } from '@/lib/types';
import AuthScreen from '@/components/AuthScreen';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

type View = 'home' | 'learn' | 'vocabulary' | 'history' | 'settings' | 'admin';
const PROGRESS_KEY = 'vocabrise-progress-v1';
const TARGET_KEY = 'vocabrise-target-v1';
const THEME_KEY = 'vocabrise-theme-v1';
const SESSION_KEY = 'vocabrise-session-v1';
const todayKey = () => new Date().toLocaleDateString('en-CA');
const prettyDate = (d = new Date()) => d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const prettyTime = (d = new Date()) => d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

export default function HomePage() {
  const [words, setWords] = useState<Word[]>([]);
  const [progress, setProgress] = useState<Progress[]>([]);
  const [target, setTarget] = useState(15);
  const [theme, setTheme] = useState<'light'|'dark'>('light');
  const [view, setView] = useState<View>('home');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = (next: View) => { setView(next); setMobileMenuOpen(false); };
  const [index, setIndex] = useState(0);
  const [session, setSession] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all'|'learned'|'unlearned'>('all');
  const [clock, setClock] = useState(new Date());
  const [loaded, setLoaded] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [user, setUser] = useState<User|null>(null);
  const [username, setUsername] = useState('');
  const [role, setRole] = useState<'user'|'admin'>('user');
  const [toast, setToast] = useState('');
  const [showFinish, setShowFinish] = useState(false);
  const [adminProfiles, setAdminProfiles] = useState<Array<{id:string;username:string;role:string;created_at:string}>>([]);
  const [adminActivity, setAdminActivity] = useState<Array<{id:number;user_id:string;event_type:string;details:Record<string,unknown>;created_at:string}>>([]);
  const [adminProgress, setAdminProgress] = useState<Array<{user_id:string;word_id:number;learned_at:string}>>([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminRefresh, setAdminRefresh] = useState(0);

  useEffect(() => {
    loadWords().then(setWords).catch(() => setWords([]));
    try { setTheme((localStorage.getItem(THEME_KEY) as 'light'|'dark') || 'light'); setSession(JSON.parse(sessionStorage.getItem(SESSION_KEY) || '[]')); } catch {}
    const timer = window.setInterval(() => setClock(new Date()), 30_000);
    if (!supabase) { setAuthReady(true); return () => window.clearInterval(timer); }
    supabase.auth.getSession().then(({data}) => { setUser(data.session?.user ?? null); setAuthReady(true); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => { setUser(session?.user ?? null); setAuthReady(true); setLoaded(false); });
    return () => { window.clearInterval(timer); subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!user || !supabase) { setLoaded(false); setProgress([]); setUsername(''); setRole('user'); return; }
    let cancelled = false;
    (async () => {
      const [profileRes, progressRes, settingsRes] = await Promise.all([
        supabase!.from('profiles').select('username,role').eq('id', user.id).single(),
        supabase!.from('user_progress').select('word_id,learned_at').eq('user_id', user.id).order('learned_at', {ascending:false}),
        supabase!.from('user_settings').select('daily_target,theme').eq('user_id', user.id).maybeSingle()
      ]);
      if (cancelled) return;
      if (profileRes.data) { setUsername(profileRes.data.username); setRole(profileRes.data.role === 'admin' ? 'admin' : 'user'); }
      if (progressRes.data) setProgress(progressRes.data.map((p:any) => ({wordId:String(p.word_id), learnedAt:p.learned_at})));
      if (settingsRes.data) { setTarget(settingsRes.data.daily_target || 15); setTheme(settingsRes.data.theme === 'dark' ? 'dark' : 'light'); }
      else setTarget(15);
      setLoaded(true);
      await supabase!.from('activity_logs').insert({user_id:user.id,event_type:'login',details:{source:'web'}});
    })();
    return () => { cancelled = true; };
  }, [user]);

  useEffect(() => { if (loaded && user && supabase) { supabase.from('user_settings').upsert({user_id:user.id,daily_target:target,theme,updated_at:new Date().toISOString()},{onConflict:'user_id'}); } }, [target, theme, loaded, user]);
  useEffect(() => { if (loaded && user && supabase) localStorage.setItem(THEME_KEY, theme); }, [theme, loaded, user]);
  useEffect(() => { if (loaded) sessionStorage.setItem(SESSION_KEY, JSON.stringify(session)); }, [session, loaded]);
  useEffect(() => { if (!toast) return; const t = window.setTimeout(() => setToast(''), 2400); return () => window.clearTimeout(t); }, [toast]);

  useEffect(() => {
    if (view !== 'admin' || role !== 'admin' || !supabase) return;
    let cancelled = false;
    setAdminLoading(true);
    Promise.all([
      supabase.from('profiles').select('id,username,role,created_at').order('created_at',{ascending:false}),
      supabase.from('activity_logs').select('id,user_id,event_type,details,created_at').order('created_at',{ascending:false}).limit(150),
      supabase.from('user_progress').select('user_id,word_id,learned_at').order('learned_at',{ascending:false}).limit(5000)
    ]).then(([profilesRes, activityRes, progressRes]) => {
      if (cancelled) return;
      if (profilesRes.data) setAdminProfiles(profilesRes.data as any);
      if (activityRes.data) setAdminActivity(activityRes.data as any);
      if (progressRes.data) setAdminProgress(progressRes.data as any);
    }).finally(() => { if (!cancelled) setAdminLoading(false); });
    return () => { cancelled = true; };
  }, [view, role, adminRefresh]);

  const logActivity = (eventType:string, details:Record<string,unknown>={}) => {
    if (user && supabase) void supabase.from('activity_logs').insert({user_id:user.id,event_type:eventType,details});
  };
  const signOut = async () => { if (supabase) await supabase.auth.signOut(); setView('home'); setProgress([]); setUsername(''); setRole('user'); };

  const learnedIds = useMemo(() => new Set(progress.map(p => String(p.wordId))), [progress]);
  const learnedToday = progress.filter(p => p.learnedAt.slice(0, 10) === todayKey()).length;
  const sessionWords = session.map(id => words.find(w => String(w.id) === id)).filter((w): w is Word => Boolean(w));
  const current = sessionWords[index];
  const currentSessionLearned = session.filter(id => learnedIds.has(id)).length;
  const filteredWords = words.filter(w => {
    const match = `${w.word} ${w.meaning} ${w.v2} ${w.v3}`.toLowerCase().includes(query.toLowerCase());
    return match && (filter === 'all' || (filter === 'learned' ? learnedIds.has(String(w.id)) : !learnedIds.has(String(w.id))));
  });
  const startLearn = useCallback(() => {
    const fresh = words.filter(w => !learnedIds.has(String(w.id))).slice(0, Math.max(target, 1));
    if (!fresh.length) { setToast('Semua kosakata sudah ditandai hafal!'); setView('vocabulary'); return; }
    setSession(fresh.map(w => String(w.id)));
    setIndex(0);
    setView('learn');
    logActivity('start_learning', {word_count:fresh.length});
  }, [words, learnedIds, target, user]);
  const markLearned = async (word: Word) => {
    const id = String(word.id);
    if (!user || !supabase) { setToast('Silakan login kembali.'); return; }
    if (learnedIds.has(id)) {
      const {error} = await supabase.from('user_progress').delete().eq('user_id',user.id).eq('word_id',Number(id));
      if (error) { setToast('Gagal memperbarui progres.'); return; }
      setProgress(prev => prev.filter(p => String(p.wordId) !== id));
      logActivity('unlearn_word', {word_id:Number(id),word:word.word});
      setToast('Status hafal dibatalkan');
    } else {
      const learnedAt = new Date().toISOString();
      const {error} = await supabase.from('user_progress').upsert({user_id:user.id,word_id:Number(id),learned_at:learnedAt},{onConflict:'user_id,word_id'});
      if (error) { setToast('Gagal menyimpan progres ke cloud.'); return; }
      setProgress(prev => [...prev.filter(p=>String(p.wordId)!==id), { wordId: id, learnedAt }]);
      logActivity('learn_word', {word_id:Number(id),word:word.word});
      setToast(`“${word.word}” ditandai sudah hafal`);
    }
  };
  const goNext = () => { if (index < sessionWords.length - 1) setIndex(index + 1); else setShowFinish(true); };
  const goPrevious = () => { if (index > 0) setIndex(index - 1); else setView('vocabulary'); };
  const finishSession = () => { setShowFinish(false); setView('home'); logActivity('finish_learning',{word_count:sessionWords.length,learned_count:session.filter(id=>learnedIds.has(id)).length}); setToast('Sesi belajar selesai. Nice work!'); };
  const pronounce = (word: string) => { if ('speechSynthesis' in window) { window.speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(word); u.lang = 'en-US'; window.speechSynthesis.speak(u); } };
  const resetProgress = async () => { if (window.confirm('Hapus semua riwayat hafalan akun ini? Tindakan ini tidak bisa dibatalkan.')) { if (user && supabase) { const {error}=await supabase.from('user_progress').delete().eq('user_id',user.id); if(error){setToast('Gagal menghapus riwayat.');return;} } setProgress([]); logActivity('clear_progress'); setToast('Riwayat berhasil dihapus'); } };

  if (!authReady) return <div className="auth-loading">Memuat VocabRise…</div>;
  if (!user) return <AuthScreen />;
  return <main className={theme === 'dark' ? 'app dark' : 'app'}>
    {mobileMenuOpen && <button className="mobile-sidebar-backdrop" aria-label="Tutup menu" onClick={() => setMobileMenuOpen(false)} />}
    <aside className={mobileMenuOpen ? 'sidebar mobile-sidebar-open' : 'sidebar'}>
      <div className="brand"><div className="brand-mark"><GraduationCap size={23}/></div><div><b>VocabRise</b><span>Grow your English</span></div></div>
      <div className="side-label">MENU UTAMA</div>
      <nav>
        <NavItem icon={<Home size={18}/>} label="Dashboard" active={view==='home'} onClick={()=>navigate('home')}/>
        <NavItem icon={<BookOpen size={18}/>} label="Mulai Belajar" active={view==='learn'} onClick={()=>{startLearn();setMobileMenuOpen(false);}}/>
        <NavItem icon={<Trophy size={18}/>} label="My Vocabulary" active={view==='vocabulary'} onClick={()=>navigate('vocabulary')}/>
        <NavItem icon={<History size={18}/>} label="Riwayat Hafalan" active={view==='history'} onClick={()=>navigate('history')}/>
        {role==='admin' && <NavItem icon={<ShieldCheck size={18}/>} label="Admin · Aktivitas" active={view==='admin'} onClick={()=>navigate('admin')}/>}
      </nav>
      <div className="sidebar-spacer"/>
      <div className="daily-mini"><div className="daily-mini-icon"><Target size={18}/></div><b>Target harian</b><p>{learnedToday} dari {target} kata</p><div className="progress-track"><span style={{width:`${Math.min(100, learnedToday/Math.max(target,1)*100)}%`}}/></div><button onClick={()=>navigate('settings')}>Atur target <ChevronRight size={14}/></button></div>
      <NavItem icon={<Settings2 size={18}/>} label="Pengaturan" active={view==='settings'} onClick={()=>navigate('settings')}/>
      <div className="sidebar-foot"><span className="online-dot"/> Progres tersimpan di cloud</div><div className="account-strip"><div className="avatar">{(username||'U').slice(0,1).toUpperCase()}</div><div className="account-label"><b>{username}</b><span>{role==='admin'?'Administrator':'Member'}</span></div><button className="logout-button" title="Logout" onClick={signOut}><LogOut size={16}/></button></div>
    </aside>
    <section className="main-area">
      <header className="topbar"><div className="topbar-left"><button className="mobile-menu-button" aria-label={mobileMenuOpen?"Tutup menu":"Buka menu"} onClick={()=>setMobileMenuOpen(!mobileMenuOpen)}>{mobileMenuOpen?<X size={20}/>:<Menu size={20}/>}</button><div className="mobile-brand"><div className="brand-mark"><GraduationCap size={20}/></div><b>VocabRise</b></div></div><div className="breadcrumbs">Workspace <ChevronRight size={14}/> <strong>{({home:'Dashboard',learn:'Belajar Kosakata',vocabulary:'My Vocabulary',history:'Riwayat Hafalan',settings:'Pengaturan',admin:'Admin · Aktivitas User'} as Record<View,string>)[view]}</strong></div><div className="top-actions"><span className="date-chip"><CalendarDays size={15}/>{prettyDate(clock)}</span><button className="icon-button" aria-label="Ganti tema" onClick={()=>setTheme(theme==='light'?'dark':'light')}>{theme==='light'?<Moon size={18}/>:<Sun size={18}/>}</button><button className="icon-button" aria-label="Logout" title="Logout" onClick={signOut}><LogOut size={17}/></button><div className="avatar">{(username||'U').slice(0,1).toUpperCase()}</div></div></header>
      <div className="content">
        {view==='home' && <>
          <div className="welcome-row"><div><div className="eyebrow">YOUR PERSONAL ENGLISH SPACE</div><h1>Keep growing, <span>one word at a time.</span></h1><p className="subheading">Setiap kata baru adalah langkah kecil menuju bahasa Inggris yang lebih baik.</p></div><div className="today-card"><div className="today-icon"><Clock3 size={18}/></div><div><small>HARI INI</small><b>{prettyTime(clock)}</b><span>{prettyDate(clock).split(',').slice(0,2).join(',')}</span></div></div></div>
          <div className="stats-grid"><StatCard icon={<BookOpen size={19}/>} tint="green" label="Hafal hari ini" value={String(learnedToday)} suffix="kata" foot={`${Math.max(0,target-learnedToday)} kata lagi untuk target`} progress={Math.min(100,learnedToday/Math.max(target,1)*100)}/><StatCard icon={<Trophy size={19}/>} tint="purple" label="Total kosakata hafal" value={String(progress.length)} suffix="kata" foot={`Dari ${words.length.toLocaleString('id-ID')} kosakata tersedia`}/><StatCard icon={<Target size={19}/>} tint="orange" label="Target harian" value={String(target)} suffix="kata" foot="Target bisa diubah kapan saja"/><StatCard icon={<Flame size={19}/>} tint="blue" label="Progress koleksi" value={`${words.length ? Math.round(progress.length/words.length*100) : 0}%`} suffix="" foot="Dari seluruh kosakata" progress={words.length?progress.length/words.length*100:0}/></div>
          <div className="home-grid"><section className="panel learn-hero"><div className="hero-copy"><div className="hero-pill"><span/> YOUR DAILY PRACTICE</div><h2>Ready to learn<br/>something <em>new?</em></h2><p>Luangkan beberapa menit hari ini. Bangun kebiasaan kecil yang membawa perubahan besar.</p><button className="primary-button" onClick={startLearn}>Mulai belajar <ChevronRight size={17}/></button><div className="hero-meta"><span><CheckCircle2 size={15}/> Target {target} kata/hari</span><span><Clock3 size={15}/> 5–10 menit</span></div></div><div className="hero-art"><div className="art-circle circle-one"/><div className="art-circle circle-two"/><div className="book-illustration"><div className="book-page page-back"/><div className="book-page page-front"><div className="book-line short"/><div className="book-line"/><div className="book-line"/><div className="book-line small"/><div className="book-check"><Check size={18}/></div></div><div className="sparkle sparkle-a">✦</div><div className="sparkle sparkle-b">✳</div></div><div className="floating-tag tag-top"><span>✦</span> New words</div><div className="floating-tag tag-bottom"><CheckCircle2 size={16}/> Keep it up!</div></div></section>
          <section className="panel quick-panel"><div className="panel-heading"><div><h3>Quick access</h3><p>Lanjutkan perjalanan belajarmu</p></div><span className="heading-icon"><ChevronRight size={17}/></span></div><button className="quick-row" onClick={startLearn}><span className="quick-icon q-green"><BookOpen size={19}/></span><span><b>Belajar kata baru</b><small>Mulai sesi kosakata hari ini</small></span><ChevronRight size={17}/></button><button className="quick-row" onClick={()=>navigate('vocabulary')}><span className="quick-icon q-purple"><Trophy size={19}/></span><span><b>Koleksi kosakata</b><small>Lihat semua kata yang tersedia</small></span><ChevronRight size={17}/></button><button className="quick-row" onClick={()=>navigate('history')}><span className="quick-icon q-orange"><History size={19}/></span><span><b>Riwayat hafalan</b><small>Cek kata dan tanggal hafal</small></span><ChevronRight size={17}/></button><div className="quote-box"><span>“</span><p>One word a day, a world of possibilities.</p><small>— Your future self</small></div></section></div>
          <div className="bottom-row"><section className="panel week-panel"><div className="panel-heading"><div><h3>Learning snapshot</h3><p>Ringkasan aktivitas hari ini</p></div><span className="tiny-badge">TODAY</span></div><div className="snapshot"><div className="snapshot-ring" style={{'--progress':`${Math.min(100,learnedToday/Math.max(target,1)*100)}%`} as React.CSSProperties}><div><b>{Math.round(Math.min(100,learnedToday/Math.max(target,1)*100))}%</b><small>complete</small></div></div><div className="snapshot-info"><b>{learnedToday>=target?'Target tercapai!':'Sedikit lagi, kamu pasti bisa!'}</b><p>Kamu sudah menghafal <strong>{learnedToday}</strong> dari target <strong>{target}</strong> kata hari ini.</p><button className="text-button" onClick={()=>navigate('settings')}>Sesuaikan target <ChevronRight size={15}/></button></div></div></section><section className="panel tip-panel"><div className="tip-label"><span>✦</span> VOCABULARY TIP</div><h3>Learn it. Use it. Remember it.</h3><p>Coba buat satu kalimat sederhana menggunakan kata yang baru kamu pelajari. Menghubungkan kata dengan konteks bisa membantu mengingatnya.</p><div className="tip-example"><b>Example</b><span>“I <em>learn</em> something new every day.”</span><small>Saya mempelajari sesuatu yang baru setiap hari.</small></div></section></div>
        </>}
        {view==='learn' && <section className="learn-view"><div className="view-heading"><div><div className="eyebrow">DAILY PRACTICE</div><h1>Belajar kosakata</h1><p>Pelajari kata satu per satu, tandai jika sudah hafal.</p></div><button className="secondary-button" onClick={()=>setShowFinish(true)}><X size={16}/> Akhiri sesi</button></div>{sessionWords.length===0 || !current ? <div className="empty-state panel"><div className="empty-icon"><BookOpen size={28}/></div><h2>Siap untuk sesi baru?</h2><p>Mulai sesi untuk mendapatkan kosakata baru sesuai target harianmu.</p><button className="primary-button" onClick={startLearn}>Mulai belajar <ChevronRight size={17}/></button></div> : <><div className="session-progress"><div><span>SESSION PROGRESS</span><b>{Math.min(index+1,sessionWords.length)} <small>/ {sessionWords.length} kata</small></b></div><div className="progress-track"><span style={{width:`${(index+1)/sessionWords.length*100}%`}}/></div><div className="session-meta"><span><CheckCircle2 size={14}/>{currentSessionLearned} kata sudah hafal</span><span>Target {target} kata</span></div></div><article className="word-card"><div className="word-card-top"><span className="word-number">WORD {String(index+1).padStart(2,'0')}</span><span className={`level-tag ${current.level.toLowerCase()}`}>{current.level}</span></div><div className="word-main"><div className="part-tag">{current.part_of_speech}</div><h2>{current.word}</h2><button className="pronounce-button" onClick={()=>pronounce(current.word)}><Volume2 size={17}/> Dengarkan pengucapan</button></div><div className="verb-grid"><VerbCell label="V1 · BASE FORM" value={current.word} onPlay={pronounce}/><VerbCell label="V2 · PAST" value={current.v2 || '—'} onPlay={pronounce}/><VerbCell label="V3 · PAST PARTICIPLE" value={current.v3 || '—'} onPlay={pronounce}/></div><div className="meaning-box"><span>ARTI BAHASA INDONESIA</span><h3>{current.meaning}</h3></div><div className="example-box"><div><span>EXAMPLE SENTENCE</span><button className="small-sound" onClick={()=>pronounce(current.example)} aria-label="Dengarkan contoh"><Volume2 size={15}/></button></div><p>{current.example}</p><small>{current.example_id}</small></div><button className={learnedIds.has(String(current.id))?'learned-toggle is-learned':'learned-toggle'} onClick={()=>markLearned(current)}><span className="check-square">{learnedIds.has(String(current.id))&&<Check size={17}/>}</span><span><b>{learnedIds.has(String(current.id))?'Sudah ditandai hafal':'Saya sudah hafal kata ini'}</b><small>{learnedIds.has(String(current.id))?'Klik lagi jika ingin membatalkan status':'Tandai kata ini sebagai kosakata yang kamu kuasai'}</small></span></button></article><div className="learn-navigation"><button className="secondary-button" onClick={goPrevious} disabled={index===0}><ChevronLeft size={17}/> Previous</button><button className="primary-button" onClick={goNext}>{index===sessionWords.length-1?'Finish session':'Next word'} <ChevronRight size={17}/></button></div><button className="review-link" onClick={()=>navigate('vocabulary')}><ArrowLeft size={14}/> Lihat kata yang sudah dipelajari</button></>}</section>}
        {view==='vocabulary' && <section><div className="view-heading"><div><div className="eyebrow">YOUR WORD COLLECTION</div><h1>My Vocabulary</h1><p>Semua kosakata dalam perjalanan belajarmu.</p></div><div className="collection-count"><b>{progress.length}</b><span>kata dihafal</span></div></div><div className="panel table-panel"><div className="table-toolbar"><div className="search-field"><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Cari kata atau arti..."/></div><div className="filter-tabs"><button className={filter==='all'?'selected':''} onClick={()=>setFilter('all')}>Semua <span>{words.length}</span></button><button className={filter==='learned'?'selected':''} onClick={()=>setFilter('learned')}>Sudah hafal <span>{progress.length}</span></button><button className={filter==='unlearned'?'selected':''} onClick={()=>setFilter('unlearned')}>Belum hafal <span>{words.length-progress.length}</span></button></div></div><div className="table-wrap"><table><thead><tr><th>KOSAKATA</th><th>V2 / V3</th><th>ARTI</th><th>STATUS</th><th>TANGGAL HAFAL</th></tr></thead><tbody>{filteredWords.slice(0,250).map(w=>{const p=progress.find(p=>String(p.wordId)===String(w.id));return <tr key={w.id}><td><b className="table-word">{w.word}</b><small>{w.part_of_speech}</small></td><td><span className="verb-pair">{w.v2} / {w.v3}</span></td><td>{w.meaning}</td><td>{p?<span className="status learned-status"><Check size={12}/> Hafal</span>:<span className="status pending-status">Belum hafal</span>}</td><td>{p?new Date(p.learnedAt).toLocaleDateString('id-ID',{day:'2-digit',month:'short',year:'numeric'}):'—'}</td></tr>})}</tbody></table>{filteredWords.length===0&&<div className="table-empty">Tidak ada kosakata yang cocok.</div>}{filteredWords.length>250&&<p className="table-note">Menampilkan 250 hasil pertama. Gunakan pencarian untuk menemukan kata lainnya.</p>}</div></div></section>}
        {view==='history' && <section><div className="view-heading"><div><div className="eyebrow">YOUR ACHIEVEMENTS</div><h1>Riwayat hafalan</h1><p>Setiap kata yang kamu tandai hafal, tersimpan beserta waktunya.</p></div><div className="collection-count"><b>{progress.length}</b><span>total catatan</span></div></div><div className="panel history-panel">{progress.length===0?<div className="empty-state"><div className="empty-icon"><History size={28}/></div><h2>Belum ada riwayat</h2><p>Setelah menandai kosakata sebagai hafal, catatannya akan muncul di sini.</p><button className="primary-button" onClick={startLearn}>Mulai belajar <ChevronRight size={17}/></button></div>:<><div className="history-summary"><div className="quick-icon q-green"><CheckCircle2 size={21}/></div><div><b>Progress kamu terus bertambah!</b><p>{progress.length} kosakata sudah ditandai hafal di perangkat ini.</p></div></div><div className="history-list">{[...progress].sort((a,b)=>b.learnedAt.localeCompare(a.learnedAt)).map(p=>{const w=words.find(w=>String(w.id)===String(p.wordId));if(!w)return null;return <div className="history-item" key={`${p.wordId}-${p.learnedAt}`}><div className="history-check"><Check size={16}/></div><div className="history-word"><b>{w.word}</b><span>{w.v2} · {w.v3} — {w.meaning}</span></div><div className="history-date"><b>{new Date(p.learnedAt).toLocaleDateString('id-ID',{day:'2-digit',month:'short',year:'numeric'})}</b><span>{new Date(p.learnedAt).toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'})}</span></div></div>})}</div></>}</div></section>}
        {view==='admin' && role==='admin' && <section>
          <div className="view-heading"><div><div className="eyebrow">ADMIN CONTROL CENTER</div><h1>Aktivitas pengguna</h1><p>Pantau akun, progres hafalan, dan aktivitas terbaru seluruh pengguna VocabRise.</p></div><button className="secondary-button" onClick={()=>navigate('home')}><ArrowLeft size={16}/> Dashboard</button></div>
          {adminLoading ? <div className="panel admin-empty">Memuat data pengguna…</div> : <>
            <div className="stats-grid admin-stats">
              <StatCard icon={<Users size={18}/>} tint="green" label="TOTAL USER" value={String(adminProfiles.length)} suffix="akun" foot="Akun yang terdaftar"/>
              <StatCard icon={<Activity size={18}/>} tint="purple" label="AKTIVITAS TERCATAT" value={String(adminActivity.length)} suffix="log" foot="Maksimal 150 aktivitas terbaru"/>
              <StatCard icon={<CheckCircle2 size={18}/>} tint="orange" label="TOTAL KATA DIHAFAL" value={String(adminProgress.length)} suffix="catatan" foot="Hingga 5.000 catatan terbaru"/>
              <StatCard icon={<ShieldCheck size={18}/>} tint="blue" label="ADMIN" value={String(adminProfiles.filter(p=>p.role==='admin').length)} suffix="akun" foot="Akun dengan akses administrator"/>
            </div>
            <div className="panel admin-table-panel"><div className="panel-heading"><div><h3>Daftar pengguna</h3><p>Ringkasan progres masing-masing akun.</p></div></div><div className="table-wrap"><table><thead><tr><th>USERNAME</th><th>ROLE</th><th>TERDAFTAR</th><th>KATA DIHAFAL</th><th>AKTIVITAS TERAKHIR</th></tr></thead><tbody>{adminProfiles.map(p=>{const learned=adminProgress.filter(x=>x.user_id===p.id);const latest=adminActivity.find(a=>a.user_id===p.id);return <tr key={p.id}><td><b className="table-word">{p.username}</b></td><td><span className="status learned-status">{p.role}</span></td><td>{new Date(p.created_at).toLocaleDateString('id-ID')}</td><td>{learned.length}</td><td>{latest?new Date(latest.created_at).toLocaleString('id-ID'):'Belum ada'}</td></tr>})}</tbody></table>{!adminProfiles.length&&<div className="table-empty">Belum ada akun terdaftar.</div>}</div></div>
            <div className="panel admin-table-panel"><div className="panel-heading"><div><h3>Log aktivitas terbaru</h3><p>Login, memulai sesi, menandai hafal, dan perubahan progres.</p></div><button className="secondary-button" onClick={()=>setAdminRefresh(n=>n+1)}>Refresh</button></div><div className="table-wrap"><table><thead><tr><th>WAKTU</th><th>USERNAME</th><th>AKTIVITAS</th><th>DETAIL</th></tr></thead><tbody>{adminActivity.map(a=>{const person=adminProfiles.find(p=>p.id===a.user_id);const detail=Object.entries(a.details||{}).map(([k,v])=>`${k}: ${String(v)}`).join(' · ');return <tr key={a.id}><td>{new Date(a.created_at).toLocaleString('id-ID')}</td><td><b className="table-word">{person?.username||'Unknown user'}</b></td><td>{a.event_type.replaceAll('_',' ')}</td><td>{detail||'—'}</td></tr>})}</tbody></table>{!adminActivity.length&&<div className="table-empty">Belum ada aktivitas yang tercatat.</div>}</div></div>
          </>}
        </section>}
        {view==='settings' && <section><div className="view-heading"><div><div className="eyebrow">MAKE IT YOURS</div><h1>Pengaturan</h1><p>Atur pengalaman belajar sesuai kebiasaanmu.</p></div></div><div className="settings-grid"><div className="panel settings-card"><div className="settings-heading"><span className="quick-icon q-green"><Target size={20}/></span><div><h3>Target harian</h3><p>Berapa kata baru yang ingin kamu pelajari setiap hari?</p></div></div><div className="target-options">{[10,15,20,25,30].map(n=><button key={n} className={target===n?'target-option active':'target-option'} onClick={()=>setTarget(n)}><b>{n}</b><span>kata / hari</span></button>)}</div><div className="custom-target"><label htmlFor="target">Atur target sendiri</label><div><input id="target" type="number" min="1" max="100" value={target} onChange={e=>setTarget(Math.min(100,Math.max(1,Number(e.target.value)||1)))}/><span>kata per hari</span></div></div><div className="settings-note"><CheckCircle2 size={16}/> Target baru langsung diterapkan pada sesi belajar berikutnya.</div></div><div className="panel settings-card"><div className="settings-heading"><span className="quick-icon q-purple"><Moon size={20}/></span><div><h3>Tampilan aplikasi</h3><p>Pilih suasana yang nyaman untuk belajar.</p></div></div><div className="theme-options"><button className={theme==='light'?'theme-option active':'theme-option'} onClick={()=>setTheme('light')}><Sun size={21}/><b>Light mode</b><span>Tampilan terang</span>{theme==='light'&&<CheckCircle2 size={17}/>}</button><button className={theme==='dark'?'theme-option active':'theme-option'} onClick={()=>setTheme('dark')}><Moon size={21}/><b>Dark mode</b><span>Tampilan gelap</span>{theme==='dark'&&<CheckCircle2 size={17}/>}</button></div></div><div className="panel settings-card data-card"><div className="settings-heading"><span className="quick-icon q-orange"><History size={20}/></span><div><h3>Data belajar</h3><p>Progres disimpan ke akun Supabase kamu dan tersinkron antarperangkat.</p></div></div><div className="data-stats"><div><span>Total kosakata</span><b>{words.length}</b></div><div><span>Sudah hafal</span><b>{progress.length}</b></div><div><span>Belum hafal</span><b>{Math.max(0,words.length-progress.length)}</b></div></div><button className="danger-button" onClick={resetProgress}><RotateCcw size={16}/> Hapus seluruh riwayat hafalan</button><p className="privacy-note">Progres tersimpan di cloud pada akunmu. Logout setelah selesai jika memakai perangkat bersama.</p></div></div></section>}
      </div>
      <footer className="footer"><span>© 2026 VocabRise | Igoo</span><span>Made for your daily progress <span className="footer-heart">♥</span></span></footer>
    </section>
    {toast&&<div className="toast"><CheckCircle2 size={17}/>{toast}</div>}
    {showFinish&&<div className="modal-backdrop" onClick={()=>setShowFinish(false)}><div className="finish-modal" onClick={e=>e.stopPropagation()}><button className="modal-close" onClick={()=>setShowFinish(false)}><X size={18}/></button><div className="finish-icon"><Trophy size={28}/></div><div className="eyebrow">SESSION SUMMARY</div><h2>Great work today!</h2><p>Kamu telah menyelesaikan bagian sesi ini. Konsistensi lebih penting daripada kecepatan.</p><div className="finish-stats"><div><b>{sessionWords.length}</b><span>Kata dipelajari</span></div><div><b>{session.filter(id=>learnedIds.has(id)).length}</b><span>Ditandai hafal</span></div></div><div className="modal-actions"><button className="secondary-button" onClick={()=>{setShowFinish(false);setView('vocabulary')}}>Review words</button><button className="primary-button" onClick={finishSession}>Finish <Check size={16}/></button></div></div></div>}
    <div className="app-watermark" aria-hidden="true">© 2026 VocabRise | Igoo</div>
  </main>;
}
function NavItem({icon,label,active,onClick}:{icon:React.ReactNode;label:string;active:boolean;onClick:()=>void}){return <button className={active?'nav-item active':'nav-item'} onClick={onClick}>{icon}<span>{label}</span>{active&&<span className="nav-active-dot"/>}</button>}
function StatCard({icon,tint,label,value,suffix,foot,progress}:{icon:React.ReactNode;tint:string;label:string;value:string;suffix:string;foot:string;progress?:number}){return <div className="panel stat-card"><div className="stat-top"><span className={`stat-icon ${tint}`}>{icon}</span><span className="stat-dots">•••</span></div><span className="stat-label">{label}</span><div className="stat-value">{value} <small>{suffix}</small></div>{progress!==undefined&&<div className="progress-track stat-progress"><span style={{width:`${progress}%`}}/></div>}<div className="stat-foot">{foot}</div></div>}
function VerbCell({label,value,onPlay}:{label:string;value:string;onPlay:(word:string)=>void}){return <div className="verb-cell"><span>{label}</span><div className="verb-cell-value"><b>{value}</b>{value && value !== '—' && <button className="verb-sound" type="button" onClick={()=>onPlay(value)} aria-label={`Dengarkan ${label}: ${value}`} title={`Dengarkan ${value}`}><Volume2 size={15}/></button>}</div></div>}
