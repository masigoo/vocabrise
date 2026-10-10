'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { BookOpen, CalendarDays, Check, ChevronLeft, ChevronRight, Clock3, Flame, GraduationCap, History, Home, Moon, Search, Settings2, Sun, Target, Trophy, Volume2, X, ArrowLeft, RotateCcw, CheckCircle2 } from 'lucide-react';
import { loadWords } from '@/lib/words';
import type { Progress, Word } from '@/lib/types';

type View = 'home' | 'learn' | 'vocabulary' | 'history' | 'settings';
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
  const [index, setIndex] = useState(0);
  const [session, setSession] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all'|'learned'|'unlearned'>('all');
  const [clock, setClock] = useState(new Date());
  const [loaded, setLoaded] = useState(false);
  const [toast, setToast] = useState('');
  const [showFinish, setShowFinish] = useState(false);

  useEffect(() => {
    loadWords().then(setWords).catch(() => setWords([]));
    try {
      setProgress(JSON.parse(localStorage.getItem(PROGRESS_KEY) || '[]'));
      setTarget(Number(localStorage.getItem(TARGET_KEY) || 15));
      setTheme((localStorage.getItem(THEME_KEY) as 'light'|'dark') || 'light');
      setSession(JSON.parse(sessionStorage.getItem(SESSION_KEY) || '[]'));
    } catch {}
    setLoaded(true);
    const timer = window.setInterval(() => setClock(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => { if (loaded) localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress)); }, [progress, loaded]);
  useEffect(() => { if (loaded) localStorage.setItem(TARGET_KEY, String(target)); }, [target, loaded]);
  useEffect(() => { if (loaded) localStorage.setItem(THEME_KEY, theme); }, [theme, loaded]);
  useEffect(() => { if (loaded) sessionStorage.setItem(SESSION_KEY, JSON.stringify(session)); }, [session, loaded]);
  useEffect(() => { if (!toast) return; const t = window.setTimeout(() => setToast(''), 2400); return () => window.clearTimeout(t); }, [toast]);

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
  }, [words, learnedIds, target]);
  const markLearned = (word: Word) => {
    const id = String(word.id);
    if (learnedIds.has(id)) {
      setProgress(prev => prev.filter(p => String(p.wordId) !== id));
      setToast('Status hafal dibatalkan');
    } else {
      setProgress(prev => [...prev, { wordId: id, learnedAt: new Date().toISOString() }]);
      setToast(`“${word.word}” ditandai sudah hafal`);
    }
  };
  const goNext = () => { if (index < sessionWords.length - 1) setIndex(index + 1); else setShowFinish(true); };
  const goPrevious = () => { if (index > 0) setIndex(index - 1); else setView('vocabulary'); };
  const finishSession = () => { setShowFinish(false); setView('home'); setToast('Sesi belajar selesai. Nice work!'); };
  const pronounce = (word: string) => { if ('speechSynthesis' in window) { window.speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(word); u.lang = 'en-US'; window.speechSynthesis.speak(u); } };
  const resetProgress = () => { if (window.confirm('Hapus semua riwayat hafalan di perangkat ini? Tindakan ini tidak bisa dibatalkan.')) { setProgress([]); setToast('Riwayat berhasil dihapus'); } };

  return <main className={theme === 'dark' ? 'app dark' : 'app'}>
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark"><GraduationCap size={23}/></div><div><b>VocabRise</b><span>Grow your English</span></div></div>
      <div className="side-label">MENU UTAMA</div>
      <nav>
        <NavItem icon={<Home size={18}/>} label="Dashboard" active={view==='home'} onClick={()=>setView('home')}/>
        <NavItem icon={<BookOpen size={18}/>} label="Mulai Belajar" active={view==='learn'} onClick={startLearn}/>
        <NavItem icon={<Trophy size={18}/>} label="My Vocabulary" active={view==='vocabulary'} onClick={()=>setView('vocabulary')}/>
        <NavItem icon={<History size={18}/>} label="Riwayat Hafalan" active={view==='history'} onClick={()=>setView('history')}/>
      </nav>
      <div className="sidebar-spacer"/>
      <div className="daily-mini"><div className="daily-mini-icon"><Target size={18}/></div><b>Target harian</b><p>{learnedToday} dari {target} kata</p><div className="progress-track"><span style={{width:`${Math.min(100, learnedToday/Math.max(target,1)*100)}%`}}/></div><button onClick={()=>setView('settings')}>Atur target <ChevronRight size={14}/></button></div>
      <NavItem icon={<Settings2 size={18}/>} label="Pengaturan" active={view==='settings'} onClick={()=>setView('settings')}/>
      <div className="sidebar-foot"><span className="online-dot"/> Data tersimpan di perangkat ini</div>
    </aside>
    <section className="main-area">
      <header className="topbar"><div className="mobile-brand"><div className="brand-mark"><GraduationCap size={20}/></div><b>VocabRise</b></div><div className="breadcrumbs">Workspace <ChevronRight size={14}/> <strong>{({home:'Dashboard',learn:'Belajar Kosakata',vocabulary:'My Vocabulary',history:'Riwayat Hafalan',settings:'Pengaturan'} as Record<View,string>)[view]}</strong></div><div className="top-actions"><span className="date-chip"><CalendarDays size={15}/>{prettyDate(clock)}</span><button className="icon-button" aria-label="Ganti tema" onClick={()=>setTheme(theme==='light'?'dark':'light')}>{theme==='light'?<Moon size={18}/>:<Sun size={18}/>}</button><div className="avatar">V</div></div></header>
      <div className="content">
        {view==='home' && <>
          <div className="welcome-row"><div><div className="eyebrow">YOUR PERSONAL ENGLISH SPACE</div><h1>Keep growing, <span>one word at a time.</span></h1><p className="subheading">Setiap kata baru adalah langkah kecil menuju bahasa Inggris yang lebih baik.</p></div><div className="today-card"><div className="today-icon"><Clock3 size={18}/></div><div><small>HARI INI</small><b>{prettyTime(clock)}</b><span>{prettyDate(clock).split(',').slice(0,2).join(',')}</span></div></div></div>
          <div className="stats-grid"><StatCard icon={<BookOpen size={19}/>} tint="green" label="Hafal hari ini" value={String(learnedToday)} suffix="kata" foot={`${Math.max(0,target-learnedToday)} kata lagi untuk target`} progress={Math.min(100,learnedToday/Math.max(target,1)*100)}/><StatCard icon={<Trophy size={19}/>} tint="purple" label="Total kosakata hafal" value={String(progress.length)} suffix="kata" foot={`Dari ${words.length.toLocaleString('id-ID')} kosakata tersedia`}/><StatCard icon={<Target size={19}/>} tint="orange" label="Target harian" value={String(target)} suffix="kata" foot="Target bisa diubah kapan saja"/><StatCard icon={<Flame size={19}/>} tint="blue" label="Progress koleksi" value={`${words.length ? Math.round(progress.length/words.length*100) : 0}%`} suffix="" foot="Dari seluruh kosakata" progress={words.length?progress.length/words.length*100:0}/></div>
          <div className="home-grid"><section className="panel learn-hero"><div className="hero-copy"><div className="hero-pill"><span/> YOUR DAILY PRACTICE</div><h2>Ready to learn<br/>something <em>new?</em></h2><p>Luangkan beberapa menit hari ini. Bangun kebiasaan kecil yang membawa perubahan besar.</p><button className="primary-button" onClick={startLearn}>Mulai belajar <ChevronRight size={17}/></button><div className="hero-meta"><span><CheckCircle2 size={15}/> Target {target} kata/hari</span><span><Clock3 size={15}/> 5–10 menit</span></div></div><div className="hero-art"><div className="art-circle circle-one"/><div className="art-circle circle-two"/><div className="book-illustration"><div className="book-page page-back"/><div className="book-page page-front"><div className="book-line short"/><div className="book-line"/><div className="book-line"/><div className="book-line small"/><div className="book-check"><Check size={18}/></div></div><div className="sparkle sparkle-a">✦</div><div className="sparkle sparkle-b">✳</div></div><div className="floating-tag tag-top"><span>✦</span> New words</div><div className="floating-tag tag-bottom"><CheckCircle2 size={16}/> Keep it up!</div></div></section>
          <section className="panel quick-panel"><div className="panel-heading"><div><h3>Quick access</h3><p>Lanjutkan perjalanan belajarmu</p></div><span className="heading-icon"><ChevronRight size={17}/></span></div><button className="quick-row" onClick={startLearn}><span className="quick-icon q-green"><BookOpen size={19}/></span><span><b>Belajar kata baru</b><small>Mulai sesi kosakata hari ini</small></span><ChevronRight size={17}/></button><button className="quick-row" onClick={()=>setView('vocabulary')}><span className="quick-icon q-purple"><Trophy size={19}/></span><span><b>Koleksi kosakata</b><small>Lihat semua kata yang tersedia</small></span><ChevronRight size={17}/></button><button className="quick-row" onClick={()=>setView('history')}><span className="quick-icon q-orange"><History size={19}/></span><span><b>Riwayat hafalan</b><small>Cek kata dan tanggal hafal</small></span><ChevronRight size={17}/></button><div className="quote-box"><span>“</span><p>One word a day, a world of possibilities.</p><small>— Your future self</small></div></section></div>
          <div className="bottom-row"><section className="panel week-panel"><div className="panel-heading"><div><h3>Learning snapshot</h3><p>Ringkasan aktivitas hari ini</p></div><span className="tiny-badge">TODAY</span></div><div className="snapshot"><div className="snapshot-ring" style={{'--progress':`${Math.min(100,learnedToday/Math.max(target,1)*100)}%`} as React.CSSProperties}><div><b>{Math.round(Math.min(100,learnedToday/Math.max(target,1)*100))}%</b><small>complete</small></div></div><div className="snapshot-info"><b>{learnedToday>=target?'Target tercapai!':'Sedikit lagi, kamu pasti bisa!'}</b><p>Kamu sudah menghafal <strong>{learnedToday}</strong> dari target <strong>{target}</strong> kata hari ini.</p><button className="text-button" onClick={()=>setView('settings')}>Sesuaikan target <ChevronRight size={15}/></button></div></div></section><section className="panel tip-panel"><div className="tip-label"><span>✦</span> VOCABULARY TIP</div><h3>Learn it. Use it. Remember it.</h3><p>Coba buat satu kalimat sederhana menggunakan kata yang baru kamu pelajari. Menghubungkan kata dengan konteks bisa membantu mengingatnya.</p><div className="tip-example"><b>Example</b><span>“I <em>learn</em> something new every day.”</span><small>Saya mempelajari sesuatu yang baru setiap hari.</small></div></section></div>
        </>}
        {view==='learn' && <section className="learn-view"><div className="view-heading"><div><div className="eyebrow">DAILY PRACTICE</div><h1>Belajar kosakata</h1><p>Pelajari kata satu per satu, tandai jika sudah hafal.</p></div><button className="secondary-button" onClick={()=>setShowFinish(true)}><X size={16}/> Akhiri sesi</button></div>{sessionWords.length===0 || !current ? <div className="empty-state panel"><div className="empty-icon"><BookOpen size={28}/></div><h2>Siap untuk sesi baru?</h2><p>Mulai sesi untuk mendapatkan kosakata baru sesuai target harianmu.</p><button className="primary-button" onClick={startLearn}>Mulai belajar <ChevronRight size={17}/></button></div> : <><div className="session-progress"><div><span>SESSION PROGRESS</span><b>{Math.min(index+1,sessionWords.length)} <small>/ {sessionWords.length} kata</small></b></div><div className="progress-track"><span style={{width:`${(index+1)/sessionWords.length*100}%`}}/></div><div className="session-meta"><span><CheckCircle2 size={14}/>{currentSessionLearned} kata sudah hafal</span><span>Target {target} kata</span></div></div><article className="word-card"><div className="word-card-top"><span className="word-number">WORD {String(index+1).padStart(2,'0')}</span><span className={`level-tag ${current.level.toLowerCase()}`}>{current.level}</span></div><div className="word-main"><div className="part-tag">{current.part_of_speech}</div><h2>{current.word}</h2><button className="pronounce-button" onClick={()=>pronounce(current.word)}><Volume2 size={17}/> Dengarkan pengucapan</button></div><div className="verb-grid"><VerbCell label="V1 · BASE FORM" value={current.word}/><VerbCell label="V2 · PAST" value={current.v2 || '—'}/><VerbCell label="V3 · PAST PARTICIPLE" value={current.v3 || '—'}/></div><div className="meaning-box"><span>ARTI BAHASA INDONESIA</span><h3>{current.meaning}</h3></div><div className="example-box"><div><span>EXAMPLE SENTENCE</span><button className="small-sound" onClick={()=>pronounce(current.example)} aria-label="Dengarkan contoh"><Volume2 size={15}/></button></div><p>{current.example}</p><small>{current.example_id}</small></div><button className={learnedIds.has(String(current.id))?'learned-toggle is-learned':'learned-toggle'} onClick={()=>markLearned(current)}><span className="check-square">{learnedIds.has(String(current.id))&&<Check size={17}/>}</span><span><b>{learnedIds.has(String(current.id))?'Sudah ditandai hafal':'Saya sudah hafal kata ini'}</b><small>{learnedIds.has(String(current.id))?'Klik lagi jika ingin membatalkan status':'Tandai kata ini sebagai kosakata yang kamu kuasai'}</small></span></button></article><div className="learn-navigation"><button className="secondary-button" onClick={goPrevious} disabled={index===0}><ChevronLeft size={17}/> Previous</button><button className="primary-button" onClick={goNext}>{index===sessionWords.length-1?'Finish session':'Next word'} <ChevronRight size={17}/></button></div><button className="review-link" onClick={()=>setView('vocabulary')}><ArrowLeft size={14}/> Lihat kata yang sudah dipelajari</button></>}</section>}
        {view==='vocabulary' && <section><div className="view-heading"><div><div className="eyebrow">YOUR WORD COLLECTION</div><h1>My Vocabulary</h1><p>Semua kosakata dalam perjalanan belajarmu.</p></div><div className="collection-count"><b>{progress.length}</b><span>kata dihafal</span></div></div><div className="panel table-panel"><div className="table-toolbar"><div className="search-field"><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Cari kata atau arti..."/></div><div className="filter-tabs"><button className={filter==='all'?'selected':''} onClick={()=>setFilter('all')}>Semua <span>{words.length}</span></button><button className={filter==='learned'?'selected':''} onClick={()=>setFilter('learned')}>Sudah hafal <span>{progress.length}</span></button><button className={filter==='unlearned'?'selected':''} onClick={()=>setFilter('unlearned')}>Belum hafal <span>{words.length-progress.length}</span></button></div></div><div className="table-wrap"><table><thead><tr><th>KOSAKATA</th><th>V2 / V3</th><th>ARTI</th><th>STATUS</th><th>TANGGAL HAFAL</th></tr></thead><tbody>{filteredWords.slice(0,250).map(w=>{const p=progress.find(p=>String(p.wordId)===String(w.id));return <tr key={w.id}><td><b className="table-word">{w.word}</b><small>{w.part_of_speech}</small></td><td><span className="verb-pair">{w.v2} / {w.v3}</span></td><td>{w.meaning}</td><td>{p?<span className="status learned-status"><Check size={12}/> Hafal</span>:<span className="status pending-status">Belum hafal</span>}</td><td>{p?new Date(p.learnedAt).toLocaleDateString('id-ID',{day:'2-digit',month:'short',year:'numeric'}):'—'}</td></tr>})}</tbody></table>{filteredWords.length===0&&<div className="table-empty">Tidak ada kosakata yang cocok.</div>}{filteredWords.length>250&&<p className="table-note">Menampilkan 250 hasil pertama. Gunakan pencarian untuk menemukan kata lainnya.</p>}</div></div></section>}
        {view==='history' && <section><div className="view-heading"><div><div className="eyebrow">YOUR ACHIEVEMENTS</div><h1>Riwayat hafalan</h1><p>Setiap kata yang kamu tandai hafal, tersimpan beserta waktunya.</p></div><div className="collection-count"><b>{progress.length}</b><span>total catatan</span></div></div><div className="panel history-panel">{progress.length===0?<div className="empty-state"><div className="empty-icon"><History size={28}/></div><h2>Belum ada riwayat</h2><p>Setelah menandai kosakata sebagai hafal, catatannya akan muncul di sini.</p><button className="primary-button" onClick={startLearn}>Mulai belajar <ChevronRight size={17}/></button></div>:<><div className="history-summary"><div className="quick-icon q-green"><CheckCircle2 size={21}/></div><div><b>Progress kamu terus bertambah!</b><p>{progress.length} kosakata sudah ditandai hafal di perangkat ini.</p></div></div><div className="history-list">{[...progress].sort((a,b)=>b.learnedAt.localeCompare(a.learnedAt)).map(p=>{const w=words.find(w=>String(w.id)===String(p.wordId));if(!w)return null;return <div className="history-item" key={`${p.wordId}-${p.learnedAt}`}><div className="history-check"><Check size={16}/></div><div className="history-word"><b>{w.word}</b><span>{w.v2} · {w.v3} — {w.meaning}</span></div><div className="history-date"><b>{new Date(p.learnedAt).toLocaleDateString('id-ID',{day:'2-digit',month:'short',year:'numeric'})}</b><span>{new Date(p.learnedAt).toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'})}</span></div></div>})}</div></>}</div></section>}
        {view==='settings' && <section><div className="view-heading"><div><div className="eyebrow">MAKE IT YOURS</div><h1>Pengaturan</h1><p>Atur pengalaman belajar sesuai kebiasaanmu.</p></div></div><div className="settings-grid"><div className="panel settings-card"><div className="settings-heading"><span className="quick-icon q-green"><Target size={20}/></span><div><h3>Target harian</h3><p>Berapa kata baru yang ingin kamu pelajari setiap hari?</p></div></div><div className="target-options">{[10,15,20,25,30].map(n=><button key={n} className={target===n?'target-option active':'target-option'} onClick={()=>setTarget(n)}><b>{n}</b><span>kata / hari</span></button>)}</div><div className="custom-target"><label htmlFor="target">Atur target sendiri</label><div><input id="target" type="number" min="1" max="100" value={target} onChange={e=>setTarget(Math.min(100,Math.max(1,Number(e.target.value)||1)))}/><span>kata per hari</span></div></div><div className="settings-note"><CheckCircle2 size={16}/> Target baru langsung diterapkan pada sesi belajar berikutnya.</div></div><div className="panel settings-card"><div className="settings-heading"><span className="quick-icon q-purple"><Moon size={20}/></span><div><h3>Tampilan aplikasi</h3><p>Pilih suasana yang nyaman untuk belajar.</p></div></div><div className="theme-options"><button className={theme==='light'?'theme-option active':'theme-option'} onClick={()=>setTheme('light')}><Sun size={21}/><b>Light mode</b><span>Tampilan terang</span>{theme==='light'&&<CheckCircle2 size={17}/>}</button><button className={theme==='dark'?'theme-option active':'theme-option'} onClick={()=>setTheme('dark')}><Moon size={21}/><b>Dark mode</b><span>Tampilan gelap</span>{theme==='dark'&&<CheckCircle2 size={17}/>}</button></div></div><div className="panel settings-card data-card"><div className="settings-heading"><span className="quick-icon q-orange"><History size={20}/></span><div><h3>Data belajar</h3><p>Data disimpan lokal di browser/perangkat ini.</p></div></div><div className="data-stats"><div><span>Total kosakata</span><b>{words.length}</b></div><div><span>Sudah hafal</span><b>{progress.length}</b></div><div><span>Belum hafal</span><b>{Math.max(0,words.length-progress.length)}</b></div></div><button className="danger-button" onClick={resetProgress}><RotateCcw size={16}/> Hapus seluruh riwayat hafalan</button><p className="privacy-note">Tanpa login, data tidak otomatis tersinkron antarperangkat dan dapat hilang jika data browser dihapus. Ekspor/sinkronisasi bisa ditambahkan kemudian.</p></div></div></section>}
      </div>
      <footer className="footer"><span>© 2026 VocabRise</span><span>Made for your daily progress <span className="footer-heart">♥</span></span></footer>
    </section>
    {toast&&<div className="toast"><CheckCircle2 size={17}/>{toast}</div>}
    {showFinish&&<div className="modal-backdrop" onClick={()=>setShowFinish(false)}><div className="finish-modal" onClick={e=>e.stopPropagation()}><button className="modal-close" onClick={()=>setShowFinish(false)}><X size={18}/></button><div className="finish-icon"><Trophy size={28}/></div><div className="eyebrow">SESSION SUMMARY</div><h2>Great work today!</h2><p>Kamu telah menyelesaikan bagian sesi ini. Konsistensi lebih penting daripada kecepatan.</p><div className="finish-stats"><div><b>{sessionWords.length}</b><span>Kata dipelajari</span></div><div><b>{session.filter(id=>learnedIds.has(id)).length}</b><span>Ditandai hafal</span></div></div><div className="modal-actions"><button className="secondary-button" onClick={()=>{setShowFinish(false);setView('vocabulary')}}>Review words</button><button className="primary-button" onClick={finishSession}>Finish <Check size={16}/></button></div></div></div>}
  </main>;
}
function NavItem({icon,label,active,onClick}:{icon:React.ReactNode;label:string;active:boolean;onClick:()=>void}){return <button className={active?'nav-item active':'nav-item'} onClick={onClick}>{icon}<span>{label}</span>{active&&<span className="nav-active-dot"/>}</button>}
function StatCard({icon,tint,label,value,suffix,foot,progress}:{icon:React.ReactNode;tint:string;label:string;value:string;suffix:string;foot:string;progress?:number}){return <div className="panel stat-card"><div className="stat-top"><span className={`stat-icon ${tint}`}>{icon}</span><span className="stat-dots">•••</span></div><span className="stat-label">{label}</span><div className="stat-value">{value} <small>{suffix}</small></div>{progress!==undefined&&<div className="progress-track stat-progress"><span style={{width:`${progress}%`}}/></div>}<div className="stat-foot">{foot}</div></div>}
function VerbCell({label,value}:{label:string;value:string}){return <div className="verb-cell"><span>{label}</span><b>{value}</b></div>}
