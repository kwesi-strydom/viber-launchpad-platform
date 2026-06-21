import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

const LoginPage = () => {
  const [discordUrl, setDiscordUrl] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const role = searchParams.get('role') || 'audience';
  const isCompetitor = role === 'competitor';

  useEffect(() => {
    fetch(`/api/auth/discord/url?role=${role}`)
      .then(r => r.json())
      .then(data => setDiscordUrl(data.url))
      .catch(() => setDiscordUrl('/api/auth/discord'));
  }, [role]);

  return (
    <div className="arena-wrap min-h-screen flex items-center justify-center py-16">
      <div className="w-full max-w-md">
        <h1 className="display mb-4 text-center text-[2.5rem] md:text-[3rem]">
          {isCompetitor ? 'Competitor Login' : 'Audience Login'}
        </h1>
        <p className="mono-label text-center mb-10">
          {isCompetitor ? 'Sign in to access your team page' : 'Sign in to browse & rate apps'}
        </p>

        <div className="card text-center">
          <p className="mb-6 text-foreground font-medium">
            Network School member? Sign in instantly with your NS account.
          </p>
          <a
            href={discordUrl ?? '#'}
            target="_top"
            rel="noopener noreferrer"
            className={`btn btn-primary w-full ${!discordUrl ? 'opacity-50 cursor-not-allowed' : ''}`}
            style={{
              pointerEvents: discordUrl ? 'auto' : 'none',
            }}
          >
            <img
              src="https://i.postimg.cc/5tmKC0zQ/ns-logo-white.png"
              alt="NS"
              className="h-5 w-auto object-contain brightness-0 invert"
            />
            Login with NS
          </a>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
