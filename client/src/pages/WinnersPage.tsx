import { Trophy, Crown, Medal, Award, ExternalLink, Sparkles } from 'lucide-react';

type Winner = {
  rank: number;
  title: string;
  team: string;
  url: string;
  thumbnail: string;
  description?: string;
};

const WINNERS: Winner[] = [
  {
    rank: 1,
    title: 'World Cup Aura',
    team: 'Team 9',
    url: 'https://WorldCupAura.replit.app',
    thumbnail: 'https://i.postimg.cc/KYRW7pz0/Screenshot-2026-06-19-at-8-38-13-AM.png',
    description: 'The champions of Viber 5 — World Cup Aura took the crown.',
  },
  {
    rank: 2,
    title: 'SolStars',
    team: 'Team 15',
    url: 'https://solstars.vercel.app/',
    thumbnail: 'https://i.postimg.cc/1RLpCCz6/Screenshot-2026-06-19-at-20-17-20.png',
    description: 'A football card collection game built on Solana — rip packs, own cards, battle on-chain.',
  },
  {
    rank: 3,
    title: 'Fifa Chess',
    team: 'Team 18',
    url: 'https://fifachess.replit.app',
    thumbnail: 'https://i.postimg.cc/y8ZBhTdz/3cf5fc6e-30da-4aec-b0fc-36c2116ff432.png',
    description: 'Football meets chess in a strategic World Cup showdown.',
  },
  {
    rank: 4,
    title: 'FIFA Cards Clash',
    team: 'Fantastic Duo',
    url: 'https://fifa-card-clash.lovable.app/',
    thumbnail: 'https://i.postimg.cc/fLX06d5j/fifa-card-clash-thumbnail.png',
    description: 'Collect, clash and conquer with your ultimate FIFA card deck.',
  },
];

const MEDAL = {
  1: { color: '#f9a826', label: 'CHAMPION', Icon: Crown },
  2: { color: '#c3c9d2', label: 'RUNNER-UP', Icon: Medal },
  3: { color: '#cd7f32', label: 'THIRD PLACE', Icon: Medal },
  4: { color: '#8a93a0', label: 'FOURTH PLACE', Icon: Award },
} as const;

const Champion = ({ w }: { w: Winner }) => {
  const m = MEDAL[1];
  return (
    <a
      href={w.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block rounded-xl overflow-hidden border-2 transition-transform hover:-translate-y-1"
      style={{
        borderColor: m.color,
        background: 'var(--ink-800)',
        boxShadow: `0 0 40px ${m.color}33`,
      }}
    >
      <div className="grid md:grid-cols-2">
        <div className="relative aspect-video md:aspect-auto md:min-h-[320px] overflow-hidden bg-ink-700">
          <img
            src={w.thumbnail}
            alt={w.title}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div
            className="absolute top-4 left-4 flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold uppercase tracking-widest"
            style={{ background: m.color, color: 'var(--accent-ink)' }}
          >
            <Crown size={16} /> {m.label}
          </div>
        </div>

        <div className="p-8 flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={18} style={{ color: m.color }} />
            <span className="mono-label" style={{ color: m.color }}>
              Viber 5 · #1 Winner
            </span>
          </div>
          <h2 className="h2 mb-2 group-hover:text-primary transition-colors">{w.title}</h2>
          <div className="mono-label mb-4">{w.team}</div>
          {w.description && (
            <p className="body-l text-ink-200 mb-6">{w.description}</p>
          )}
          <span
            className="btn btn-solid self-start"
            style={{ background: m.color, color: 'var(--accent-ink)', borderColor: m.color }}
          >
            Play App <ExternalLink size={16} className="ml-2" />
          </span>
        </div>
      </div>
    </a>
  );
};

const RunnerCard = ({ w }: { w: Winner }) => {
  const m = MEDAL[w.rank as 2 | 3 | 4];
  const { Icon } = m;
  return (
    <a
      href={w.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block rounded-lg overflow-hidden border transition-transform hover:-translate-y-1"
      style={{ borderColor: 'var(--ink-600)', background: 'var(--ink-800)' }}
    >
      <div className="relative aspect-video overflow-hidden bg-ink-700">
        <img
          src={w.thumbnail}
          alt={w.title}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div
          className="absolute top-3 left-3 flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest"
          style={{ background: m.color, color: 'var(--accent-ink)' }}
        >
          <Icon size={14} /> #{w.rank}
        </div>
      </div>
      <div className="p-5">
        <div className="mono-label mb-2" style={{ color: m.color }}>
          {m.label}
        </div>
        <h3 className="h3 mb-1 group-hover:text-primary transition-colors">{w.title}</h3>
        <div className="mono-label mb-3">{w.team}</div>
        {w.description && (
          <p className="text-sm text-ink-300 line-clamp-2 mb-4">{w.description}</p>
        )}
        <span className="inline-flex items-center text-sm font-bold uppercase tracking-wide" style={{ color: m.color }}>
          Play App <ExternalLink size={14} className="ml-2" />
        </span>
      </div>
    </a>
  );
};

const WinnersPage = () => {
  const champion = WINNERS.find((w) => w.rank === 1)!;
  const runners = WINNERS.filter((w) => w.rank !== 1);

  return (
    <div className="arena-wrap py-12 min-h-screen">
      <div className="text-center mb-12 border-b border-ink-600 pb-10">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Trophy className="text-accent w-8 h-8" style={{ color: '#f9a826' }} />
          <span className="mono-label" style={{ color: '#f9a826' }}>
            FIFA World Cup · Viber 5
          </span>
        </div>
        <h1 className="h1 mb-3">Winning Teams</h1>
        <p className="body-l text-ink-300 max-w-2xl mx-auto">
          The champions of the Viber 5 vibecoding arena. Congratulations to every team
          that shipped — here are the top four.
        </p>
      </div>

      <div className="max-w-5xl mx-auto space-y-10">
        <Champion w={champion} />

        <div className="grid gap-6 md:grid-cols-3">
          {runners.map((w) => (
            <RunnerCard key={w.rank} w={w} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default WinnersPage;
