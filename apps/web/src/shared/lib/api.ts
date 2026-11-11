import { callable } from './firebase';

export const api = {
  rotateCheckinToken: callable<{ matchId: string }, { token: string; validUntil: number }>('rotateCheckinToken'),
  checkIn: callable<{ matchId: string; token: string }, { already: boolean }>('checkIn'),
  createLeague: callable<{ name: string; tournamentId: string }, { leagueId: string; inviteCode: string }>('createLeague'),
  joinLeague: callable<{ code: string }, { leagueId: string }>('joinLeague'),
  openPack: callable<{ packId: string }, { contents: string[] }>('openPack'),
  acceptTrade: callable<{ tradeId: string }, { ok: boolean }>('acceptTrade'),
  redeemCoupon: callable<{ couponId: string }, { code: string }>('redeemCoupon'),
  setRole: callable<{ email: string; role: 'admin' | 'mesario'; value: boolean }, { uid: string }>('setRole'),
  syncStickers: callable<{ tournamentId: string }, { total: number }>('syncStickers'),
  registerPushToken: callable<{ token: string; teamId?: string | null }, { ok: boolean }>('registerPushToken'),
  finishTournament: callable<
    { tournamentId: string; revelationTeamId?: string | null; championTeamId?: string | null },
    { medals: number; medalCounts: Record<string, number> }
  >('finishTournament'),
  generateMatchDraft: callable<{ matchId: string }, { postId: string; usedAi: boolean }>('generateMatchDraft'),
  shiftSchedule: callable<{ tournamentId: string; minutes: number }, { shifted: number }>('shiftSchedule'),
};

export function errorMessage(error: unknown) {
  if (error && typeof error === 'object' && 'message' in error) {
    const message = String((error as { message: string }).message);
    if (message.includes('permission')) return 'Você não tem permissão para isso.';
    return message.replace(/^Firebase:\s*/, '').replace(/\s*\(.*\)\.?$/, '');
  }
  return 'Algo deu errado. Tente novamente.';
}
