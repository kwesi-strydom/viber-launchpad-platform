const Footer = () => {
  return (
    <footer className="bg-background border-t border-border py-10">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex flex-col items-center md:items-start text-center md:text-left">
            <img
              src="/viber-logo.png"
              alt="Viber"
              className="h-10 w-auto object-contain mb-2"
            />
            <p className="text-sm font-mono text-ink-300 uppercase tracking-widest">
              Everyone can build
            </p>
          </div>
          
          <div className="flex items-center space-x-6">
            <a
              href="https://x.com/viberlive"
              target="_blank"
              rel="noopener noreferrer"
              className="text-ink-300 hover:text-foreground transition-colors flex items-center gap-2 font-mono text-sm uppercase tracking-wider"
              aria-label="Follow us on X"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" xmlns="http://www.w3.org/2000/svg">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
              @viberlive
            </a>
          </div>
        </div>
        
        <div className="mt-10 pt-6 border-t border-border text-center md:text-left flex flex-col md:flex-row justify-between items-center">
          <p className="font-mono text-xs text-ink-400 uppercase tracking-widest mb-4 md:mb-0">
            © {new Date().getFullYear()} Viber Live
          </p>
          <div className="flex gap-4">
             {/* Links can go here in the future */}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;