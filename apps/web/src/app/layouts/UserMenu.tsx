import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router';
import { ChevronDown, LogOut, Shield, UserRound } from 'lucide-react';
import { useAuth } from '@/features/auth/AuthProvider';
import { authService } from '@/features/auth/authService';
import { Avatar } from '@/shared/ui';

export function UserMenu() {
  const { profile, isAdmin, isMesario } = useAuth();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const name = profile?.displayName ?? 'Torcedor';

  useEffect(() => setOpen(false), [location.pathname]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const item = 'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-semibold hover:bg-gray-800';

  return (
    <div ref={box} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 hover:bg-gray-800"
      >
        <Avatar name={name} src={profile?.photoURL} size="sm" />
        <span className="hidden max-w-28 truncate text-sm font-semibold sm:block">{name}</span>
        <ChevronDown className="size-4 text-gray-500" />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-full z-50 mt-2 w-52 rounded-xl border border-gray-800 bg-gray-950 p-1.5 shadow-xl animate-pop">
          <Link to="/perfil" role="menuitem" className={`${item} text-gray-200`}>
            <UserRound className="size-4" />
            Meu perfil
          </Link>
          {(isAdmin || isMesario) && (
            <Link to={isAdmin ? '/admin' : '/admin/jogos'} role="menuitem" className={`${item} text-purple-300`}>
              <Shield className="size-4" />
              Painel
            </Link>
          )}
          <button role="menuitem" onClick={() => authService.signOut().then(() => setOpen(false))} className={`${item} text-gray-400`}>
            <LogOut className="size-4" />
            Sair
          </button>
        </div>
      )}
    </div>
  );
}
