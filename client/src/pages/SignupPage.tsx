import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

const SignupPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    userType: 'spectator' as 'competitor' | 'spectator',
    teamName: '',
    teammate: '',
    teammateEmail: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          userType: formData.userType,
          teamName: formData.teamName,
          teammate: formData.teammate,
          teammateEmail: formData.teammateEmail
        }),
      });

      if (response.ok) {
        const data = await response.json();
        
        toast({
          title: "Account Created!",
          description: "Welcome to Vibecoding Championship!",
        });
        
        if (formData.userType === 'competitor') {
          window.location.href = '/competitors';
        } else {
          window.location.href = '/spectators';
        }
      } else {
        const error = await response.json();
        toast({
          title: "Signup Failed",
          description: error.message || "Something went wrong",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="arena-wrap min-h-screen flex items-center justify-center py-16">
      <div className="w-full max-w-md">
        <h1 className="display mb-10 text-center text-[2.5rem] md:text-[3rem]">Sign Up</h1>
        
        <form onSubmit={handleSubmit} className="card">
          <div className="field mb-6">
            <label>I am a*</label>
            <select
              name="userType"
              value={formData.userType}
              onChange={handleChange}
              required
            >
              <option value="spectator">Spectator</option>
              <option value="competitor">Competitor</option>
            </select>
          </div>

          <div className="field mb-6">
            <label>Name*</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Enter your name"
              required
            />
          </div>
          
          <div className="field mb-6">
            <label>Email*</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter your email"
              required
            />
          </div>

          {formData.userType === 'competitor' && (
            <>
              <div className="field mb-6">
                <label>Team Name*</label>
                <input
                  type="text"
                  name="teamName"
                  value={formData.teamName}
                  onChange={handleChange}
                  placeholder="e.g., Team One, Team Two..."
                  required
                />
              </div>
              
              <div className="field mb-6">
                <label>Teammate Name</label>
                <input
                  type="text"
                  name="teammate"
                  value={formData.teammate}
                  onChange={handleChange}
                  placeholder="Your teammate's name (optional)"
                />
              </div>
              
              <div className="field mb-6">
                <label>Teammate Email</label>
                <input
                  type="email"
                  name="teammateEmail"
                  value={formData.teammateEmail}
                  onChange={handleChange}
                  placeholder="Your teammate's email (optional)"
                />
              </div>
            </>
          )}
          
          <div className="field mb-6">
            <label>Password*</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Create a password"
              required
            />
          </div>
          
          <div className="field mb-8">
            <label>Confirm Password*</label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Confirm your password"
              required
            />
          </div>
          
          <div className="flex justify-center mb-6">
            <button 
              type="submit"
              className="btn btn-primary w-full"
              disabled={isLoading}
            >
              {isLoading ? 'Creating Account...' : 'Sign Up'}
            </button>
          </div>
          
          <div className="text-center mt-6 pt-6 border-t border-border">
            <p className="text-muted-foreground mb-4">Already have an account?</p>
            <Link to="/login" className="btn btn-ghost w-full">
              Login
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SignupPage;
