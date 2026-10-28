import { UserProfile, CURRENT_USER } from '../mock';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  username?: string;
  avatar?: string;
  city?: string;
  state?: string;
  bio?: string;
  memberSince?: string;
  hasBusiness?: boolean;
  businessId?: string;
}

export interface AuthSession {
  user: AuthUser;
  token: string;
  expiresAt: number;
}

export interface SignInCredentials {
  email: string;
  password: string;
}

export interface SignUpData {
  name: string;
  email: string;
  password: string;
  confirmPassword?: string;
  referralCode?: string;
}

export interface AuthResult {
  success: boolean;
  user?: AuthUser;
  session?: AuthSession;
  error?: string;
}

// In-memory mock database for authentication accounts
const MOCK_REGISTERED_USERS: Array<{
  user: AuthUser;
  passwordHash: string;
}> = [
  {
    user: {
      id: 'user-me',
      name: CURRENT_USER.name,
      email: CURRENT_USER.email,
      phone: CURRENT_USER.phone,
      username: CURRENT_USER.username,
      avatar: CURRENT_USER.avatar,
      city: CURRENT_USER.city,
      state: CURRENT_USER.state,
      bio: CURRENT_USER.bio,
      memberSince: CURRENT_USER.memberSince,
      hasBusiness: CURRENT_USER.hasBusiness,
      businessId: CURRENT_USER.businessId,
    },
    passwordHash: 'Supporters@2026',
  },
];

// Active mock session reference
let currentSession: AuthSession | null = null;

/**
 * Validates whether a string matches a standard email format.
 */
export function validateEmail(email: string): boolean {
  const trimmed = email.trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(trimmed);
}

/**
 * Validates password criteria: minimum 6 characters.
 */
export function validatePassword(password: string): { isValid: boolean; message?: string } {
  if (!password || password.length < 6) {
    return { isValid: false, message: 'Password must be at least 6 characters long.' };
  }
  return { isValid: true };
}

/**
 * Authentication Service Interface & Implementation
 * Encapsulates sign in, sign up, session persistence, and sign out logic.
 */
class AuthService {
  /**
   * Signs in an existing user with email and password credentials.
   */
  async signIn(credentials: SignInCredentials): Promise<AuthResult> {
    // Artificial network latency simulation
    await new Promise((resolve) => setTimeout(resolve, 600));

    const email = credentials.email.trim().toLowerCase();
    const password = credentials.password;

    if (!email) {
      return { success: false, error: 'Please enter your email address.' };
    }

    if (!validateEmail(email)) {
      return { success: false, error: 'Please enter a valid email address.' };
    }

    if (!password) {
      return { success: false, error: 'Please enter your password.' };
    }

    // Match against mock registered accounts or allow demo login
    const matched = MOCK_REGISTERED_USERS.find((u) => u.user.email.toLowerCase() === email);

    if (matched) {
      if (matched.passwordHash !== password) {
        return { success: false, error: 'Invalid password. Please check and try again.' };
      }

      const session: AuthSession = {
        user: matched.user,
        token: `session_token_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
      };

      currentSession = session;
      return { success: true, user: matched.user, session };
    }

    // If account doesn't exist in registered users
    return {
      success: false,
      error:
        'No account found with this email. Please check your credentials or create an account.',
    };
  }

  /**
   * Registers a new user account.
   */
  async signUp(data: SignUpData): Promise<AuthResult> {
    await new Promise((resolve) => setTimeout(resolve, 750));

    const name = data.name.trim();
    const email = data.email.trim().toLowerCase();
    const password = data.password;

    if (!name || name.length < 2) {
      return { success: false, error: 'Please enter your full name.' };
    }

    if (!email || !validateEmail(email)) {
      return { success: false, error: 'Please enter a valid business email address.' };
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return { success: false, error: passwordValidation.message };
    }

    // Check for duplicate registered email
    const existing = MOCK_REGISTERED_USERS.find((u) => u.user.email.toLowerCase() === email);
    if (existing) {
      return {
        success: false,
        error: 'An account with this email address already exists. Please sign in instead.',
      };
    }

    // Create user profile
    const username =
      name.toLowerCase().replace(/\s+/g, '_') + Math.floor(Math.random() * 900 + 100);
    const newUser: AuthUser = {
      id: `user-${Date.now()}`,
      name,
      email,
      username,
      avatar:
        'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=300&auto=format&fit=crop&q=80',
      city: 'Ahmedabad',
      state: 'Gujarat',
      phone: '+91 98000 00000',
      bio: 'Verified business member on Supporters platform.',
      memberSince: 'Just now',
      hasBusiness: false,
    };

    MOCK_REGISTERED_USERS.push({
      user: newUser,
      passwordHash: password,
    });

    const session: AuthSession = {
      user: newUser,
      token: `session_token_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
    };

    currentSession = session;
    return { success: true, user: newUser, session };
  }

  /**
   * Dispatches a password recovery request for the provided email.
   */
  async forgotPassword(email: string): Promise<AuthResult> {
    await new Promise((resolve) => setTimeout(resolve, 600));

    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !validateEmail(trimmed)) {
      return { success: false, error: 'Please provide a valid email address.' };
    }

    return {
      success: true,
    };
  }

  /**
   * Simulates OAuth Google Workspace sign-in.
   */
  async googleSignIn(): Promise<AuthResult> {
    await new Promise((resolve) => setTimeout(resolve, 800));

    const googleUser: AuthUser = {
      id: 'google-user-1',
      name: CURRENT_USER.name,
      email: CURRENT_USER.email,
      phone: CURRENT_USER.phone,
      username: CURRENT_USER.username,
      avatar: CURRENT_USER.avatar,
      city: CURRENT_USER.city,
      state: CURRENT_USER.state,
      bio: CURRENT_USER.bio,
      memberSince: CURRENT_USER.memberSince,
      hasBusiness: true,
      businessId: CURRENT_USER.businessId,
    };

    const session: AuthSession = {
      user: googleUser,
      token: `google_oauth_token_${Date.now()}`,
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
    };

    currentSession = session;
    return { success: true, user: googleUser, session };
  }

  /**
   * Signs out the currently authenticated user session.
   */
  async signOut(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 200));
    currentSession = null;
  }

  /**
   * Restores an existing session if active and not expired.
   */
  async restoreSession(): Promise<AuthSession | null> {
    if (currentSession && currentSession.expiresAt > Date.now()) {
      return currentSession;
    }
    return null;
  }

  /**
   * Synchronous check for active session.
   */
  getCurrentSession(): AuthSession | null {
    return currentSession;
  }
}

export const authService = new AuthService();
