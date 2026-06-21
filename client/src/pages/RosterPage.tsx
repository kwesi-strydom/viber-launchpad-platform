import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Users, Search } from 'lucide-react';
import { countryFlag } from '@/lib/countries';
import { teamNameToSlug } from '@/lib/teamUtils';

interface Competitor {
  id: number;
  name: string;
  country: string | null;
  teamName: string | null;
  discordUsername: string | null;
  avatarUrl: string | null;
}

const initials = (name: string) =>
  name
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

const CompetitorCard = ({ c }: { c: Competitor }) => {
  const avatarUrl = c.avatarUrl;

  const card = (
    <div className="card flex items-center gap-4 p-4 h-full transition-transform hover:-translate-y-1">
      <div className="shrink-0">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={c.name}
            className="w-12 h-12 rounded-full object-cover border border-ink-600"
          />
        ) : (
          <div className="w-12 h-12 rounded-full grid place-items-center bg-ink-700 border border-ink-600 text-sm font-bold text-ink-200">
            {initials(c.name)}
          </div>
        )}
      </div>
      <div className="min-w-0">
        <div className="font-bold truncate">{c.name}</div>
        <div className="mono-label truncate">
          {c.country ? `${countryFlag(c.country)} ${c.country}` : '—'}
        </div>
        {c.teamName && (
          <div className="text-xs text-primary font-bold uppercase tracking-wide mt-1">
            {c.teamName}
          </div>
        )}
      </div>
    </div>
  );

  if (c.teamName) {
    return (
      <Link to={`/team/${teamNameToSlug(c.teamName)}`} className="block h-full">
        {card}
      </Link>
    );
  }
  return card;
};

const RosterPage = () => {
  const [search, setSearch] = useState('');
  const { data: competitors = [], isLoading } = useQuery<Competitor[]>({
    queryKey: ['/api/competitors'],
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return competitors;
    return competitors.filter(
      (c) =>
        c.name?.toLowerCase().includes(q) ||
        c.country?.toLowerCase().includes(q) ||
        c.teamName?.toLowerCase().includes(q) ||
        c.discordUsername?.toLowerCase().includes(q),
    );
  }, [competitors, search]);

  return (
    <div className="arena-wrap py-12 min-h-screen">
      <div className="text-center mb-10 border-b border-ink-600 pb-8">
        <div className="flex items-center justify-center gap-2 mb-3">
          <Users className="text-primary w-7 h-7" />
          <span className="mono-label text-primary">Viber 5 · FIFA World Cup</span>
        </div>
        <h1 className="h1 mb-3">Competitors</h1>
        <p className="body-l text-ink-300 max-w-2xl mx-auto">
          Everyone competing in the arena. {competitors.length > 0 && `${competitors.length} builders`}{' '}
          shipping apps across the teams.
        </p>
      </div>

      <div className="max-w-5xl mx-auto">
        <div className="relative mb-8 max-w-md mx-auto">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, country, or team..."
            className="w-full pl-10 pr-4 py-3 rounded-lg bg-ink-800 border border-ink-600 text-foreground placeholder:text-ink-400 focus:outline-none focus:border-primary"
          />
        </div>

        {isLoading ? (
          <div className="text-center py-16">
            <div className="kicker animate-pulse text-primary">Loading competitors...</div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-ink-400">
            No competitors found{search ? ` for "${search}"` : ''}.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((c) => (
              <CompetitorCard key={c.id} c={c} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RosterPage;
