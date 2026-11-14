import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { DEFAULT_PALETTE, type Match, type Player, type SiteSettings, type Team, type Tournament } from '@copa/shared';
import { refs, queries } from '@/shared/lib/collections';
import { useCollection, useDocument } from '@/shared/lib/data';
import { setSitePalette } from '@/shared/lib/palette';

interface TournamentState {
  settings: SiteSettings | null;
  tournament: Tournament | null;
  tournamentId: string;
  teams: Team[];
  teamsById: Map<string, Team>;
  players: Player[];
  playersById: Map<string, Player>;
  matches: Match[];
  loading: boolean;
  liveMatch: Match | null;
  nextMatch: Match | null;
}

const TournamentContext = createContext<TournamentState | null>(null);

export function TournamentProvider({ children }: { children: ReactNode }) {
  const settings = useDocument(refs.settings());
  const tournamentId = settings.data?.activeTournamentId ?? '';
  const tournament = useDocument(tournamentId ? refs.tournament(tournamentId) : null);
  const teams = useCollection(tournamentId ? queries.teams(tournamentId) : null);
  const players = useCollection(tournamentId ? queries.players(tournamentId) : null);
  const matches = useCollection(tournamentId ? queries.matches(tournamentId) : null);
  const palette = settings.data?.palette ?? DEFAULT_PALETTE;

  useEffect(() => {
    if (!settings.loading && !settings.error) setSitePalette(palette);
  }, [settings.loading, settings.error, palette]);

  const value = useMemo<TournamentState>(() => {
    const live = matches.data.find((m) => m.status === 'live' || m.status === 'halftime') ?? null;
    const next = matches.data.find((m) => m.status === 'scheduled') ?? null;
    return {
      settings: settings.data,
      tournament: tournament.data,
      tournamentId,
      teams: [...teams.data].sort((a, b) => a.name.localeCompare(b.name)),
      teamsById: new Map(teams.data.map((t) => [t.id, t])),
      players: players.data,
      playersById: new Map(players.data.map((p) => [p.id, p])),
      matches: matches.data,
      loading: settings.loading || tournament.loading || matches.loading,
      liveMatch: live,
      nextMatch: next,
    };
  }, [settings.data, settings.loading, tournament.data, tournament.loading, tournamentId, teams.data, players.data, matches.data, matches.loading]);

  return <TournamentContext.Provider value={value}>{children}</TournamentContext.Provider>;
}

export function useTournament() {
  const ctx = useContext(TournamentContext);
  if (!ctx) throw new Error('useTournament fora do TournamentProvider');
  return ctx;
}
