import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Loader2, Globe, Shirt, User as UserIcon } from 'lucide-react';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { COUNTRIES, SHIRT_SIZES } from '@/lib/countries';
import heroImg from '@assets/viber-onboarding-hero.jpg';

interface SafeUser {
  id: number;
  name?: string;
  discordUsername?: string;
  country?: string;
  shirtSize?: string;
  onboarded?: boolean;
  userType: string;
}

const OnboardingPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data: user, isLoading } = useQuery<SafeUser>({ queryKey: ['/api/my-team'] });

  const [name, setName] = useState('');
  const [country, setCountry] = useState('');
  const [shirtSize, setShirtSize] = useState('');

  useEffect(() => {
    if (user) {
      setName(prev => prev || user.name || user.discordUsername || '');
      setCountry(prev => prev || user.country || '');
      setShirtSize(prev => prev || user.shirtSize || '');
    }
  }, [user]);

  const mutation = useMutation({
    mutationFn: () =>
      apiRequest('/api/onboarding', {
        method: 'POST',
        body: JSON.stringify({ name, country, shirtSize }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/my-team'] });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      toast({ title: 'You\'re all set!', description: 'Welcome to the competition.' });
      navigate('/my-team', { replace: true });
    },
    onError: (err: any) =>
      toast({ title: err?.message || 'Something went wrong', variant: 'destructive' }),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !country || !shirtSize) {
      toast({ title: 'Please fill in all fields', variant: 'destructive' });
      return;
    }
    mutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <Loader2 size={24} className="animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="arena-wrap flex flex-col items-center justify-center min-h-[80vh] py-10">
      <div className="card w-full max-w-lg p-0 overflow-hidden border-border bg-ink-800">
        <div className="h-48 md:h-56 img-darken">
          <img src={heroImg} alt="Viber competition" className="w-full h-full object-cover" />
        </div>

        <div className="p-8">
          <h1 className="h2 mb-2 text-center">Competitor Onboarding</h1>
          <p className="text-muted-foreground text-sm text-center mb-8">
            A few quick details before you join the competition. This helps us prepare your custom shirt and represent your country.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="field">
              <label className="flex items-center gap-2">
                <UserIcon size={14} className="text-primary" /> Full Name
              </label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Your full name"
              />
            </div>

            <div className="field">
              <label className="flex items-center gap-2">
                <Globe size={14} className="text-primary" /> Country You Represent
              </label>
              <select
                value={country}
                onChange={e => setCountry(e.target.value)}
              >
                <option value="">Select your country…</option>
                {COUNTRIES.map(c => (
                  <option key={c.name} value={c.name}>
                    {c.flag} {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label className="flex items-center gap-2">
                <Shirt size={14} className="text-primary" /> Shirt Size
              </label>
              <div className="grid grid-cols-4 gap-2">
                {SHIRT_SIZES.map(size => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setShirtSize(size)}
                    className={`py-2.5 rounded-sm font-bold text-sm border transition-all ${
                      shirtSize === size
                        ? 'bg-primary border-primary text-background'
                        : 'bg-background border-border text-foreground hover:border-primary/50'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
              <p className="text-muted-foreground text-xs mt-2">
                Viber 5 is completely free — your custom competition shirt is included at no cost.
              </p>
            </div>

            <button
              type="submit"
              disabled={mutation.isPending}
              className="btn btn-primary w-full mt-4"
            >
              {mutation.isPending ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Saving…
                </>
              ) : (
                'Continue'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default OnboardingPage;
