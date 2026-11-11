import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { updateDoc } from 'firebase/firestore';
import { Bell, LogOut, Medal as MedalIcon, Sparkles, Ticket, Trophy } from 'lucide-react';
import { ACTIVITY_LABEL, ALL_ACHIEVEMENTS, MEDAL_LABEL, type ActivityType } from '@copa/shared';
import { useAuth } from '@/features/auth/AuthProvider';
import { authService } from '@/features/auth/authService';
import { useTournament } from '@/features/tournament/TournamentProvider';
import { cols, queries, refs } from '@/shared/lib/collections';
import { useCollection, useDocument } from '@/shared/lib/data';
import { api, errorMessage } from '@/shared/lib/api';
import { Avatar, Badge, Button, Card, EmptyState, Field, Input, PageLoader, Select, Stat, useToast } from '@/shared/ui';
import { cn, formatDate } from '@/shared/utils/format';
import { MedalView } from '@/features/medals/MedalView';
import { enablePush } from '@/features/notifications/push';

export function MyProfilePage() {
  const { user, loading, openLogin } = useAuth();
  if (loading) return <PageLoader />;
  if (!user) return <EmptyState icon={<MedalIcon />} title="Entre para ver seu perfil" action={<Button onClick={openLogin}>Entrar</Button>} />;
  return <ProfileView uid={user.uid} own />;
}

export function PublicProfilePage() {
  const { uid = '' } = useParams();
  const { user } = useAuth();
  return <ProfileView uid={uid} own={user?.uid === uid} />;
}

function ProfileView({ uid, own }: { uid: string; own: boolean }) {
  const { tournamentId, tournament, teams } = useTournament();
  const { openLogin } = useAuth();
  const profile = useDocument(refs.user(uid));
  const edition = useDocument(own && tournamentId ? refs.edition(uid, tournamentId) : null);
  const achievements = useCollection(queries.myAchievements(uid));
  const medals = useCollection(cols.medals(uid));
  const board = useDocument(tournamentId ? refs.leaderboard(tournamentId, uid) : null);
  const [name, setName] = useState('');
  const toast = useToast();

  useEffect(() => setName(profile.data?.displayName ?? ''), [profile.data?.displayName]);
  if (profile.loading) return <PageLoader />;
  if (!profile.data) return <EmptyState title="Perfil não encontrado" />;

  const unlocked = new Set(achievements.data.filter((a) => a.tournamentId === tournamentId).map((a) => a.achievementId));
  const counters = edition.data?.counters ?? {};
  const currentMedal = medals.data.find((m) => m.tournamentId === tournamentId);

  const save = async (patch: Record<string, unknown>) => {
    try {
      await updateDoc(refs.user(uid), patch);
      toast('Perfil atualizado!');
    } catch (error) {
      toast(errorMessage(error), 'error');
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <Card className="flex flex-col items-center gap-4 p-6 sm:flex-row">
        <Avatar name={profile.data.displayName} src={profile.data.photoURL} size="lg" />
        <div className="flex-1 text-center sm:text-left">
          <h1 className="text-2xl font-black text-white">{profile.data.displayName}</h1>
          <p className="text-sm text-gray-400">
            Na torcida desde {formatDate(profile.data.createdAt)}
            {edition.data && ` · Torcedor nº ${String(edition.data.serialNumber).padStart(4, '0')} desta edição`}
          </p>
          {profile.data.isGuest && own && (
            <button onClick={openLogin} className="mt-2 text-sm font-semibold text-yellow-300 underline">Você está como convidado: salve sua conta</button>
          )}
        </div>
        {own && currentMedal && (
          <Link to={`/minha-copa/${tournamentId}`}>
            <Button icon={<Sparkles className="size-4" />}>Minha Copa Kaleo</Button>
          </Link>
        )}
      </Card>

      {own && (
        <div className="grid gap-4 sm:grid-cols-4">
          <Stat label="Pontos Kaleo" value={edition.data?.kaleoPoints ?? 0} icon={<Sparkles />} />
          <Stat label="Pontos no bolão" value={board.data?.totalPoints ?? 0} icon={<Trophy />} />
          <Stat label="Posição" value={board.data?.rank ? `${board.data.rank}º` : '—'} icon={<MedalIcon />} />
          <Stat label="Check-ins" value={counters.checkin ?? 0} icon={<Ticket />} />
        </div>
      )}

      <section>
        <h2 className="mb-3 text-xl font-black">🏅 Vitrine de medalhas</h2>
        {medals.data.length === 0 ? (
          <Card className="p-5 text-sm text-gray-400">
            {own ? (
              <MedalProgress points={edition.data?.kaleoPoints ?? 0} />
            ) : (
              'Ainda sem medalhas.'
            )}
          </Card>
        ) : (
          <div className="flex flex-wrap gap-6">
            {medals.data.sort((a, b) => b.season - a.season).map((m) => (
              <Link key={m.id} to={own ? `/minha-copa/${m.tournamentId}` : '#'}>
                <MedalView medal={m} hidden={own && !m.revealedAt} />
                {own && !m.revealedAt && <p className="mt-1 text-center text-xs font-bold text-pink-300">Toque para revelar!</p>}
              </Link>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-xl font-black">Conquistas · {unlocked.size}/{ALL_ACHIEVEMENTS.length}</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {ALL_ACHIEVEMENTS.map((a) => (
            <div key={a.id} className={cn('rounded-2xl border p-4 text-center', unlocked.has(a.id) ? 'border-purple-500/40 bg-purple-500/10' : 'border-gray-800 opacity-40 grayscale')}>
              <span className="text-3xl">{a.icon}</span>
              <p className="mt-1 text-sm font-bold text-white">{a.name}</p>
              <p className="text-[11px] text-gray-400">{a.description}</p>
            </div>
          ))}
        </div>
      </section>

      {own && (
        <section className="grid gap-6 lg:grid-cols-2">
          <Card className="p-5">
            <h2 className="mb-4 font-black">Configurações</h2>
            <div className="flex flex-col gap-4">
              <Field label="Nome exibido">
                <div className="flex gap-2">
                  <Input value={name} maxLength={60} onChange={(e) => setName(e.target.value)} />
                  <Button variant="secondary" onClick={() => save({ displayName: name.trim() })} disabled={!name.trim() || name === profile.data.displayName}>Salvar</Button>
                </div>
              </Field>
              <Field label="Time do coração" hint="O site ganha as cores do seu time e você recebe alertas dos gols dele.">
                <Select value={profile.data.favoriteTeamId ?? ''} onChange={(e) => save({ favoriteTeamId: e.target.value || null })}>
                  <option value="">Nenhum</option>
                  {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </Select>
              </Field>
              <Button
                variant="secondary"
                icon={<Bell className="size-4" />}
                onClick={async () => {
                  try {
                    await enablePush(profile.data?.favoriteTeamId ?? null);
                    toast('Notificações ativadas!');
                  } catch (error) {
                    toast(errorMessage(error), 'error');
                  }
                }}
              >
                Ativar notificações
              </Button>
              <Button variant="ghost" icon={<LogOut className="size-4" />} onClick={() => authService.signOut()}>Sair</Button>
            </div>
          </Card>
          <Card className="p-5">
            <h2 className="mb-4 font-black">Como ganhei meus Pontos Kaleo</h2>
            <ul className="flex flex-col gap-2 text-sm">
              {(Object.entries(counters) as [ActivityType, number][]).map(([type, count]) => (
                <li key={type} className="flex justify-between">
                  <span className="text-gray-300">{ACTIVITY_LABEL[type]} × {count}</span>
                  <span className="font-bold text-white">+{count * (tournament?.kaleoPointsRules[type] ?? 0)}</span>
                </li>
              ))}
              {Object.keys(counters).length === 0 && <li className="text-gray-500">Faça seu primeiro palpite para começar!</li>}
            </ul>
          </Card>
          <CouponsCard points={edition.data?.kaleoPoints ?? 0} />
        </section>
      )}
    </div>
  );
}

function MedalProgress({ points }: { points: number }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="flex gap-2">
        {(['bronze', 'silver', 'gold', 'legendary'] as const).map((t) => (
          <MedalView key={t} size="sm" medal={{ tier: t, variant: 'fan', season: new Date().getFullYear(), serialNumber: 0, totalAwarded: 0, artUrl: null }} />
        ))}
      </div>
      <p>
        Toda pessoa que participa desta edição recebe a medalha da Copa no encerramento. O nível ({Object.values(MEDAL_LABEL).map((m) => m.name).join(', ')}) depende dos seus Pontos Kaleo. Hoje você tem <strong className="text-white">{points}</strong>.
      </p>
    </div>
  );
}

function CouponsCard({ points }: { points: number }) {
  const { user } = useAuth();
  const { tournamentId } = useTournament();
  const coupons = useCollection(tournamentId ? queries.coupons(tournamentId) : null);
  const mine = useCollection(user ? cols.userCoupons(user.uid) : null);
  const [busy, setBusy] = useState<string | null>(null);
  const toast = useToast();
  if (coupons.data.length === 0) return null;
  const codes = new Map(mine.data.map((c) => [c.id, c.code]));

  return (
    <Card className="p-5 lg:col-span-2">
      <h2 className="mb-4 flex items-center gap-2 font-black"><Ticket className="size-5 text-pink-300" /> Cupons dos patrocinadores</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {coupons.data.map((c) => {
          const code = codes.get(c.id);
          const locked = points < c.minKaleoPoints;
          return (
            <div key={c.id} className="flex items-center gap-3 rounded-xl border border-gray-800 p-3">
              {c.sponsorLogoUrl && <img src={c.sponsorLogoUrl} alt="" className="size-12 rounded-lg object-cover" />}
              <div className="flex-1">
                <p className="font-bold text-white">{c.title}</p>
                <p className="text-xs text-gray-400">{c.sponsorName} · a partir de {c.minKaleoPoints} pts</p>
              </div>
              {code ? (
                <Badge tone="green" className="font-mono">{code}</Badge>
              ) : (
                <Button
                  size="sm"
                  disabled={locked || c.redeemedCount >= c.totalCodes}
                  loading={busy === c.id}
                  onClick={async () => {
                    setBusy(c.id);
                    try {
                      const r = await api.redeemCoupon({ couponId: c.id });
                      toast(`Seu código: ${r.code}`);
                    } catch (error) {
                      toast(errorMessage(error), 'error');
                    } finally {
                      setBusy(null);
                    }
                  }}
                >
                  {locked ? `${c.minKaleoPoints - points} pts` : 'Resgatar'}
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
