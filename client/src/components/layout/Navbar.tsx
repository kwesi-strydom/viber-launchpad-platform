import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Menu, LogOut, User, Radio, Trophy, Users } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="sticky top-0 z-50 py-4 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="container mx-auto px-4 flex justify-between items-center">
        <NavLink 
          to="/" 
          className="flex items-center hover:opacity-80 transition-opacity cursor-pointer"
          aria-label="Go to home page"
        >
          <img
            src="/viber-logo.png"
            alt="Viber"
            className="h-10 w-auto object-contain"
          />
        </NavLink>
        
        {/* Mobile menu button */}
        <button 
          className="lg:hidden p-2 rounded-md hover:bg-ink-800 transition-colors"
          onClick={toggleMenu}
        >
          <Menu className="text-foreground" />
        </button>
        
        {/* Desktop menu */}
        <div className="hidden lg:flex space-x-6 items-center">
          <NavLink 
            to="/" 
            className={({ isActive }) => 
              isActive 
                ? "btn btn-primary"
                : "btn btn-ghost"
            }
          >
            Home
          </NavLink>
          <NavLink 
            to="/games" 
            className={({ isActive }) => 
              isActive ? "btn btn-solid" : "btn btn-ghost"
            }
          >
            Apps
          </NavLink>
          <NavLink 
            to="/dashboard" 
            className={({ isActive }) => 
              isActive ? "btn btn-solid" : "btn btn-ghost"
            }
          >
            <Radio size={14} className="mr-2 text-pos" />
            Live
          </NavLink>
          <NavLink 
            to="/winners" 
            className={({ isActive }) => 
              isActive ? "btn btn-solid" : "btn btn-ghost"
            }
          >
            <Trophy size={14} className="mr-2" style={{ color: '#f9a826' }} />
            Winners
          </NavLink>
          <NavLink 
            to="/roster" 
            className={({ isActive }) => 
              isActive ? "btn btn-solid" : "btn btn-ghost"
            }
          >
            <Users size={14} className="mr-2 text-primary" />
            Competitors
          </NavLink>
          {user?.isAdmin && (
            <NavLink 
              to="/leaderboard" 
              className={({ isActive }) => 
                isActive 
                  ? "btn btn-solid" 
                  : "btn btn-ghost"
              }
            >
              Leaderboard
            </NavLink>
          )}
          
          {/* Auth buttons */}
          <div className="flex items-center space-x-4 pl-4 border-l border-border">
            {isAuthenticated ? (
              <div className="flex items-center space-x-4">
                <div className="flex items-center text-foreground">
                  <User size={16} className="mr-2 text-primary" />
                  <span className="text-sm font-bold uppercase tracking-wider">{user?.teamName || user?.name}</span>
                </div>
                <button 
                  onClick={handleLogout} 
                  className="btn btn-ghost"
                >
                  <LogOut size={14} className="mr-2" />
                  Logout
                </button>
              </div>
            ) : (
              <NavLink to="/login" className="btn btn-primary">
                Login
              </NavLink>
            )}
          </div>
        </div>
      </div>
      
      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-background/95 backdrop-blur-sm pt-20 h-screen w-screen border-t border-border">
          <div className="px-6 py-4 flex flex-col space-y-4 items-center">
            <NavLink 
              to="/" 
              className="btn btn-ghost w-full justify-center text-lg"
              onClick={() => setIsMenuOpen(false)}
            >
              Home
            </NavLink>
            <NavLink 
              to="/games" 
              className="btn btn-ghost w-full justify-center text-lg"
              onClick={() => setIsMenuOpen(false)}
            >
              Apps
            </NavLink>
            <NavLink 
              to="/dashboard" 
              className="btn btn-ghost w-full justify-center text-lg"
              onClick={() => setIsMenuOpen(false)}
            >
              <Radio size={18} className="mr-2 text-pos" />
              Live
            </NavLink>
            <NavLink 
              to="/winners" 
              className="btn btn-ghost w-full justify-center text-lg"
              onClick={() => setIsMenuOpen(false)}
            >
              <Trophy size={18} className="mr-2" style={{ color: '#f9a826' }} />
              Winners
            </NavLink>
            <NavLink 
              to="/roster" 
              className="btn btn-ghost w-full justify-center text-lg"
              onClick={() => setIsMenuOpen(false)}
            >
              <Users size={18} className="mr-2 text-primary" />
              Competitors
            </NavLink>
            {user?.isAdmin && (
              <NavLink 
                to="/leaderboard" 
                className="btn btn-ghost w-full justify-center text-lg"
                onClick={() => setIsMenuOpen(false)}
              >
                Leaderboard
              </NavLink>
            )}
            
            {/* Mobile auth buttons */}
            <div className="border-t border-border pt-6 mt-4 w-full flex flex-col items-center">
              {isAuthenticated ? (
                <div className="space-y-4 w-full flex flex-col items-center">
                  <div className="flex items-center justify-center text-foreground mb-2">
                    <User size={18} className="mr-2 text-primary" />
                    <span className="font-bold uppercase tracking-wider">{user?.teamName || user?.name}</span>
                  </div>
                  <button 
                    onClick={() => {
                      handleLogout();
                      setIsMenuOpen(false);
                    }}
                    className="btn btn-ghost w-full justify-center text-lg"
                  >
                    <LogOut size={16} className="mr-2" />
                    Logout
                  </button>
                </div>
              ) : (
                <div className="space-y-4 w-full">
                  <NavLink 
                    to="/login" 
                    className="btn btn-primary w-full justify-center text-lg"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Login
                  </NavLink>
                </div>
              )}
            </div>
            
            <button 
              className="mt-8 btn w-full justify-center text-ink-400 hover:text-foreground"
              onClick={() => setIsMenuOpen(false)}
            >
              Close Menu
            </button>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;