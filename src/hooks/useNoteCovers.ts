import { useEffect, useState } from 'react';
import { loadNoteCovers, type NoteCoverMap } from '../data/media';

/** 公开笔记列表的封面；加载失败时列表仍能正常阅读，只是没有缩略图。 */
export function useNoteCovers(): NoteCoverMap {
  const [covers, setCovers] = useState<NoteCoverMap>({});

  useEffect(() => {
    let alive = true;
    void loadNoteCovers().then((loaded) => {
      if (alive) setCovers(loaded);
    });
    return () => { alive = false; };
  }, []);

  return covers;
}
