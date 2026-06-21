import { Request, Response } from 'express';
import { storage } from './storage';

export const signup = async (req: Request, res: Response) => {
  try {
    const { name, email, password, userType, teamName, teammate, teammateEmail } = req.body;
    const userAgent = req.get('User-Agent') || '';
    const isMobile = /Mobile|Android|iPhone|iPad/.test(userAgent);
    
    console.log('=== SIGNUP DEBUG START ===');
    console.log('Email:', email);
    console.log('Password length:', password ? password.length : 0);
    console.log('User-Agent:', userAgent);
    console.log('Is mobile device:', isMobile);
    console.log('User type:', userType);
    
    // Check if user already exists
    const existingUser = await storage.getUserByEmail(email);
    if (existingUser) {
      console.log('❌ USER ALREADY EXISTS:', email);
      return res.status(400).json({ message: 'User already exists with this email' });
    }
    
    console.log('✓ Creating new user...');
    
    // Create user with plain text password for now (to match existing users)
    const user = await storage.createUser({
      name,
      email,
      password, // Keep as plain text for consistency with existing users
      userType,
      teamName,
      teammate,
      teammateEmail
    });
    
    console.log('✓ USER CREATED:', { id: user.id, email: user.email, userType: user.userType });
    
    // Create session
    const sessionId = Math.random().toString(36).substr(2, 9);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    await storage.createSession(sessionId, user.id, expiresAt);
    
    // Set session cookie with mobile compatibility
    const signupCookieOptions = {
      httpOnly: false, // Allow JavaScript access for debugging
      secure: false, // Set to true in production with HTTPS
      sameSite: 'lax' as const,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      path: '/'
    };
    
    res.cookie('sessionId', sessionId, signupCookieOptions);
    
    const { password: _, ...userWithoutPassword } = user;
    res.json({ user: userWithoutPassword });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const userAgent = req.get('User-Agent') || '';
    const isMobile = /Mobile|Android|iPhone|iPad/.test(userAgent);
    const clientIP = req.ip || req.connection.remoteAddress;
    
    console.log('=== MOBILE LOGIN DEBUG START ===');
    console.log('🚨 MOBILE LOGIN ATTEMPT DETECTED - SERVER RECEIVING REQUEST 🚨');
    console.log('Email:', email);
    console.log('Password length:', password ? password.length : 0);
    console.log('Password first 3 chars:', password ? password.substring(0, 3) + '...' : 'undefined');
    console.log('User-Agent:', userAgent);
    console.log('Is mobile device:', isMobile);
    console.log('Client IP:', clientIP);
    console.log('Cookies received:', req.cookies);
    console.log('Request body keys:', Object.keys(req.body));
    console.log('Request body string length:', JSON.stringify(req.body).length);
    console.log('Content-Type:', req.get('Content-Type'));
    console.log('Cache-Control header:', req.get('Cache-Control'));
    console.log('Request timestamp:', new Date().toISOString());
    
    console.log('Searching for user with email:', email);
    
    const user = await storage.getUserByEmail(email);
    if (!user) {
      console.log('❌ USER NOT FOUND for email:', email);
      console.log('Checking database directly for debugging...');
      console.log('=== MOBILE LOGIN DEBUG END (USER NOT FOUND) ===');
      return res.status(401).json({ 
        message: `No account found with email ${email}. Please check your email or sign up first.`,
        debug: isMobile ? { 
          reason: 'user_not_found', 
          email,
          timestamp: new Date().toISOString(),
          url: req.url,
          host: req.get('Host'),
          serverInfo: "Viber Apps Platform - Main Server"
        } : undefined
      });
    }
    
    console.log('✓ USER FOUND:', { id: user.id, email: user.email, userType: user.userType });
    
    // Check password - handle both hashed and plain text for backward compatibility
    let isValidPassword = false;
    
    if (user.password.startsWith('$2')) {
      // Password is hashed with bcrypt
      const bcrypt = require('bcrypt');
      isValidPassword = await bcrypt.compare(password, user.password);
      console.log('Comparing hashed password:', isValidPassword);
    } else {
      // Plain text password (for existing users)
      isValidPassword = user.password === password;
      console.log('Comparing plain text password:', isValidPassword);
    }
    
    if (!isValidPassword) {
      console.log('❌ INVALID PASSWORD for email:', email);
      console.log('Stored password type:', user.password.startsWith('$2') ? 'hashed' : 'plain');
      console.log('Stored password preview:', user.password.substring(0, 10) + '...');
      console.log('Input password preview:', password.substring(0, 3) + '...');
      console.log('=== MOBILE LOGIN DEBUG END (INVALID PASSWORD) ===');
      return res.status(401).json({ 
        message: 'Invalid credentials',
        debug: isMobile ? {
          reason: 'password_mismatch',
          passwordType: user.password.startsWith('$2') ? 'hashed' : 'plain',
          inputLength: password.length,
          storedLength: user.password.length
        } : undefined
      });
    }
    
    console.log('User found, creating session for user ID:', user.id);
    
    // Create session
    const sessionId = Math.random().toString(36).substr(2, 9);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    await storage.createSession(sessionId, user.id, expiresAt);
    
    console.log('Session created with ID:', sessionId);
    
    // Enhanced mobile-friendly cookie settings
    const cookieOptions = { 
      httpOnly: false, // Allow JavaScript access for mobile debugging
      secure: false, // Set to true in production with HTTPS
      sameSite: 'lax' as const, // Better for mobile browsers
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      path: '/',
      ...(isMobile && {
        // Additional mobile-specific settings
        httpOnly: false, // More permissive for mobile
        domain: undefined // Let browser handle domain for mobile
      })
    };
    
    console.log('Setting cookie with options:', cookieOptions);
    res.cookie('sessionId', sessionId, cookieOptions);
    
    const { password: _, ...userWithoutPassword } = user;
    console.log('✓ LOGIN SUCCESSFUL for user:', userWithoutPassword.email);
    console.log('Session ID created:', sessionId);
    console.log('Cookie will be set with path: /', cookieOptions);
    console.log('=== MOBILE LOGIN DEBUG END (SUCCESS) ===');
    
    res.json({ 
      user: userWithoutPassword,
      sessionId: isMobile ? sessionId : undefined, // Send full session ID for mobile debugging
      debug: {
        sessionCreated: true,
        isMobile,
        cookieSet: true,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    res.status(500).json({ 
      message: 'Internal server error',
      debug: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export const logout = async (req: Request, res: Response) => {
  const sessionId = req.cookies.sessionId;
  console.log('Logout attempt with session ID:', sessionId);
  
  if (sessionId) {
    await storage.deleteSession(sessionId);
    console.log('Session deleted:', sessionId);
    
    // Clear cookie with same settings as when it was set
    res.clearCookie('sessionId', {
      httpOnly: false,
      secure: false,
      sameSite: 'lax',
      path: '/'
    });
  }
  
  console.log('Logout completed');
  res.json({ message: 'Logged out successfully' });
};

export const getCurrentUser = async (req: Request, res: Response) => {
  const sessionId = req.cookies.sessionId;
  const session = await storage.getSession(sessionId);
  
  if (!session || session.expires_at < new Date()) {
    return res.status(401).json({ message: 'Not authenticated' });
  }
  
  const user = await storage.getUser(session.user_id);
  if (!user) {
    return res.status(401).json({ message: 'Not authenticated' });
  }
  
  const { password: _, ...userWithoutPassword } = user;
  res.json({ user: userWithoutPassword });
};

export const requireAuth = async (req: Request, res: Response, next: any) => {
  const sessionId = req.cookies.sessionId;
  const session = await storage.getSession(sessionId);
  
  if (!session || session.expires_at < new Date()) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  
  const user = await storage.getUser(session.user_id);
  if (!user) return res.status(401).json({ message: 'Authentication required' });
  (req as any).user = user;
  next();
};