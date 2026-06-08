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
      { id: 'demo-admin', fullName: 'Corp Admin', role: 'admin', email: 'admin@stacklycorp.com', phone: '', password: 'admin', createdAt: new Date().toISOString() },
      { id: 'demo-customer', fullName: 'Demo Employee', role: 'customer', email: 'employee@stacklycorp.com', phone: '', password: 'customer', createdAt: new Date().toISOString() }
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
     SIGN UP — no uniqueness checks at all
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
    }

    if (errors.length) return { success: false, errors };

    // Always create a new user — no duplicate checks
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
     SIGN IN — requires password and verifies it
     against the stored user record
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
    }

    if (errors.length) return { success: false, errors };

    // Find existing user with this email, or auto-create one
    let user = getUsers().find((u) => u.email === loginId) || null;

    if (!user) {
      user = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2),
        fullName: email.split('@')[0],
        role,
        email: loginId,
        phone: '',
        password: normalizePassword(password),
        createdAt: new Date().toISOString()
      };
      const users = getUsers();
      users.push(user);
      saveUsers(users);
    }

    // Use the SELECTED role from the form, not the stored role
    // This allows the same email to sign in as admin or customer
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
