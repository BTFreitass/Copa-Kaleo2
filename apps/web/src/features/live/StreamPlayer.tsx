import { Tv } from 'lucide-react';
import { extractYouTubeId } from '@copa/shared';
import { useTournament } from '@/features/tournament/TournamentProvider';

export function StreamPlayer() {
  const { settings } = useTournament();
  const stream = settings?.liveStream;
  const src = stream?.active ? embedUrl(stream.platform, stream.channelOrVideoId) : null;

  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-gray-800 bg-black pt-[56.25%] shadow-2xl ring-1 ring-white/10">
      {src ? (
        <iframe
          className="absolute inset-0 size-full"
          src={src}
          title="Transmissão Copa Kaleo"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-gray-900 to-gray-950 text-gray-500">
          <Tv className="size-12" />
          <p className="font-semibold">A transmissão começa em breve</p>
        </div>
      )}
    </div>
  );
}

function embedUrl(platform: 'youtube' | 'twitch', value: string) {
  if (!value) return null;
  if (platform === 'twitch') {
    const channel = value.replace(/^https?:\/\/(www\.)?twitch\.tv\//, '').split(/[/?]/)[0];
    return `https://player.twitch.tv/?channel=${channel}&parent=${window.location.hostname}&muted=true`;
  }
  const video = extractYouTubeId(value);
  if (!video) return null;
  return `https://www.youtube-nocookie.com/embed/${video.id}?autoplay=1&mute=1${video.start ? `&start=${video.start}` : ''}`;
}
