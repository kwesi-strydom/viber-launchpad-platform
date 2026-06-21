import { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';

interface LayoutProps {
  children: ReactNode;
}

const HIDE_NAV_ROUTES = ['/', '/admin/team-randomizer', '/admin/wheel-of-destiny'];

const Layout = ({ children }: LayoutProps) => {
  const location = useLocation();
  const hideNav = HIDE_NAV_ROUTES.includes(location.pathname);
  const hideFooter = hideNav || location.pathname.startsWith('/team/');

  return (
    <div className="flex flex-col min-h-[100dvh] w-full overflow-x-hidden bg-background text-foreground">
      {!hideNav && <Navbar />}
      <main className="flex-grow w-full flex flex-col">
        {children}
      </main>
      {!hideFooter && <Footer />}
    </div>
  );
};

export default Layout;