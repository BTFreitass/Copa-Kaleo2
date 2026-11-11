import { useEffect } from 'react';
import { useAuth } from '@/features/auth/AuthProvider';
import { useTournament } from '@/features/tournament/TournamentProvider';

export function useFavoriteTheme() {
  const { profile } = useAuth();
  const { teamsById } = useTournament();
  const team = profile?.favoriteTeamId ? teamsById.get(profile.favoriteTeamId) : undefined;

  useEffect(() => {
    const root = document.documentElement;
    if (team) {
      root.style.setProperty('--color-purple-600', team.primaryColor);
      root.style.setProperty('--color-pink-600', team.secondaryColor || team.primaryColor);
    } else {
      root.style.removeProperty('--color-purple-600');
      root.style.removeProperty('--color-pink-600');
    }
  }, [team]);
}
