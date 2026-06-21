import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './landing.css';
import landingHtml from './landing.html?raw';

const LandingPage = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Intercept internal links so navigation stays within the SPA (the launchpad).
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleClick = (e: MouseEvent) => {
      // Respect modified clicks (open in new tab/window, download, etc.).
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
        return;
      }
      const anchor = (e.target as HTMLElement).closest('a');
      if (!anchor) return;
      // Honor explicit anchor intent (new tab, downloads).
      if (anchor.target && anchor.target !== '_self') return;
      if (anchor.hasAttribute('download')) return;
      const href = anchor.getAttribute('href');
      if (!href) return;
      // Internal app route (e.g. /games) -> client-side navigation.
      // In-page anchors (#...) and external links keep default behavior.
      if (href.startsWith('/') && !href.startsWith('//')) {
        e.preventDefault();
        navigate(href);
      }
    };

    el.addEventListener('click', handleClick);
    return () => el.removeEventListener('click', handleClick);
  }, [navigate]);

  // Port the original landing-page scripts, scoped to this container.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const cleanups: Array<() => void> = [];

    // Sticky nav
    const nav = el.querySelector<HTMLElement>('#nav');
    if (nav) {
      const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 30);
      onScroll();
      window.addEventListener('scroll', onScroll, { passive: true });
      cleanups.push(() => window.removeEventListener('scroll', onScroll));
    }

    // Mobile menu
    const toggle = el.querySelector<HTMLElement>('#navToggle');
    const links = el.querySelector<HTMLElement>('#navlinks');
    if (toggle && links) {
      const onToggle = () => links.classList.toggle('open');
      toggle.addEventListener('click', onToggle);
      cleanups.push(() => toggle.removeEventListener('click', onToggle));
      const closers: Array<{ a: HTMLAnchorElement; fn: () => void }> = [];
      links.querySelectorAll('a').forEach((a) => {
        const fn = () => links.classList.remove('open');
        a.addEventListener('click', fn);
        closers.push({ a, fn });
      });
      cleanups.push(() => closers.forEach(({ a, fn }) => a.removeEventListener('click', fn)));
    }

    // Reveal on scroll
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    el.querySelectorAll('.reveal').forEach((node) => io.observe(node));
    cleanups.push(() => io.disconnect());

    // Countdown to V5
    const target = new Date('2026-06-20T18:00:00+08:00').getTime();
    const pad = (n: number) => String(n).padStart(2, '0');
    const elD = el.querySelector('#cdD');
    const elH = el.querySelector('#cdH');
    const elM = el.querySelector('#cdM');
    const elS = el.querySelector('#cdS');
    const badge = el.querySelector('#cdBadge');
    let interval: ReturnType<typeof setInterval> | undefined;
    if (elD && elH && elM && elS) {
      const tick = () => {
        const diff = target - Date.now();
        if (diff <= 0) {
          elD.textContent = '00';
          elH.textContent = '00';
          elM.textContent = '00';
          elS.textContent = '00';
          if (badge) badge.textContent = 'Live now';
          return;
        }
        elD.textContent = pad(Math.floor(diff / 86400000));
        elH.textContent = pad(Math.floor((diff % 86400000) / 3600000));
        elM.textContent = pad(Math.floor((diff % 3600000) / 60000));
        elS.textContent = pad(Math.floor((diff % 60000) / 1000));
      };
      tick();
      interval = setInterval(tick, 1000);
      cleanups.push(() => clearInterval(interval));
    }

    // Stat count-up
    const rafIds = new Set<number>();
    const cio = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const node = entry.target as HTMLElement;
          const end = Number(node.dataset.count || 0);
          const suffix = node.dataset.suffix || '';
          const dur = 1400;
          const t0 = performance.now();
          const step = (t: number) => {
            const p = Math.min(1, (t - t0) / dur);
            const val = Math.floor((1 - Math.pow(1 - p, 3)) * end);
            node.textContent = val.toLocaleString() + (p === 1 ? suffix : '');
            if (p < 1) rafIds.add(requestAnimationFrame(step));
          };
          rafIds.add(requestAnimationFrame(step));
          cio.unobserve(node);
        });
      },
      { threshold: 0.5 }
    );
    el.querySelectorAll<HTMLElement>('[data-count]').forEach((c) => cio.observe(c));
    cleanups.push(() => {
      cio.disconnect();
      rafIds.forEach((id) => cancelAnimationFrame(id));
    });

    return () => cleanups.forEach((fn) => fn());
  }, []);

  return (
    <div
      ref={containerRef}
      className="viber-landing"
      dangerouslySetInnerHTML={{ __html: landingHtml }}
    />
  );
};

export default LandingPage;
