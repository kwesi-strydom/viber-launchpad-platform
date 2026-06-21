import { Link } from 'react-router-dom';
import { useAuth } from '@/components/AuthProvider';
import { useRef, useState, useEffect } from 'react';
import homeHeroImg from '@assets/viber-group-photo.jpg';
import worldSeriesImg from '@assets/worldseries.jpg';
import codingActionImg from '@assets/viber-coding-action.jpg';
import teamCollabImg from '@assets/viber-team-collab.jpg';

const HomePage = () => {
  const { isAuthenticated, user } = useAuth();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const dragStartX = useRef(0);
  const dragStartScrollLeft = useRef(0);
  const animationRef = useRef<number | null>(null);

  // JS-driven auto-scroll — same scrollLeft axis as drag, so they work together
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const step = () => {
      if (!isDragging && !isHovering && el) {
        el.scrollLeft += 1;
        // Seamless loop: when we've scrolled past the first half, snap back
        if (el.scrollLeft >= el.scrollWidth / 2) {
          el.scrollLeft -= el.scrollWidth / 2;
        }
      }
      animationRef.current = requestAnimationFrame(step);
    };

    animationRef.current = requestAnimationFrame(step);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isDragging, isHovering]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStartX.current = e.pageX - (scrollRef.current?.offsetLeft || 0);
    dragStartScrollLeft.current = scrollRef.current?.scrollLeft || 0;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - dragStartX.current) * 1.5;
    scrollRef.current.scrollLeft = dragStartScrollLeft.current - walk;
    // Seamless loop during drag too
    const el = scrollRef.current;
    if (el.scrollLeft >= el.scrollWidth / 2) el.scrollLeft -= el.scrollWidth / 2;
    if (el.scrollLeft < 0) el.scrollLeft += el.scrollWidth / 2;
  };

  const handleMouseUp = () => setIsDragging(false);
  const handleMouseLeave = () => setIsDragging(false);

  const getProfileRoute = () => {
    if (!isAuthenticated) {
      return '/login';
    }
    
    if (user?.userType === 'competitor') {
      return '/competitors';
    } else if (user?.userType === 'spectator') {
      return '/spectators';
    }
    
    return '/login';
  };

  const getProfileButtonText = () => {
    if (!isAuthenticated) {
      return 'My Profile';
    }
    
    return user?.userType === 'competitor' ? 'My Dashboard' : 'My Profile';
  };

  return (
    <div className="w-full">
      {/* Full-bleed hero */}
      <section className="group relative h-auto min-h-[480px] md:min-h-[620px] md:h-[85vh] w-full overflow-hidden bg-background">
        {/* Left-side image — grayscale, colorizes on hover */}
        <img 
          src={worldSeriesImg} 
          alt="The World Series of Vibecoding" 
          className="absolute inset-y-0 left-0 h-full w-full md:w-[62%] object-cover object-center grayscale group-hover:grayscale-0 transition-all duration-700 ease-out"
        />
        {/* Mobile: uniform dark overlay so text reads over the photo */}
        <div className="absolute inset-0 bg-background/75 md:hidden"></div>
        {/* Desktop: long, gradual fade to black across the right of the image */}
        <div
          className="absolute inset-0 hidden md:block"
          style={{
            background:
              'linear-gradient(to left, hsl(var(--background)) 0%, hsl(var(--background)) 42%, hsl(var(--background) / 0.92) 52%, hsl(var(--background) / 0.55) 66%, hsl(var(--background) / 0.2) 80%, transparent 95%)',
          }}
        ></div>
        {/* Soft fade into the next section at the bottom */}
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-background to-transparent"></div>

        <div className="relative z-10 h-full">
          <div className="arena-wrap h-full flex items-center py-20 md:py-0">
            <div className="w-full md:w-[42%] md:ml-auto text-center md:text-left">
              <h1 className="display mb-6 uppercase" style={{ fontSize: 'clamp(2.25rem, 5.5vw, 4.75rem)', lineHeight: 0.95 }}>
                <span style={{ color: 'var(--accent)' }}>The World Series<br />of Vibecoding</span>
              </h1>

              <div className="flex flex-col sm:flex-row flex-wrap gap-4 mt-8 justify-center md:justify-start">
                <Link to={getProfileRoute()} className="btn btn-primary btn-lg">
                  {getProfileButtonText()}
                </Link>
                <Link to="/games" className="btn btn-solid btn-lg">
                  Explore Apps
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      <div className="arena-wrap py-24">
        {/* Features section */}
        <section className="mb-24">
          <h2 className="h2 mb-12 text-center uppercase tracking-wide">
            How It Works
          </h2>
          
          <div className="arena-grid cols-3">
            <div className="card text-center relative overflow-hidden">
              <div className="num text-7xl text-primary font-bold mb-4 opacity-20 absolute -top-4 -left-4">01</div>
              <div className="relative z-10">
                <h3 className="h3 mb-3 uppercase">Create</h3>
                <p className="body-l">
                  Build an AI-powered app in just 60 minutes using your favorite tools.
                </p>
              </div>
            </div>
            
            <div className="card text-center relative overflow-hidden">
              <div className="num text-7xl text-primary font-bold mb-4 opacity-20 absolute -top-4 -left-4">02</div>
              <div className="relative z-10">
                <h3 className="h3 mb-3 uppercase">Submit</h3>
                <p className="body-l">
                  Share your creation and showcase your rapid development skills.
                </p>
              </div>
            </div>
            
            <div className="card text-center relative overflow-hidden">
              <div className="num text-7xl text-primary font-bold mb-4 opacity-20 absolute -top-4 -left-4">03</div>
              <div className="relative z-10">
                <h3 className="h3 mb-3 uppercase">Compete</h3>
                <p className="body-l">
                  Get votes from the audience and climb the leaderboard to win recognition and prizes.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* The Viber experience */}
        <section className="mb-24">
          <h2 className="h2 mb-12 text-center uppercase tracking-wide">
            The Viber Experience
          </h2>

          <div className="arena-grid cols-2">
            <div className="img-darken relative overflow-hidden rounded-lg aspect-[4/3] group">
              <img
                src={codingActionImg}
                alt="Participants building apps on their laptops"
                className="absolute inset-0 w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500 ease-out"
              />
              <div className="absolute bottom-0 left-0 p-6 z-10">
                <span className="kicker text-primary block mb-1">In The Arena</span>
                <h3 className="h3 text-ink-000 uppercase">60 Minutes. One App.</h3>
              </div>
            </div>

            <div className="img-darken relative overflow-hidden rounded-lg aspect-[4/3] group">
              <img
                src={teamCollabImg}
                alt="Two participants vibe coding together"
                className="absolute inset-0 w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500 ease-out"
              />
              <div className="absolute bottom-0 left-0 p-6 z-10">
                <span className="kicker text-primary block mb-1">Better Together</span>
                <h3 className="h3 text-ink-000 uppercase">Build With Your Crew.</h3>
              </div>
            </div>
          </div>
        </section>

        {/* Join our community section */}
        <section className="mb-24">
          <div className="panel p-12 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-primary/5"></div>
            <div className="absolute top-0 left-0 w-1 h-full bg-primary"></div>
            <div className="relative z-10">
              <h2 className="h2 mb-6 uppercase">
                Join Our Community
              </h2>
              <p className="body-l max-w-xl mx-auto mb-10">
                Follow Viber on X to stay up to date with hackathon events, announcements, and the latest from our community of builders.
              </p>
              <div className="img-darken relative overflow-hidden rounded-lg max-w-3xl mx-auto mb-10 aspect-[16/9] group">
                <img
                  src={homeHeroImg}
                  alt="The Viber community at a hackathon"
                  className="absolute inset-0 w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500 ease-out"
                />
              </div>
              <a
                href="https://x.com/viberlive"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary btn-lg"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" xmlns="http://www.w3.org/2000/svg">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
                Follow @viberlive
              </a>
            </div>
          </div>
        </section>

        {/* Our Partners section */}
        <section className="mb-24">
          <h2 className="h2 mb-12 text-center uppercase">
            Partners
          </h2>

          <div className="relative">
            {/* Fade overlays */}
            <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-ink-900 to-transparent z-20 pointer-events-none"></div>
            <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-ink-900 to-transparent z-20 pointer-events-none"></div>

            {/* Outer clip: only hides horizontal overflow, lets vertical scale show */}
            <div style={{ overflowX: 'hidden' }}>
              <div
                ref={scrollRef}
                className="flex scrollbar-hide cursor-grab active:cursor-grabbing"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={() => { handleMouseLeave(); setIsHovering(false); }}
                onMouseEnter={() => setIsHovering(true)}
                style={{ overflowX: 'auto', overflowY: 'visible', scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                <div className="flex items-center gap-16 py-12">
                  {[
                    { src: 'https://i.postimg.cc/VNzDm8hf/Delecto-2.png', alt: 'Delecto', href: 'https://delecto.com.au/' },
                    { src: 'https://i.postimg.cc/wvv2RkHn/Espresso.jpg', alt: 'Espresso', href: 'https://us.espres.so/' },
                    { src: 'https://i.postimg.cc/5tmKC0zQ/ns-logo-white.png', alt: 'NS Logo', href: 'https://ns.com/' },
                    { src: 'https://i.postimg.cc/tJQXfjTT/replit-logo.png', alt: 'Replit' },
                    { src: 'https://i.postimg.cc/pdcrs4z6/curious-ventures-logo.png', alt: 'Curious Ventures' },
                    { src: 'https://i.postimg.cc/fLmPSJHT/Arc.jpg', alt: 'Arc' },
                    { src: 'https://i.postimg.cc/0ycXmJc3/Nucleus-Logo.jpg', alt: 'Nucleus' },
                    { src: 'https://i.postimg.cc/PJYF83Rz/Nanobag-LOGO-FINAL-RED.jpg', alt: 'Nanobag' },
                    { src: 'https://i.postimg.cc/hvFqNk56/Devfolio-White.jpg', alt: 'Devfolio' },
                    { src: 'https://i.postimg.cc/B6VrHr3F/fracton-rec-black-skeleton.jpg', alt: 'Fracton' },
                    { src: 'https://i.postimg.cc/PfZH1qLt/I-Bet-on-You-LOGO.jpg', alt: 'I Bet on You' },
                    { src: 'https://i.postimg.cc/Vsr7m1gw/66-A486-FB-9089-46-E5-AC89-97-FB57-D01219.jpg', alt: 'Kindred' },
                    { src: 'https://i.postimg.cc/VNzDm8hf/Delecto-2.png', alt: 'Delecto', href: 'https://delecto.com.au/' },
                    { src: 'https://i.postimg.cc/wvv2RkHn/Espresso.jpg', alt: 'Espresso', href: 'https://us.espres.so/' },
                    { src: 'https://i.postimg.cc/5tmKC0zQ/ns-logo-white.png', alt: 'NS Logo', href: 'https://ns.com/' },
                    { src: 'https://i.postimg.cc/tJQXfjTT/replit-logo.png', alt: 'Replit' },
                    { src: 'https://i.postimg.cc/pdcrs4z6/curious-ventures-logo.png', alt: 'Curious Ventures' },
                    { src: 'https://i.postimg.cc/fLmPSJHT/Arc.jpg', alt: 'Arc' },
                    { src: 'https://i.postimg.cc/0ycXmJc3/Nucleus-Logo.jpg', alt: 'Nucleus' },
                    { src: 'https://i.postimg.cc/PJYF83Rz/Nanobag-LOGO-FINAL-RED.jpg', alt: 'Nanobag' },
                    { src: 'https://i.postimg.cc/hvFqNk56/Devfolio-White.jpg', alt: 'Devfolio' },
                    { src: 'https://i.postimg.cc/B6VrHr3F/fracton-rec-black-skeleton.jpg', alt: 'Fracton' },
                    { src: 'https://i.postimg.cc/PfZH1qLt/I-Bet-on-You-LOGO.jpg', alt: 'I Bet on You' },
                    { src: 'https://i.postimg.cc/Vsr7m1gw/66-A486-FB-9089-46-E5-AC89-97-FB57-D01219.jpg', alt: 'Kindred' },
                  ].map((logo, i) => (
                    <div
                      key={i}
                      className="relative flex-shrink-0 flex items-center justify-center min-w-[180px] group"
                      style={{ zIndex: 1 }}
                      onMouseEnter={e => (e.currentTarget.style.zIndex = '30')}
                      onMouseLeave={e => (e.currentTarget.style.zIndex = '1')}
                    >
                      {logo.href ? (
                        <a href={logo.href} target="_blank" rel="noopener noreferrer" tabIndex={-1}>
                          <img
                            src={logo.src}
                            alt={logo.alt}
                            className="h-16 w-auto object-contain filter grayscale opacity-60 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-300 ease-out group-hover:scale-110"
                            draggable={false}
                          />
                        </a>
                      ) : (
                        <img
                          src={logo.src}
                          alt={logo.alt}
                          className="h-16 w-auto object-contain filter grayscale opacity-60 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-300 ease-out group-hover:scale-110"
                          draggable={false}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
        
        {/* CTA section */}
        <section className="text-center mb-12">
          <div className="card max-w-3xl mx-auto p-12">
            <h2 className="h2 mb-6 uppercase">Ready to Explore?</h2>
            <p className="body-l mb-10">
              Explore our collection of AI-generated apps created by developers during 60-minute sprints.
              Try them out, vote, and even submit your own creation!
            </p>
            
            <div className="flex flex-wrap gap-4 justify-center">
              <Link to="/games" className="btn btn-primary">
                Explore Apps
              </Link>
              <Link to="/my-team" className="btn btn-ghost">
                Submit Your App
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default HomePage;
