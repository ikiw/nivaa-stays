import { useEffect, useState, useCallback } from 'react';

// window.NivaaAuth is provided by the shared /js/auth.js (loaded from index.html).
interface NivaaAuth {
  isAdmin(): boolean;
  getEmail(): string;
  getName(): string;
  logout(): void;
  renderSignInButton(containerId: string, options?: Record<string, unknown>): void;
  ADMIN_EMAIL: string;
}
declare global {
  interface Window { NivaaAuth?: NivaaAuth; }
}

export interface AuthState {
  ready: boolean;      // auth.js loaded
  email: string;
  name: string;
  isAdmin: boolean;
  adminEmail: string;
}

function read(): AuthState {
  const a = window.NivaaAuth;
  return {
    ready: !!a,
    email: a ? a.getEmail() : '',
    name: a ? a.getName() : '',
    isAdmin: a ? a.isAdmin() : false,
    adminEmail: a ? a.ADMIN_EMAIL : '',
  };
}

export function useAuth() {
  const [state, setState] = useState<AuthState>(read);

  useEffect(() => {
    const onChange = () => setState(read());
    window.addEventListener('nivaa-auth-change', onChange);
    // auth.js can finish loading after React mounts — poll briefly until it's there.
    let tries = 0;
    const iv = window.setInterval(() => {
      if (window.NivaaAuth) { setState(read()); clearInterval(iv); }
      else if (++tries > 60) clearInterval(iv);
    }, 100);
    return () => { window.removeEventListener('nivaa-auth-change', onChange); clearInterval(iv); };
  }, []);

  const renderSignInButton = useCallback((id: string) => {
    window.NivaaAuth?.renderSignInButton(id);
  }, []);
  const logout = useCallback(() => { window.NivaaAuth?.logout(); }, []);

  return { ...state, renderSignInButton, logout };
}
