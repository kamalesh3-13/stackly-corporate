/**
 * Stackly Corporate Solutions - Authentication Module
 * No uniqueness checks — allow repeated sign up/in with same details.
 */

const Auth = (() => {
  const USERS_KEY = 'stackly_corp_users';
  const SESSION_KEY = 'stackly_corp_session';
  const REMEMBER_KEY = 'stackly_corp_remember';

  const normalizeLoginId = (value) => String(value || '').trim().toLowerCase();
  const normalizePassword = (value) => String(value ?? '');

  /* ── Password strength validator (shared by signup & login) ──
     Rule: at least 12 characters, uppercase, lowercase,
           number, and special character all required.   */
  const validatePasswordStrength = (password) => {
    if (password.length < 12) {
      return 'Password must be at least 12 characters long.';
    }
    if (!/[A-Z]/.test(password)) {
      return 'Password must contain at least one uppercase letter (A-Z).';
    }
    if (!/[a-z]/.test(password)) {
      return 'Password must contain at least one lowercase letter (a-z).';
    }
    if (!/[0-9]/.test(password)) {
      return 'Password must contain at least one number (0-9).';
    }
    if (!/[^a-zA-Z0-9]/.test(password)) {
      return 'Password must contain at least one special character (e.g. @, #, $, !, %).';
    }
    return null; // null = valid
  };

  const getUsers = () => {
    try {
      return JSON.parse(localStorage.getItem(USERS_KEY)) || [];
    } catch {
      return [];
    }
  };

  const saveUsers = (users) => {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  };

  /* ── Ensure demo users exist ── */
  const ensureDemoUsers = () => {
    let users = getUsers();
    const demos = [
      { id: 'demo-admin',    fullName: 'Corp Admin',    role: 'admin',    email: 'admin@stacklycorp.com',    phone: '', password: 'admin123', createdAt: new Date().toISOString() },
      { id: 'demo-customer', fullName: 'Demo Employee', role: 'customer', email: 'employee@stacklycorp.com', phone: '', password: 'employ123', createdAt: new Date().toISOString() }
    ];
    let changed = false;
    demos.forEach((d) => {
      if (!users.some((u) => u.id === d.id)) {
        users.push({ ...d });
        changed = true;
      }
    });
    if (changed) saveUsers(users);
  };
  ensureDemoUsers();

  /* ── Session helpers ── */
  const getSession = () => {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY)); }
    catch { return null; }
  };

  const setSession = (user) => {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  };

  const clearSession = () => {
    localStorage.removeItem(SESSION_KEY);
  };

  /* ══════════════════════════════════════════════
     SIGN UP
  ══════════════════════════════════════════════ */
  const signup = ({ fullName, role, email, phone, password }) => {
    const errors = [];
    const loginId = normalizeLoginId(email);
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!fullName || !fullName.trim()) errors.push('Please enter your name.');
    if (!role || !['admin', 'customer'].includes(role)) errors.push('Please select Admin or Customer.');
    if (!loginId) {
      errors.push('Please enter an email address.');
    } else if (!emailRegex.test(loginId)) {
      errors.push('Please enter a valid email format (e.g. name@example.com).');
    }

    if (!password || !password.trim()) {
      errors.push('Please enter a password.');
    } else {
      const pwError = validatePasswordStrength(password);
      if (pwError) errors.push(pwError);
    }

    if (errors.length) return { success: false, errors };

    const user = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2),
      fullName: fullName.trim(),
      role,
      email: loginId,
      phone: (phone || '').trim(),
      password: normalizePassword(password),
      createdAt: new Date().toISOString()
    };

    const users = getUsers();
    users.push(user);
    saveUsers(users);

    // Do NOT set a session — user must sign in after signing up
    return { success: true, user: { fullName: user.fullName, email: user.email, role: user.role } };
  };

  /* ══════════════════════════════════════════════
     SIGN IN
  ══════════════════════════════════════════════ */
  const login = ({ role, email, password, remember }) => {
    const errors = [];
    const loginId = normalizeLoginId(email);
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!role || !['admin', 'customer'].includes(role)) errors.push('Please select Admin or Customer.');
    if (!loginId) {
      errors.push('Please enter an email address.');
    } else if (!emailRegex.test(loginId)) {
      errors.push('Please enter a valid email format (e.g. name@example.com).');
    }

    if (!password || !password.trim()) {
      errors.push('Please enter your password.');
    } else {
      const pwError = validatePasswordStrength(password);
      if (pwError) errors.push(pwError);
    }

    if (errors.length) return { success: false, errors };

    // Find existing user only — never auto-create on login
    const user = getUsers().find((u) => u.email === loginId) || null;

    if (!user) {
      return { success: false, errors: ['No account found with that email. Please sign up first.'] };
    }

    // Verify password matches stored password
    if (normalizePassword(password) !== user.password) {
      return { success: false, errors: ['Incorrect password. Please try again.'] };
    }

    const session = {
      id: user.id,
      fullName: user.fullName,
      role: role,
      email: user.email,
      phone: user.phone
    };

    setSession(session);

    if (remember) {
      localStorage.setItem(REMEMBER_KEY, JSON.stringify({ email: user.email, role }));
    } else {
      localStorage.removeItem(REMEMBER_KEY);
    }

    return { success: true, user: session };
  };

  /* ── Logout ── */
  const logout = () => {
    clearSession();
    localStorage.removeItem(REMEMBER_KEY);
    window.location.href = 'login.html';
  };

  /* ── Route protection ── */
  const protectRoute = (requiredRole) => {
    const session = getSession();
    if (!session) {
      window.location.href = 'login.html';
      return null;
    }
    if (requiredRole && session.role !== requiredRole) {
      window.location.href = session.role === 'admin' ? 'admin-dashboard.html' : 'customer-dashboard.html';
      return null;
    }
    return session;
  };

  const getRemembered = () => {
    try { return JSON.parse(localStorage.getItem(REMEMBER_KEY)); }
    catch { return null; }
  };

  const redirectToDashboard = (role) => {
    window.location.href = role === 'admin' ? 'admin-dashboard.html' : 'customer-dashboard.html';
  };

  return {
    signup,
    login,
    logout,
    getSession,
    protectRoute,
    getRemembered,
    redirectToDashboard,
    normalizeLoginId,
    normalizePassword
  };
})();
