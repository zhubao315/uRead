import { useEffect, useState } from 'react';
import { loadWikiImages, type WikiImageMap } from '../data/media';

/** 正文里的 Obsidian 图片嵌入映射；加载失败时正文仍可读，图片位降级为占位文字。 */
export function useWikiImages(): WikiImageMap {
  const [images, setImages] = useState<WikiImageMap>({});

  useEffect(() => {
    let alive = true;
    void loadWikiImages().then((loaded) => {
      if (alive) setImages(loaded);
    });
    return () => { alive = false; };
  }, []);

  return images;
}
