#!/usr/bin/env python3
"""把 2048×2048 原图转成书单卡片用的 16:9 WebP（中心安全裁切）。"""
import sys
from PIL import Image

src, dst = sys.argv[1:3]
image = Image.open(src).convert('RGB')
width, height = image.size
ratio = 16 / 9
if width / height > ratio:
    new_width = int(height * ratio)
    left = (width - new_width) // 2
    image = image.crop((left, 0, left + new_width, height))
else:
    new_height = int(width / ratio)
    top = (height - new_height) // 2
    image = image.crop((0, top, width, top + new_height))
image = image.resize((1600, 900), Image.LANCZOS)
image.save(dst, 'WEBP', quality=84, method=6)
