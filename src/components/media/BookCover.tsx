import React, { useEffect, useState } from 'react';
import { loadMediaManifest } from '../../data/media';
import type { MediaManifest } from '../../domain/media/types';
import {
  generatedBookCoverSrc,
  mediaKey,
  realBookCoverSrc,
  resolveMedia,
} from '../../domain/media/resolveMedia';
import MediaImage from './MediaImage';

interface BookCoverProps {
  id: string;
  title: string;
  author?: string;
  /** 来自聚合数据的真实封面文件名（EPUB 内嵌封面），没有则走生成 SVG。 */
  realCover?: string;
  eager?: boolean;
  highPriority?: boolean;
  className?: string;
}

/** 书籍封面：策展资产 → 真实封面 → 确定性 SVG 主题视觉，任何情况都有图。 */
const BookCover: React.FC<BookCoverProps> = ({
  id,
  title,
  author = '',
  realCover,
  eager = false,
  highPriority = false,
  className = '',
}) => {
  const [manifest, setManifest] = useState<MediaManifest | null>(null);

  useEffect(() => {
    let alive = true;
    void loadMediaManifest().then((loaded) => {
      if (alive) setManifest(loaded);
    });
    return () => { alive = false; };
  }, []);

  const generated = generatedBookCoverSrc(id);
  const fallback = realCover ? realBookCoverSrc(realCover) : generated;
  const resolved = resolveMedia(mediaKey('book', id), fallback, manifest, `${title}${author ? ` · ${author}` : ''} 封面`);

  return (
    <MediaImage
      src={resolved.src}
      alt={resolved.alt}
      width={400}
      height={600}
      aspectRatio="2 / 3"
      fallbackSrc={generated}
      eager={eager}
      highPriority={highPriority}
      className={className}
    />
  );
};

export default BookCover;
