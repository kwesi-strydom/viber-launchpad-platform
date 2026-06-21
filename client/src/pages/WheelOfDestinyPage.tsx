import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ChevronLeft, Users, ServerOff, Scale, ShieldCheck, AlertTriangle } from 'lucide-react';
import { apiRequest, queryClient } from '@/lib/queryClient';
import type { User } from '@shared/schema';
import { CURRENT_EDITION } from '@shared/schema';

type SafeUser = Omit<User, 'password'>;

const CALAMITIES = [
  { id: 'founders_dispute', name: 'Founders Dispute', icon: <Users size={40} />, color: 'var(--ink-000)', bg: 'var(--ink-850)', border: 'var(--warn)',
    desc: 'A partner dispute has forced a hostile reshuffling. One member from each affected team must switch sides — immediately. A swap interface will appear in 15 seconds. Choose wisely.' },
  { id: 'copyright_strike', name: 'Copyright Strike', icon: <AlertTriangle size={40} />, color: 'var(--ink-000)', bg: 'var(--ink-850)', border: 'var(--accent)',
    desc: 'Your brand has been flagged. You must completely rename your project and redesign your branding from scratch. The lawyers are watching. Do not pass Go.' },
  { id: 'server_crash', name: 'Server Crash', icon: <ServerOff size={40} />, color: 'var(--ink-000)', bg: 'var(--ink-850)', border: 'var(--neg)',
    desc: 'Your hosting provider has gone dark. You must migrate your entire application to a different hosting provider and redeploy. The clock is still running.' },
  { id: 'lawsuit', name: 'Lawsuit', icon: <Scale size={40} />, color: 'var(--ink-000)', bg: 'var(--ink-850)', border: 'var(--warn)',
    desc: 'A computer has been seized as evidence. One team member must shut their laptop and may not use it for the remainder of the round. One machine. That is all.' },
  { id: 'safe_round', name: 'Safe', icon: <ShieldCheck size={40} />, color: 'var(--ink-000)', bg: 'var(--ink-850)', border: 'var(--pos)',
    desc: '' },
];

const SEG_COLORS = [
  'var(--ink-800)', 'var(--ink-700)'
];

// Bright colors so Founders Dispute teams stand out: pink, blue, green
const DISPUTE_COLORS = ['#ff3d9a', '#2d9bff', '#2bd576'];

type Phase = 'idle' | 'countdown' | 'spinning' | 'result';

const WheelOfDestinyPage = () => {
  const [phase, setPhase] = useState<Phase>('idle');
  const [countdown, setCountdown] = useState(10);
  const [countdownKey, setCountdownKey] = useState(0);
  const [spinNumber, setSpinNumber] = useState(0);
  // Current spin result
  const [currentSpinSelected, setCurrentSpinSelected] = useState<string[]>([]);
  const [currentSpinEligible, setCurrentSpinEligible] = useState<string[]>([]);
  const [currentCalamityIdx, setCurrentCalamityIdx] = useState<number>(0);
  const [wheelRotation, setWheelRotation] = useState(0);
  const [showPanel, setShowPanel] = useState(false);

  const [showSwapModal, setShowSwapModal] = useState(false);
  const [swapCountdown, setSwapCountdown] = useState(15);
  const [selectedA, setSelectedA] = useState<number | null>(null);
  const [selectedB, setSelectedB] = useState<number | null>(null);
  const [selectedC, setSelectedC] = useState<number | null>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const swapTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data: currentUser } = useQuery<{ user: SafeUser }>({ queryKey: ['/api/auth/user'] });
  const { data: users = [], refetch: refetchUsers } = useQuery<SafeUser[]>({ queryKey: ['/api/admin/users'] });

  const calamityMutation = useMutation({
    mutationFn: (body: { teamNames: string[]; type: string; label: string }) =>
      apiRequest('/api/admin/dashboard/calamity', { method: 'POST', body: JSON.stringify(body) }),
  });

  const clearOutcomesMutation = useMutation({
    mutationFn: () => apiRequest('/api/admin/dashboard/clear-outcomes', { method: 'POST' }),
  });

  const rotateMutation = useMutation({
    mutationFn: ({ userIdA, userIdB, userIdC }: { userIdA: number; userIdB: number; userIdC: number }) =>
      apiRequest('/api/admin/rotate-members', { method: 'POST', body: JSON.stringify({ userIdA, userIdB, userIdC }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      refetchUsers();
      setShowSwapModal(false);
      setSelectedA(null);
      setSelectedB(null);
      setSelectedC(null);
    },
  });

  const teams = Array.from(new Set(
    users.filter(u => u.userType === 'competitor' && u.edition === CURRENT_EDITION && u.teamName).map(u => u.teamName as string)
  )).sort((a, b) => {
    const na = parseInt(a.replace(/\D/g, '')) || 0;
    const nb = parseInt(b.replace(/\D/g, '')) || 0;
    return na - nb;
  });

  const getAudio = () => {
    if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
    if (audioCtxRef.current.state === 'suspended') audioCtxRef.current.resume();
    return audioCtxRef.current;
  };

  const playBeep = (freq = 880, dur = 0.15) => {
    const ctx = getAudio();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.35, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.start(); osc.stop(ctx.currentTime + dur);
  };

  const playSiren = () => {
    const ctx = getAudio();
    for (let i = 0; i < 4; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      const t = ctx.currentTime + i * 0.7;
      osc.frequency.setValueAtTime(500, t);
      osc.frequency.linearRampToValueAtTime(1100, t + 0.3);
      osc.frequency.linearRampToValueAtTime(500, t + 0.65);
      gain.gain.setValueAtTime(0.28, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.68);
      osc.start(t); osc.stop(t + 0.68);
    }
  };

  const handleSpin = () => {
    if (phase !== 'idle') return;
    if (spinNumber >= CALAMITIES.length) return;
    // No competitors yet — surface the empty state instead of a pointless spin.
    if (teams.length === 0) {
      setCurrentSpinSelected([]);
      setCurrentSpinEligible([]);
      setCurrentCalamityIdx(Math.min(spinNumber, CALAMITIES.length - 1));
      setShowPanel(true);
      return;
    }
    // Hide panel first, then start countdown
    setShowPanel(false);
    setCurrentSpinSelected([]);
    setCurrentSpinEligible([]);
    setPhase('countdown');
    setCountdown(10);
    setCountdownKey(k => k + 1);

    let count = 10;
    countdownRef.current = setInterval(() => {
      count--;
      setCountdown(count);
      setCountdownKey(k => k + 1);
      if (count <= 5 && count > 0) playBeep(count <= 2 ? 1320 : 880, 0.12);
      if (count === 0) {
        clearInterval(countdownRef.current!);
        doSpin();
      }
    }, 1000);
  };

  const doSpin = () => {
    playSiren();
    setPhase('spinning');

    // Every team is always in play — no immunity. Each spin draws fresh at random,
    // so a team can be struck by several calamities across spins.
    const eligible = teams;
    const n = teams.length;
    const calamityIdx = spinNumber;
    let selected: string[];

    // Same random draw on every spin (including the final one) — a fresh shuffle
    // of all teams, so the outcome is never predetermined.
    const shuffled = [...eligible].sort(() => Math.random() - 0.5);
    const firstTeam = shuffled[0];

    if (n >= 3) {
      // Three pointers: top (0°), right (90° = n/4 ahead), left (270° = 3n/4 ahead)
      const firstIdx = teams.indexOf(firstTeam);
      const rightIdx = Math.round(firstIdx + n / 4) % n;
      const leftIdx  = Math.round(firstIdx + 3 * n / 4) % n;
      const rightTeam = teams[rightIdx];
      const leftTeam  = teams[leftIdx];

      const rightOk = rightTeam !== firstTeam;
      const leftOk  = leftTeam !== firstTeam && leftTeam !== rightTeam;

      if (rightOk && leftOk) {
        selected = [firstTeam, rightTeam, leftTeam];
      } else {
        // Fallback: pick three randomly
        selected = shuffled.slice(0, 3);
      }
    } else if (n >= 2) {
      selected = shuffled.slice(0, 2);
    } else {
      selected = shuffled.slice(0, 1);
    }

    // Guard against blank picks (e.g. no teams), which would render a ghost row.
    selected = selected.filter((t): t is string => Boolean(t && t.trim()));

    setCurrentSpinSelected(selected);
    setCurrentSpinEligible(eligible);
    setCurrentCalamityIdx(calamityIdx);

    // Wheel rotation: land near first selected team (under top pointer)
    if (n > 0 && selected.length > 0) {
      const targetIdx = teams.indexOf(selected[0]);
      setWheelRotation(cur => {
        const targetOffsetDeg = ((n - targetIdx - 0.5) / n * 360 + 360) % 360;
        const currentMod = cur % 360;
        const diff = (targetOffsetDeg - currentMod + 360) % 360;
        return cur + diff + 360 * (4 + Math.floor(Math.random() * 4));
      });
    }

    setTimeout(() => {
      setSpinNumber(prev => prev + 1);
      setPhase('result');
      setShowPanel(true);
      setTimeout(() => setPhase('idle'), 800);

      // Push the calamity to the live dashboard (challenge cards + feed).
      if (selected.length > 0) {
        calamityMutation.mutate({
          teamNames: selected,
          type: CALAMITIES[calamityIdx].id,
          label: CALAMITIES[calamityIdx].name,
        });
      }

      // Founders Dispute: open swap modal after 15s countdown
      if (calamityIdx === 0 && selected.length >= 2) {
        setSwapCountdown(15);
        let t = 15;
        swapTimerRef.current = setInterval(() => {
          t--;
          setSwapCountdown(t);
          if (t <= 0) {
            clearInterval(swapTimerRef.current!);
            setShowSwapModal(true);
          }
        }, 1000);
      }
    }, 5000);
  };

  const handleReset = () => {
    if (!window.confirm('Reset the Wheel and clear all dashboard outcomes & live feed? This cannot be undone.')) return;
    if (countdownRef.current) clearInterval(countdownRef.current);
    if (swapTimerRef.current) clearInterval(swapTimerRef.current);
    setShowSwapModal(false);
    setSelectedA(null);
    setSelectedB(null);
    setPhase('idle');
    setSpinNumber(0);
    setCurrentSpinSelected([]);
    setCurrentSpinEligible([]);
    setWheelRotation(0);
    setShowPanel(false);
    setCountdown(10);
    clearOutcomesMutation.mutate();
  };

  useEffect(() => () => { if (countdownRef.current) clearInterval(countdownRef.current); }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 's' || e.key === 'S') handleSpin();
      if (e.key === 'r' || e.key === 'R') handleReset();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, spinNumber, teams.length]);

  // ── SVG wheel segments ──
  const n = teams.length;
  const cx = 200, cy = 200, r = 188;

  const wheelSegments = n > 0 ? teams.map((team, i) => {
    const segAngle = (2 * Math.PI) / n;
    const startAngle = i * segAngle - Math.PI / 2;
    const endAngle = (i + 1) * segAngle - Math.PI / 2;
    const largeArc = segAngle > Math.PI ? 1 : 0;

    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);

    // Text: centered in the segment, radial orientation
    const midAngle = startAngle + segAngle / 2;
    const labelR = r * 0.62;
    const lx = cx + labelR * Math.cos(midAngle);
    const ly = cy + labelR * Math.sin(midAngle);
    // Radial rotation — text reads outward from center
    const textRotDeg = midAngle * 180 / Math.PI;

    const segCol = SEG_COLORS[i % SEG_COLORS.length];
    const selIdx = currentSpinSelected.indexOf(team);
    const isSelected = selIdx !== -1;
    const brightCol = isSelected ? DISPUTE_COLORS[selIdx % DISPUTE_COLORS.length] : null;
    const isDimmed = showPanel && currentSpinSelected.length > 0 && !isSelected;
    const d = `M ${cx} ${cy} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${largeArc} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`;

    return (
      <g key={team} style={{ opacity: isDimmed ? 0.2 : 1, transition: 'opacity 0.6s ease' }}>
        <path d={d} fill={isDimmed ? 'var(--ink-900)' : (brightCol ?? segCol)} stroke="var(--ink-900)" strokeWidth="1.5" style={{ transition: 'fill 0.6s ease' }} />
        <text
          x={lx} y={ly}
          textAnchor="start"
          dominantBaseline="middle"
          fontSize={n > 10 ? 12 : 14}
          fill={brightCol ? 'var(--ink-900)' : 'var(--ink-100)'}
          fontWeight={brightCol ? '800' : '700'}
          transform={`rotate(${textRotDeg.toFixed(1)}, ${lx.toFixed(2)}, ${ly.toFixed(2)})`}
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          {team}
        </text>
      </g>
    );
  }) : null;

  if (!currentUser?.user?.isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[100dvh] bg-background">
        <p className="text-muted-foreground mono-label">Admin access required.</p>
      </div>
    );
  }

  const upcomingCalamity = CALAMITIES[Math.min(spinNumber, CALAMITIES.length - 1)];
  const currentCalamity = CALAMITIES[currentCalamityIdx];
  const safeThisRound = currentSpinEligible.filter(t => !currentSpinSelected.includes(t));

  return (
    <div className="min-h-[100dvh] bg-background text-foreground px-8 py-8 select-none overflow-hidden relative"
      style={{ backgroundImage: 'radial-gradient(circle at 50% -20%, rgba(255,255,255,0.03) 0%, transparent 60%)' }}>

      {/* Full-screen countdown overlay */}
      {phase === 'countdown' && (() => {
        const upcoming = CALAMITIES[spinNumber];
        return (
          <div className="fixed inset-0 z-50 flex flex-col items-center justify-center pointer-events-none"
            style={{ background: 'var(--ink-900)' }}>
            {/* Incoming calamity label */}
            {upcoming && (
              <div className="flex flex-col items-center mb-8">
                <p className="mono-label text-muted-foreground mb-4">Incoming Calamity</p>
                <div className="flex items-center gap-4 px-8 py-4 rounded-xl border-2"
                  style={{ background: upcoming.bg, borderColor: upcoming.border, boxShadow: `0 0 60px ${upcoming.border}40` }}>
                  <span className="text-foreground">{upcoming.icon}</span>
                  <span className="display text-foreground text-3xl">{upcoming.name}</span>
                </div>
              </div>
            )}
            {/* Big countdown number */}
            <div
              key={countdownKey}
              className="display num"
              style={{
                fontSize: 'clamp(140px, 25vw, 300px)',
                lineHeight: 1,
                color: countdown <= 3 ? 'var(--neg)' : 'var(--ink-100)',
                textShadow: countdown <= 3
                  ? '0 0 60px var(--neg)'
                  : 'none',
                animation: 'countPop 0.35s cubic-bezier(0.34,1.56,0.64,1)',
              }}
            >
              {countdown}
            </div>
          </div>
        );
      })()}

      {/* Header */}
      <div className="flex items-center justify-between mb-8 relative z-10">
        <Link to="/admin" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mono-label">
          <ChevronLeft className="h-4 w-4" /> Admin
        </Link>
        <div className="text-center">
          <h1 className="display text-primary tracking-tighter" style={{ fontSize: 'clamp(32px, 5vw, 64px)' }}>
            Wheel of Destiny
          </h1>
          <p className="mono-label text-muted-foreground mt-2">
            VIBER CHAMPIONSHIP — {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
        <div className="w-24" />
      </div>

      <div className="flex gap-12 items-start justify-center max-w-[1400px] mx-auto mt-12 relative z-10">

        {/* ── Wheel column ── */}
        <div className="flex-shrink-0 flex flex-col items-center gap-8">

          {/* Wheel container */}
          <div className="relative rounded-full border border-border bg-ink-850 shadow-[var(--shadow-lg)]" style={{ width: 700, height: 700, padding: 10 }}>

            {/* TOP pointer — pointing down */}
            <div className="absolute z-20"
              style={{ top: -10, left: '50%', transform: 'translateX(-50%)' }}>
              <div style={{
                width: 0, height: 0,
                borderLeft: '24px solid transparent',
                borderRight: '24px solid transparent',
                borderTop: '40px solid var(--accent)',
              }} />
            </div>

            {/* LEFT pointer — pointing right */}
            <div className="absolute z-20"
              style={{ left: -10, top: '50%', transform: 'translateY(-50%)' }}>
              <div style={{
                width: 0, height: 0,
                borderTop: '24px solid transparent',
                borderBottom: '24px solid transparent',
                borderLeft: '40px solid var(--accent)',
              }} />
            </div>

            {/* RIGHT pointer — pointing left */}
            <div className="absolute z-20"
              style={{ right: -10, top: '50%', transform: 'translateY(-50%)' }}>
              <div style={{
                width: 0, height: 0,
                borderTop: '24px solid transparent',
                borderBottom: '24px solid transparent',
                borderRight: '40px solid var(--accent)',
              }} />
            </div>

            {/* Spinning wheel SVG */}
            <div style={{
              transform: `rotate(${wheelRotation}deg)`,
              transition: phase === 'spinning'
                ? 'transform 5s cubic-bezier(0.15, 0.5, 0.1, 1.0)'
                : 'none',
              width: '100%', height: '100%',
              borderRadius: '50%',
              overflow: 'hidden'
            }}>
              <svg viewBox="0 0 400 400" width="100%" height="100%">
                <circle cx="200" cy="200" r="198" fill="var(--ink-850)" />
                {wheelSegments}
                {/* Spoke dividers */}
                {n > 0 && teams.map((_, i) => {
                  const angle = i * (2 * Math.PI / n) - Math.PI / 2;
                  return (
                    <line key={i}
                      x1={cx} y1={cy}
                      x2={(cx + r * Math.cos(angle)).toFixed(2)}
                      y2={(cy + r * Math.sin(angle)).toFixed(2)}
                      stroke="var(--ink-900)" strokeWidth="2" />
                  );
                })}
                {/* Center hub */}
                <circle cx="200" cy="200" r="30" fill="var(--ink-900)" stroke="var(--ink-600)" strokeWidth="2" />
                <circle cx="200" cy="200" r="12" fill="var(--accent)" />
              </svg>
            </div>
          </div>

          <div className="flex gap-6 mono-label">
            <span className="flex items-center gap-2"><kbd className="px-2 py-1 rounded bg-card border border-border text-foreground font-mono">S</kbd> Spin</span>
            <span className="flex items-center gap-2"><kbd className="px-2 py-1 rounded bg-card border border-border text-foreground font-mono">R</kbd> Reset</span>
          </div>
        </div>

        {/* ── Result panel ── */}
        <div style={{
          maxWidth: showPanel ? 480 : 0,
          overflow: 'hidden',
          flexShrink: 0,
          transition: 'max-width 0.7s cubic-bezier(0.4,0,0.2,1)',
        }}>
        <div style={{
          width: 480,
          opacity: showPanel ? 1 : 0,
          transition: `opacity 0.45s ease ${showPanel ? '0.45s' : '0s'}`,
          pointerEvents: showPanel ? 'auto' : 'none',
        }}>
          {showPanel && currentCalamity && (
            <>
              {/* Calamity header */}
              <div className="card border-2 mb-6 text-center"
                style={{ borderColor: currentCalamity.border, boxShadow: `0 0 40px ${currentCalamity.border}40` }}>
                <div className="flex justify-center text-foreground mb-4">{currentCalamity.icon}</div>
                <div className="display text-2xl text-foreground mb-4">{currentCalamity.name}</div>
                {currentCalamity.desc && (
                  <p className="text-muted-foreground text-sm leading-relaxed max-w-sm mx-auto">
                    {currentCalamity.desc}
                  </p>
                )}
              </div>

              {/* Selected teams — got the calamity */}
              <div className="mb-6">
                <p className="mono-label mb-3">Affected Teams</p>
                {currentSpinSelected.length === 0 ? (
                  <div className="panel flex items-center gap-3 px-5 py-4 border-2 border-border">
                    <ShieldCheck className="w-5 h-5 text-muted-foreground shrink-0" />
                    <p className="text-sm text-muted-foreground">
                      No competitor teams found yet. Add competitors before spinning the wheel.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {currentSpinSelected.map((team, idx) => {
                      const teamCol = DISPUTE_COLORS[idx % DISPUTE_COLORS.length];
                      return (
                        <div key={team} className="panel flex items-center gap-4 px-5 py-4 border-2"
                          style={{ borderColor: teamCol, boxShadow: `0 0 24px ${teamCol}55` }}>
                          <span style={{ color: teamCol }}>{currentCalamity.icon}</span>
                          <div>
                            <p className="font-bold text-lg" style={{ color: teamCol }}>{team}</p>
                            <p className="mono-label text-muted-foreground mt-1">{currentCalamity.name}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Safe teams this round */}
              {safeThisRound.length > 0 && (
                <div>
                  <p className="mono-label mb-3">Safe This Round</p>
                  <div className="grid grid-cols-2 gap-3">
                    {safeThisRound.map(team => (
                      <div key={team} className="panel flex items-center gap-3 px-4 py-3 border-pos">
                        <ShieldCheck className="w-5 h-5 text-pos" />
                        <div>
                          <p className="font-bold text-foreground text-sm">{team}</p>
                          <p className="mono-label text-pos mt-0.5">Safe</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </>
          )}
        </div>
        </div>
      </div>

      {/* ── Founders Dispute Rotate Modal ── */}
      {showSwapModal && (() => {
        const teamA = currentSpinSelected[0];
        const teamB = currentSpinSelected[1];
        const teamC = currentSpinSelected[2];
        const membersA = users.filter(u => u.teamName === teamA);
        const membersB = users.filter(u => u.teamName === teamB);
        const membersC = users.filter(u => u.teamName === teamC);
        const canRotate = selectedA !== null && selectedB !== null && selectedC !== null;
        const isPending = rotateMutation.isPending;

        const slots = [
          { label: teamA, members: membersA, selected: selectedA, setSelected: setSelectedA, arrow: `→ ${teamB}`, color: DISPUTE_COLORS[0] },
          { label: teamB, members: membersB, selected: selectedB, setSelected: setSelectedB, arrow: `→ ${teamC}`, color: DISPUTE_COLORS[1] },
          { label: teamC, members: membersC, selected: selectedC, setSelected: setSelectedC, arrow: `→ ${teamA}`, color: DISPUTE_COLORS[2] },
        ];

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ background: 'var(--ink-900)' }}>
            <div className="card max-w-3xl w-full mx-4 border-2 border-warn" style={{ boxShadow: '0 0 60px var(--warn)' }}>
              <div className="text-center mb-8">
                <div className="flex justify-center mb-4 text-warn"><Users size={48}/></div>
                <h2 className="display text-3xl text-warn mb-2">Founders Dispute</h2>
                <p className="text-muted-foreground text-sm">
                  Pick one person from each team — they rotate: <span className="text-foreground font-bold">{teamA} → {teamB} → {teamC} → {teamA}</span>
                </p>
              </div>

              <div className="grid grid-cols-3 gap-6 mb-8">
                {slots.map(({ label, members, selected, setSelected, arrow, color }) => (
                  <div key={label}>
                    <div className="flex items-center justify-between mb-3">
                      <p className="mono-label font-bold" style={{ color }}>{label}</p>
                      <span className="mono-label" style={{ color }}>{arrow}</span>
                    </div>
                    <div className="space-y-2">
                      {members.map(m => (
                        <button key={m.id}
                          onClick={() => setSelected(m.id === selected ? null : m.id)}
                          className="w-full text-left px-4 py-3 rounded-md transition-all font-bold text-sm flex items-center gap-3 border"
                          style={{
                            background: selected === m.id ? color : 'var(--ink-850)',
                            borderColor: selected === m.id ? color : 'var(--ink-600)',
                            color: selected === m.id ? 'var(--ink-900)' : 'var(--ink-100)',
                          }}>
                          {m.discordAvatar && m.discordId ? (
                            <img
                              src={`https://cdn.discordapp.com/avatars/${m.discordId}/${m.discordAvatar}.png?size=64`}
                              alt={m.name ?? ''}
                              className="w-8 h-8 rounded-sm object-cover flex-shrink-0"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-sm flex-shrink-0 flex items-center justify-center font-mono text-lg"
                              style={{ background: selected === m.id ? 'var(--ink-900)' : 'var(--ink-700)', color: selected === m.id ? color : 'var(--ink-100)' }}>
                              {(m.name ?? '?').charAt(0).toUpperCase()}
                            </div>
                          )}
                          <span className="truncate">{m.name}</span>
                        </button>
                      ))}
                      {members.length === 0 && (
                        <p className="text-sm text-muted-foreground italic px-2">No members</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => rotateMutation.mutate({ userIdA: selectedA!, userIdB: selectedB!, userIdC: selectedC! })}
                disabled={!canRotate || isPending}
                className="btn w-full btn-lg border-none"
                style={{ backgroundColor: canRotate ? 'var(--warn)' : 'var(--ink-700)', color: canRotate ? 'var(--ink-900)' : 'var(--ink-400)' }}
              >
                {isPending ? 'Rotating…' : 'Confirm Rotation'}
              </button>
            </div>
          </div>
        );
      })()}

      <style>{`
        @keyframes countPop {
          0% { transform: scale(1.5); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default WheelOfDestinyPage;
