import { useState } from 'react';
import { Link, useParams } from 'react-router';
import Lightbox from 'yet-another-react-lightbox';
import 'yet-another-react-lightbox/styles.css';
import { Camera, Images, PlayCircle } from 'lucide-react';
import { useTournament } from '@/features/tournament/TournamentProvider';
import { refs, queries } from '@/shared/lib/collections';
import { useCollection, useDocument } from '@/shared/lib/data';
import { EmptyState, PageHeader, PageLoader, Tabs } from '@/shared/ui';
import { formatDate } from '@/shared/utils/format';

export function MediaPage() {
  const { tournamentId } = useTournament();
  const [tab, setTab] = useState<'videos' | 'albums'>('videos');
  const videos = useCollection(tournamentId ? queries.videos(tournamentId) : null);
  const albums = useCollection(tournamentId ? queries.albums(tournamentId) : null);

  return (
    <div>
      <PageHeader title="Central multimídia" subtitle="Melhores momentos e álbuns de fotos" icon={<Camera />} />
      <div className="mb-6 max-w-sm">
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { id: 'videos', label: <span className="flex items-center gap-1.5"><PlayCircle className="size-4" />Vídeos</span> },
            { id: 'albums', label: <span className="flex items-center gap-1.5"><Images className="size-4" />Fotos</span> },
          ]}
        />
      </div>
      {tab === 'videos' && (
        <>
          {videos.data.length === 0 && <EmptyState icon={<PlayCircle />} title="Os melhores momentos chegam no dia da Copa" />}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {videos.data.map((v) => (
              <div key={v.id} className="overflow-hidden rounded-2xl border border-gray-800 bg-gray-900/60">
                {v.platform === 'youtube' ? (
                  <div className="relative pt-[56.25%]">
                    <iframe className="absolute inset-0 size-full" src={`https://www.youtube-nocookie.com/embed/${v.externalId}`} title={v.title} allowFullScreen loading="lazy" />
                  </div>
                ) : (
                  <iframe className="h-[560px] w-full" src={`https://www.instagram.com/reel/${v.externalId}/embed`} title={v.title} loading="lazy" allowFullScreen />
                )}
                <div className="p-3">
                  <p className="font-semibold text-white">{v.title}</p>
                  <p className="text-xs text-gray-500">{formatDate(v.publishedAt)}</p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
      {tab === 'albums' && (
        <>
          {albums.data.length === 0 && <EmptyState icon={<Images />} title="Nenhum álbum publicado ainda" />}
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {albums.data.map((a) => (
              <Link key={a.id} to={`/midia/albuns/${a.id}`} className="group overflow-hidden rounded-2xl border border-gray-800 bg-gray-900/60">
                <div className="aspect-[4/3] overflow-hidden bg-gray-800">
                  {a.coverUrl && <img src={a.coverUrl} alt="" className="size-full object-cover transition group-hover:scale-105" />}
                </div>
                <div className="flex items-center justify-between p-3">
                  <p className="font-semibold text-white">{a.title}</p>
                  <span className="text-xs text-gray-500">{a.photoCount} fotos</span>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function AlbumPage() {
  const { id = '' } = useParams();
  const album = useDocument(refs.album(id));
  const photos = useCollection(queries.photos(id));
  const [index, setIndex] = useState(-1);
  if (album.loading) return <PageLoader />;
  if (!album.data) return <EmptyState title="Álbum não encontrado" />;

  return (
    <div>
      <PageHeader title={album.data.title} subtitle={`${photos.data.length} fotos`} icon={<Images />} />
      <div className="columns-2 gap-3 sm:columns-3 lg:columns-4">
        {photos.data.map((p, i) => (
          <button key={p.id} onClick={() => setIndex(i)} className="mb-3 block w-full overflow-hidden rounded-xl">
            <img src={p.url} alt={p.caption ?? ''} loading="lazy" className="w-full transition hover:scale-105" />
          </button>
        ))}
      </div>
      <Lightbox open={index >= 0} index={index} close={() => setIndex(-1)} slides={photos.data.map((p) => ({ src: p.url, alt: p.caption }))} />
    </div>
  );
}
