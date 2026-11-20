import React, { useEffect, useState } from 'react';
import { loadMediaManifest } from '../../data/media';
import type { MediaManifest } from '../../domain/media/types';
import { generatedCollectionArtSrc, mediaKey, resolveMedia } from '../../domain/media/resolveMedia';
import MediaImage from './MediaImage';

interface CollectionArtworkProps {
  kind: 'theme' | 'booklist';
  id: string;
  title: string;
  className?: string;
  eager?: boolean;
  highPriority?: boolean;
}

/** 主题/书单的 16:9 视觉：策展图 → 确定性 SVG 抽象图，永远有图且不写文字。 */
const CollectionArtwork: React.FC<CollectionArtworkProps> = ({
  kind,
  id,
  title,
  className = '',
  eager = false,
  highPriority = false,
}) => {
  const [manifest, setManifest] = useState<MediaManifest | null>(null);

  useEffect(() => {
    let alive = true;
    void loadMediaManifest().then((loaded) => {
      if (alive) setManifest(loaded);
    });
    return () => { alive = false; };
  }, []);

  const generated = generatedCollectionArtSrc(kind, id);
  const resolved = resolveMedia(mediaKey(kind, id), generated, manifest, `${title} 主题视觉`);

  return (
    <MediaImage
      src={resolved.src}
      alt={resolved.alt}
      width={800}
      height={450}
      aspectRatio="16 / 9"
      fallbackSrc={generated}
      eager={eager}
      highPriority={highPriority}
      className={className}
    />
  );
};

export default CollectionArtwork;
