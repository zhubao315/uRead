import React, { useState } from 'react';

interface MediaImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'onError'> {
  /** CSS aspect-ratio，如 '2 / 3'，与 width/height 一起预留空间防止 CLS。 */
  aspectRatio?: string;
  /** 加载失败时只切一次的统一占位图。 */
  fallbackSrc?: string;
  /** 首屏 LCP 图片：eager + 高优先级，绝不 lazy。 */
  eager?: boolean;
  highPriority?: boolean;
}

/** src 变化时用 key 重挂载，fallback 状态自然复位，不需要在 effect 里写 state。 */
const MediaImageInner: React.FC<MediaImageProps> = ({
  src,
  alt = '',
  aspectRatio,
  fallbackSrc,
  eager = false,
  highPriority = false,
  width,
  height,
  className = '',
  style,
  ...rest
}) => {
  const [current, setCurrent] = useState(src ?? '');
  const [usedFallback, setUsedFallback] = useState(false);

  return (
    <img
      {...rest}
      src={current}
      alt={alt}
      width={width}
      height={height}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      fetchPriority={highPriority ? 'high' : undefined}
      onError={() => {
        if (!usedFallback && fallbackSrc && current !== fallbackSrc) {
          setUsedFallback(true);
          setCurrent(fallbackSrc);
        }
      }}
      className={className}
      style={{ aspectRatio, objectFit: 'cover', ...style }}
    />
  );
};

const MediaImage: React.FC<MediaImageProps> = (props) => (
  <MediaImageInner key={props.src} {...props} />
);

export default MediaImage;
