from __future__ import annotations

from pathlib import Path
from shared import (
    PUBLIC_DIR,
    ensure_public_dirs,
    load_notes,
    markdown_to_html,
    site_shell,
    write_json,
)

CATEGORIES = [
    {
        "id": "01",
        "name": "文学虚构类",
        "icon": "M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25",
        "desc": "审美体验、情感共鸣、人性探索",
    },
    {
        "id": "02",
        "name": "实用技能类",
        "icon": "M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 0 0 4.486-6.336l-3.276 3.277a3.004 3.004 0 0 1-2.25-2.25l3.276-3.276a4.5 4.5 0 0 0-6.336 4.486c.049.58.025 1.193-.14 1.743",
        "desc": "创业技能、时间管理、效率提升",
    },
    {
        "id": "03",
        "name": "认知成长类",
        "icon": "M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z",
        "desc": "心理认知、学习成长、思维升级",
    },
    {
        "id": "04",
        "name": "历史社科类",
        "icon": "M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0 0 12 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75Z",
        "desc": "历史洞察、社会规律、人文思辨",
    },
    {
        "id": "05",
        "name": "科技科普类",
        "icon": "M9.75 3.104v5.714a2.25 2.25 0 0 1-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 0 1 4.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0 1 12 15a9.065 9.065 0 0 0-6.23.693L5 14.5m14.8.8 1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0 1 12 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5",
        "desc": "技术前沿、科普知识、创新思维",
    },
    {
        "id": "06",
        "name": "投资理财类",
        "icon": "M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z",
        "desc": "财富观念、价值投资、金融智慧",
    },
    {
        "id": "07",
        "name": "传记人物类",
        "icon": "M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z",
        "desc": "人物传记、榜样力量、人生智慧",
    },
    {
        "id": "08",
        "name": "艺术美学类",
        "icon": "M9.53 16.122a3 3 0 0 0-5.78 1.128 2.25 2.25 0 0 1-2.4 2.245 4.5 4.5 0 0 0 8.4-2.245c0-.399-.078-.78-.22-1.128Zm0 0a15.998 15.998 0 0 0 3.388-1.62m-5.043-.025a15.994 15.994 0 0 1 1.622-3.395m3.42 3.42a15.995 15.995 0 0 0 4.764-4.648l3.876-5.814a1.151 1.151 0 0 0-1.597-1.597L14.146 6.32a15.996 15.996 0 0 0-4.649 4.763m3.42 3.42a6.776 6.776 0 0 0-3.42-3.42",
        "desc": "艺术修养、美学理论、审美品味",
    },
    {
        "id": "09",
        "name": "哲学宗教类",
        "icon": "M12 18v-5.25m0 0a6.01 6.01 0 0 0 1.5-.189m-1.5.189a6.01 6.01 0 0 1-1.5-.189m3.75 7.478a12.06 12.06 0 0 1-4.5 0m3.75 2.383a14.406 14.406 0 0 1-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 1 0-7.517 0c.85.493 1.509 1.333 1.509 2.316V18",
        "desc": "哲学思辨、精神追求、智慧启蒙",
    },
]

CATEGORY_MAP = {c["name"]: c for c in CATEGORIES}

CURATED_LISTS = [
    {
        "slug": "rushidao",
        "title": "儒释道经典",
        "summary": "儒家、佛家、道家核心经典全景导读，覆盖四书五经、大乘佛典与道藏精华",
        "sections": [
            {
                "name": "一、儒家经典",
                "books": [
                    (
                        "《大学》",
                        "儒家“四书”之首，系统阐释了“格物致知、诚意正心、修身齐家治国平天下”的儒家成德进阶路径。",
                    ),
                    (
                        "《中庸》",
                        "以“中庸”为核心道德准则，阐释了不偏不倚、过犹不及的处世智慧。",
                    ),
                    (
                        "《论语》",
                        "儒家思想奠基之作，记录孔子及其弟子言行，集中体现伦理思想、教育原则与政治主张。",
                    ),
                    (
                        "《孟子》",
                        "提出“性善论”“仁政”“民贵君轻”等核心主张，完善了儒家政治与伦理体系。",
                    ),
                    (
                        "《诗经》",
                        "中国现存最早的诗歌总集，收录西周至春秋 305 篇诗歌，承载儒家礼乐教化理念。",
                    ),
                    (
                        "《尚书》",
                        "中国现存最早的历史文献汇编，记录上古至商周的重要历史事件与政治思想。",
                    ),
                    (
                        "《礼记》",
                        "系统记录先秦礼仪制度与伦理规范，《大学》《中庸》原篇均出自此书。",
                    ),
                    (
                        "《周易》",
                        "儒家“五经”之首，以卦爻符号阐释宇宙变化规律与阴阳相生哲学。",
                    ),
                    (
                        "《春秋》",
                        "中国现存最早编年体史书，相传孔子修订，以微言大义记录春秋历史。",
                    ),
                    (
                        "《孝经》",
                        "系统阐释“孝”的伦理内涵与社会价值，是中国传统孝道文化的奠基之作。",
                    ),
                    (
                        "《传习录》",
                        "明代王阳明语录与书信集，集中体现“心即理”“知行合一”“致良知”的心学核心思想。",
                    ),
                    (
                        "《荀子》",
                        "提出“性恶论”“礼法并重”“天行有常”等思想，融合儒法理念发展儒家学说。",
                    ),
                ],
            },
            {
                "name": "二、释家（佛家）经典",
                "books": [
                    (
                        "《心经》",
                        "260 字浓缩“诸法空相”的般若空性核心思想，汉传佛教流传最广的般若经典。",
                    ),
                    (
                        "《金刚经》",
                        "阐释“凡所有相，皆是虚妄”的空性智慧，汉传佛教最具影响力的经典之一。",
                    ),
                    (
                        "《法华经》",
                        "以“开权显实、会三归一”为核心，阐释“一切众生皆可成佛”，天台宗根本经典。",
                    ),
                    (
                        "《华严经》",
                        "系统阐释“法界缘起、事事无碍”的核心思想，被誉为“经中之王”。",
                    ),
                    (
                        "《六祖坛经》",
                        "唯一由中国僧人创作被尊为“经”的典籍，阐释“明心见性、顿悟成佛”。",
                    ),
                    (
                        "《维摩诘经》",
                        "以在家居士维摩诘示疾说法为核心，阐释“不二法门”的般若思想。",
                    ),
                    (
                        "《佛说阿弥陀经》",
                        "详细介绍西方极乐世界与持名念佛往生净土的修行法门。",
                    ),
                    (
                        "《菩提道次第广论》",
                        "系统梳理从凡夫到成佛的完整修行路径，藏传佛教修学核心纲领。",
                    ),
                    (
                        "《瑜伽师地论》",
                        "全面阐释十七种修行境界与唯识思想，佛教修行百科全书式典籍。",
                    ),
                ],
            },
            {
                "name": "三、道家 / 道教经典",
                "books": [
                    (
                        "《道德经》",
                        "道家奠基之作，以“道”为核心阐释“道法自然”“无为而治”。",
                    ),
                    (
                        "《庄子》",
                        "以汪洋恣肆的寓言阐释“逍遥游”“齐物论”，追求精神绝对自由。",
                    ),
                    (
                        "《列子》",
                        "以寓言故事阐释道家“贵虚”“顺应自然”思想，《愚公移山》出自此书。",
                    ),
                    (
                        "《周易参同契》",
                        "被誉为“万古丹经王”，以《周易》卦象阐释内外丹修炼原理。",
                    ),
                    (
                        "《黄庭经》",
                        "以七言韵文阐释道教存思修炼法门，提出“三丹田”理念。",
                    ),
                    (
                        "《悟真篇》",
                        "以诗词形式系统阐释内丹修炼次第与方法，与参同契并称“丹经双璧”。",
                    ),
                    (
                        "《阴符经》",
                        "篇幅简短却意蕴深厚，融合道家宇宙观、兵家谋略与修炼思想。",
                    ),
                    (
                        "《抱朴子》",
                        "内篇为道教丹鼎派核心经典，系统阐释炼丹养生与神仙方术。",
                    ),
                    (
                        "《云笈七签》",
                        "被誉为“小道藏”，系统摘录道藏核心内容，了解道教文化百科全书。",
                    ),
                ],
            },
        ],
    },
]

STYLES = """
/* ═══════════════════════════════════════════════════════════
   uRead VIS — Sapphire / Amber / Teal
   ═══════════════════════════════════════════════════════════ */
:root {
  --blue:    #133D72;
  --blue-l:  #1e5aa8;
  --blue-bg: rgba(19,61,114,.06);
  --amber:   #FBBF24;
  --amber-l: rgba(251,191,36,.12);
  --teal:    #2DD4BF;
  --teal-l:  rgba(45,212,191,.10);
  --gray:    #4B5563;
  --bg:      #F8FAFC;
  --paper:   #FFFFFF;
  --ink:     #111827;
  --ink2:    #374151;
  --muted:   #6B7280;
  --border:  #E5E7EB;
  --sh-sm:   0 1px 3px rgba(0,0,0,.06);
  --sh-md:   0 4px 16px rgba(0,0,0,.08);
  --sh-lg:   0 12px 40px rgba(0,0,0,.10);
  --r:       10px;
  --r-lg:    16px;
  --nav-h:   56px;
  --max-w:   1160px;
  --tr:      .18s ease;
  --font-h:  'Lora', Georgia, serif;
  --font-b:  'Inter', -apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif;
  --font-m:  'JetBrains Mono', 'Fira Code', monospace;
}
@media(prefers-color-scheme:dark){
  :root {
    --bg:      #0B1120;
    --paper:   #151E31;
    --ink:     #F1F5F9;
    --ink2:    #CBD5E1;
    --muted:   #94A3B8;
    --border:  #1E293B;
    --blue-bg: rgba(19,61,114,.18);
    --amber-l: rgba(251,191,36,.15);
    --teal-l:  rgba(45,212,191,.12);
    --sh-sm:   0 1px 3px rgba(0,0,0,.3);
    --sh-md:   0 4px 16px rgba(0,0,0,.35);
    --sh-lg:   0 12px 40px rgba(0,0,0,.4);
  }
}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth;scroll-padding-top:calc(var(--nav-h) + 20px)}
body{font-family:var(--font-b);font-size:15px;line-height:1.7;color:var(--ink);background:var(--bg);-webkit-font-smoothing:antialiased}
a{color:var(--blue-l);text-decoration:none;transition:color var(--tr)}
a:hover{color:var(--amber)}
code{font-family:var(--font-m);background:var(--blue-bg);padding:.15em .4em;border-radius:5px;font-size:.88em}

/* ── NAV ─────────────────────────────── */
.nav{position:sticky;top:0;z-index:100;height:var(--nav-h);display:flex;align-items:center;justify-content:space-between;padding:0 clamp(1rem,3vw,2rem);background:var(--paper);border-bottom:1px solid var(--border);backdrop-filter:blur(12px)}
.brand{display:flex;align-items:center;gap:0;font-family:var(--font-h);font-size:1.2rem;font-weight:700;color:var(--blue);letter-spacing:.02em;transition:opacity var(--tr)}
.brand:hover{opacity:.8}
.brand-icon{width:26px;height:26px;color:var(--blue)}
.nav-links{display:flex;gap:2px}
.nav-links a{padding:.4rem .8rem;border-radius:8px;font-size:.85rem;font-weight:500;color:var(--muted);transition:all var(--tr)}
.nav-links a:hover{background:var(--blue-bg);color:var(--blue)}
.nav-api{font-family:var(--font-m)!important;font-size:.78rem!important;background:var(--teal-l);color:var(--teal)!important;border-radius:6px!important}
.nav-burger{display:none;background:none;border:none;cursor:pointer;padding:.4rem}
.nav-burger span{display:block;width:20px;height:2px;background:var(--ink);margin:5px 0;border-radius:2px;transition:.3s}
.nav-burger.on span:nth-child(1){transform:rotate(45deg) translate(5px,5px)}
.nav-burger.on span:nth-child(2){opacity:0}
.nav-burger.on span:nth-child(3){transform:rotate(-45deg) translate(5px,-5px)}

/* ── MAIN ────────────────────────────── */
.main{width:min(var(--max-w),calc(100% - 2rem));margin:0 auto;padding:2rem 0 4rem}

/* ── HERO ────────────────────────────── */
.hero{background:var(--paper);border:1px solid var(--border);border-radius:var(--r-lg);box-shadow:var(--sh-md);padding:clamp(2rem,5vw,3rem);margin-bottom:1.5rem;position:relative;overflow:hidden}
.hero::before{content:'';position:absolute;top:0;right:0;width:200px;height:200px;background:radial-gradient(circle,rgba(251,191,36,.08),transparent 70%);pointer-events:none}
.hero h1{font-family:var(--font-h);font-size:clamp(1.7rem,4vw,2.6rem);line-height:1.2;margin-bottom:.6rem;color:var(--blue)}
.hero p{color:var(--ink2);font-size:1rem;max-width:600px}
.hero-eyebrow{display:inline-flex;align-items:center;gap:.4rem;font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:var(--amber);margin-bottom:.6rem}
.hero-eyebrow .dot{width:6px;height:6px;border-radius:50%;background:var(--teal)}

/* ── SEARCH ──────────────────────────── */
.search-bar{display:flex;align-items:center;gap:.6rem;margin-top:1.2rem;padding:.6rem 1rem;background:var(--bg);border:1px solid var(--border);border-radius:999px;max-width:480px;transition:border-color var(--tr)}
.search-bar:focus-within{border-color:var(--blue-l);box-shadow:0 0 0 3px var(--blue-bg)}
.search-bar svg{flex-shrink:0;color:var(--muted)}
.search-bar input{flex:1;border:none;background:none;outline:none;font-size:.9rem;font-family:var(--font-b);color:var(--ink)}
.search-bar input::placeholder{color:var(--muted)}

/* ── STATS ───────────────────────────── */
.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:.75rem;margin-bottom:2rem}
a.stat{background:var(--paper);border:1px solid var(--border);border-radius:var(--r);padding:1.2rem;text-align:center;box-shadow:var(--sh-sm);transition:all var(--tr);display:block;color:var(--ink);text-decoration:none}
a.stat:hover{box-shadow:var(--sh-md);border-color:var(--blue-l);transform:translateY(-2px);color:var(--ink)}
.stat-n{font-size:1.8rem;font-weight:700;color:var(--blue);line-height:1;font-family:var(--font-h)}
.stat-l{font-size:.75rem;color:var(--muted);margin-top:.3rem;letter-spacing:.04em}
.stat-icon{width:20px;height:20px;margin:0 auto .4rem;color:var(--amber)}

/* ── SECTION HDR ─────────────────────── */
.sh{display:flex;justify-content:space-between;align-items:center;gap:1rem;margin:2.5rem 0 1rem;flex-wrap:wrap}
.sh h2{font-family:var(--font-h);font-size:1.3rem;font-weight:700;display:flex;align-items:center;gap:.5rem}
.sh h2 .dot{width:8px;height:8px;border-radius:50%;background:var(--amber)}
.sh a{font-size:.82rem;font-weight:600;color:var(--blue-l);display:flex;align-items:center;gap:.2rem}
.sh a::after{content:'→';transition:transform var(--tr)}
.sh a:hover::after{transform:translateX(3px)}

/* ── CAT NAV ─────────────────────────── */
.cn{display:flex;flex-wrap:wrap;gap:.35rem;margin-bottom:1.5rem}
.cn a{display:inline-flex;align-items:center;gap:.3rem;padding:.3rem .6rem;border-radius:999px;background:var(--paper);border:1px solid var(--border);font-size:.78rem;font-weight:500;color:var(--muted);transition:all var(--tr);white-space:nowrap}
.cn a:hover{border-color:var(--blue-l);color:var(--blue);background:var(--blue-bg)}
.cn a.on{background:var(--blue);border-color:var(--blue);color:#fff}

/* ── CARD ────────────────────────────── */
.card{background:var(--paper);border:1px solid var(--border);border-radius:var(--r);box-shadow:var(--sh-sm);padding:1.2rem;transition:all var(--tr);display:flex;flex-direction:column}
.card:hover{box-shadow:var(--sh-md);transform:translateY(-2px);border-color:var(--blue-l)}
.card-cat{font-size:.7rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--teal);margin-bottom:.4rem}
.card h3{font-family:var(--font-h);font-size:1rem;margin-bottom:.35rem;line-height:1.35}
.card h3 a{color:var(--ink)}
.card h3 a:hover{color:var(--blue)}
.card p{color:var(--muted);font-size:.84rem;line-height:1.6;flex:1}
.card-author{color:var(--muted);font-size:.76rem;margin-top:.5rem;display:flex;align-items:center;gap:.3rem}
.card-author::before{content:'';width:14px;height:14px;border-radius:50%;background:var(--blue-bg);display:inline-block}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:1rem}

/* ── PILL ────────────────────────────── */
.pill{display:inline-block;margin:.15rem .25rem .15rem 0;padding:.18rem .5rem;border-radius:999px;background:var(--blue-bg);color:var(--blue);font-size:.76rem;font-weight:500}

/* ── CAT SECTION ─────────────────────── */
.cs{margin-bottom:2.5rem}
.cs-t{font-family:var(--font-h);font-size:1.1rem;font-weight:700;padding-bottom:.5rem;margin-bottom:1rem;border-bottom:2px solid var(--border);display:flex;align-items:center;gap:.5rem}
.cs-t .n{font-size:.72rem;font-weight:500;color:var(--muted);background:var(--amber-l);padding:.15rem .5rem;border-radius:999px}

/* ── NOTE ────────────────────────────── */
.note{background:var(--paper);border:1px solid var(--border);border-radius:var(--r-lg);box-shadow:var(--sh-md);padding:clamp(1.5rem,4vw,2.5rem);max-width:860px}
.note h1{font-family:var(--font-h);font-size:clamp(1.4rem,3vw,1.9rem);line-height:1.25;margin-bottom:.4rem}
.note h2{font-family:var(--font-h);font-size:1.25rem;margin-top:2rem;margin-bottom:.6rem;color:var(--blue)}
.note h3{font-family:var(--font-h);font-size:1.05rem;margin-top:1.5rem;margin-bottom:.4rem}
.note-meta{color:var(--muted);font-size:.82rem;margin-bottom:1rem}
.note p,.note li{font-size:.97rem;line-height:1.85}
.note ul{padding-left:1.2rem;margin:.5rem 0}
.note blockquote{margin:1rem 0;padding:.8rem 1rem;border-left:3px solid var(--amber);background:var(--amber-l);border-radius:0 8px 8px 0}
.note .tag-row{margin:.75rem 0 1.5rem}
.note pre{background:var(--ink);color:#e2e8f0;padding:1rem;border-radius:var(--r);overflow-x:auto;margin:1rem 0}
.note pre code{background:none;padding:0;color:inherit}
.wl{color:var(--blue-l);border-bottom:1px dashed rgba(19,61,114,.3)}

/* ── LIST CARD ───────────────────────── */
.lc{background:var(--paper);border:1px solid var(--border);border-radius:var(--r-lg);box-shadow:var(--sh-sm);padding:clamp(1.2rem,3vw,1.8rem);margin-bottom:1.5rem;transition:all var(--tr)}
.lc:hover{box-shadow:var(--sh-md)}
.lc h3{font-family:var(--font-h);font-size:1.05rem;margin-bottom:.25rem}
.lc h3 a{color:var(--ink)}
.lc h3 a:hover{color:var(--blue)}
.lc p{color:var(--muted);font-size:.84rem}
.lc-meta{display:flex;gap:1rem;margin-top:.5rem;font-size:.76rem;color:var(--muted)}
.ls{margin-bottom:2rem}
.ls-t{font-family:var(--font-h);font-size:1.05rem;font-weight:700;margin:1.5rem 0 .6rem;padding-bottom:.35rem;border-bottom:1px solid var(--border)}
.li{display:flex;gap:.6rem;padding:.55rem 0;border-bottom:1px solid var(--border);font-size:.9rem;line-height:1.6}
.li:last-child{border-bottom:none}
.li-n{flex-shrink:0;width:1.6rem;text-align:right;color:var(--muted);font-weight:600;font-size:.78rem;padding-top:.1rem}
.li-t{font-weight:600;color:var(--ink)}
.li-d{color:var(--ink2)}

/* ── FOOTER ──────────────────────────── */
.foot{border-top:1px solid var(--border);margin-top:3rem;padding:2rem 0;text-align:center}
.foot-inner{max-width:600px;margin:0 auto}
.foot-brand{font-family:var(--font-h);font-weight:700;color:var(--blue);font-size:.95rem;margin-bottom:.4rem}
.foot-links{font-size:.8rem;color:var(--muted);margin-bottom:.3rem}
.foot-links a{color:var(--muted)}
.foot-links a:hover{color:var(--blue)}
.dot{margin:0 .3rem}
.foot-copy{font-size:.75rem;color:var(--muted);opacity:.7}

/* ── RESPONSIVE ──────────────────────── */
@media(max-width:768px){
  .nav-links{display:none;position:absolute;top:var(--nav-h);left:0;right:0;flex-direction:column;background:var(--paper);border-bottom:1px solid var(--border);box-shadow:var(--sh-md);padding:.5rem 0}
  .nav-links.open{display:flex}
  .nav-links a{padding:.65rem 1.5rem;border-radius:0}
  .nav-burger{display:block}
  .grid{grid-template-columns:1fr}
  .stats{grid-template-columns:repeat(2,1fr)}
  .hero h1{font-size:1.5rem}
  .cn{gap:.25rem}
  .cn a{font-size:.72rem;padding:.25rem .5rem}
}
@media(min-width:769px) and (max-width:1024px){.grid{grid-template-columns:repeat(2,1fr)}}
"""


# ═══════════════════════════════════════════════════════════
#  SVG icon helper
# ═══════════════════════════════════════════════════════════
def _icon(d: str, size: int = 20) -> str:
    return f'<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" width="{size}" height="{size}"><path stroke-linecap="round" stroke-linejoin="round" d="{d}"/></svg>'


def _card(note: dict, base: str) -> str:
    author = note["meta"].get("author", "")
    ah = f'<div class="card-author">{author}</div>' if author else ""
    return f'<article class="card"><div class="card-cat">{note["meta"].get("theme", note["section"])}</div><h3><a href="{base}/{note["slug"]}/">{note["title"]}</a></h3><p>{note["summary"]}</p>{ah}</article>'


def _cat_nav(active: str = "") -> str:
    items = []
    for c in CATEGORIES:
        cls = ' class="on"' if c["name"] == active else ""
        items.append(
            f'<a href="/uRead/books/#{c["name"]}"{cls}>{_icon(c["icon"], 14)}{c["name"]}</a>'
        )
    return f'<div class="cn">{"".join(items)}</div>'


def _books_cat(books, name):
    return [b for b in books if b["meta"].get("theme") == name]


# ═══════════════════════════════════════════════════════════
#  MAIN
# ═══════════════════════════════════════════════════════════
def main() -> None:
    ensure_public_dirs()
    notes = [n for n in load_notes() if n["type"] != "template"]
    books = [n for n in notes if n["type"] == "book"]
    cards = [n for n in notes if n["type"] == "concept"]
    enriched = sum(1 for b in books if "整合" in b["meta"].get("source", ""))
    tag_count = len({t for n in notes for t in n["meta"].get("tags", [])})

    (PUBLIC_DIR / "styles.css").write_text(STYLES, encoding="utf-8")
    write_json(PUBLIC_DIR / "api" / "books.json", _api_books(books))
    write_json(PUBLIC_DIR / "api" / "tags.json", _api_tags(notes))
    write_json(PUBLIC_DIR / "api" / "graph.json", _api_graph(notes))

    build_home(notes, books, cards, enriched, tag_count)
    build_books(books)
    build_lists()
    build_cards(cards)
    _details("books", books)
    _details("cards", cards)


# ═══════════════════════════════════════════════════════════
#  HOME
# ═══════════════════════════════════════════════════════════
def build_home(notes, books, cards, enriched, tag_count) -> None:
    stat_defs = [
        (
            "M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25",
            str(len(books)),
            "深度笔记",
            "/uRead/books/",
        ),
        (
            "M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z",
            str(len(cards)),
            "知识卡片",
            "/uRead/cards/",
        ),
        (
            "M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0 0 12 9.75c-2.551 0-5.056.2-7.5.582V21",
            str(len(CATEGORIES)),
            "九大分类",
            "/uRead/books/",
        ),
        (
            "M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z",
            str(len(CURATED_LISTS)),
            "精选书单",
            "/uRead/lists/",
        ),
    ]
    stats_h = "\n".join(
        f'<a href="{href}" class="stat"><div class="stat-icon">{_icon(d, 20)}</div><div class="stat-n">{v}</div><div class="stat-l">{l}</div></a>'
        for d, v, l, href in stat_defs
    )

    # category preview (max 6 per cat)
    cat_h = ""
    for c in CATEGORIES:
        cb = _books_cat(books, c["name"])[:6]
        if not cb:
            continue
        g = "\n".join(_card(b, "/uRead/books") for b in cb)
        total = len(_books_cat(books, c["name"]))
        cat_h += f'<section class="cs"><div class="cs-t">{_icon(c["icon"], 18)}{c["name"]}<span class="n">{total}</span></div><div class="grid">{g}</div></section>'

    # curated lists
    list_h = ""
    for lst in CURATED_LISTS:
        total = sum(len(s["books"]) for s in lst["sections"])
        list_h += f'<article class="lc"><h3><a href="/uRead/lists/{lst["slug"]}/">{lst["title"]}</a></h3><p>{lst["summary"]}</p><div class="lc-meta"><span>{len(lst["sections"])} 个分类</span><span>{total} 本经典</span></div></article>'

    cards_h = "\n".join(_card(c, "/uRead/cards") for c in cards[:6])

    body = f"""
<section class="hero">
  <div class="hero-eyebrow"><span class="dot"></span>Open Reading OS</div>
  <h1>让每一次阅读，都留下可生长的沉淀</h1>
  <p>uRead 帮你打造可发布、可检索的深度读书笔记，系统化盘活你的经典书单。让读过的书、写下的思考，不再沉睡，真正成为能复用、能变现的个人知识资产。</p>
</section>

<div class="search-wrap">
  <div class="search-bar">
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" width="18" height="18"><path stroke-linecap="round" stroke-linejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"/></svg>
    <input type="text" id="searchInput" placeholder="搜索书名、作者、标签…" oninput="filterCards(this.value)">
  </div>
</div>

<div class="stats">{stats_h}</div>
{_cat_nav()}
<div class="sh"><h2><span class="dot"></span>精选书单</h2><a href="/uRead/lists/">查看全部</a></div>
{list_h}
{cat_h}
<div class="sh"><h2><span class="dot"></span>知识卡片</h2><a href="/uRead/cards/">查看全部</a></div>
<div class="grid">{cards_h}</div>
<script>
function filterCards(q) {{
  q = q.toLowerCase().trim();
  document.querySelectorAll('.card').forEach(c => {{
    const t = (c.textContent || '').toLowerCase();
    c.style.display = (!q || t.includes(q)) ? '' : 'none';
  }});
  document.querySelectorAll('.cs').forEach(s => {{
    const vis = s.querySelectorAll('.card:not([style*="display: none"])');
    s.style.display = vis.length ? '' : 'none';
  }});
}}
</script>"""
    (PUBLIC_DIR / "index.html").write_text(
        site_shell(
            "uRead — 深度读书笔记", body, "结构化深度读书笔记与Agent友好知识资产"
        ),
        encoding="utf-8",
    )


# ═══════════════════════════════════════════════════════════
#  BOOKS LIST
# ═══════════════════════════════════════════════════════════
def build_books(books) -> None:
    secs = ""
    for c in CATEGORIES:
        cb = _books_cat(books, c["name"])
        if not cb:
            continue
        g = "\n".join(_card(b, "/uRead/books") for b in cb)
        secs += f'<section class="cs" id="{c["name"]}"><div class="cs-t">{_icon(c["icon"], 18)}{c["name"]}<span class="n">{len(cb)}</span></div><div class="grid">{g}</div></section>'
    body = f'<section class="hero"><div class="hero-eyebrow"><span class="dot"></span>深度笔记</div><h1>深度笔记</h1><p>按九大分类浏览所有深度读书笔记，同步生成 JSON API 与 JSON-LD 元数据。</p></section>{_cat_nav()}{secs}'
    (PUBLIC_DIR / "books" / "index.html").write_text(
        site_shell("深度笔记 | uRead", body, "按九大分类浏览深度读书笔记"),
        encoding="utf-8",
    )


# ═══════════════════════════════════════════════════════════
#  LISTS
# ═══════════════════════════════════════════════════════════
def build_lists() -> None:
    cards_h = ""
    for lst in CURATED_LISTS:
        t = sum(len(s["books"]) for s in lst["sections"])
        cards_h += f'<article class="card"><h3><a href="/uRead/lists/{lst["slug"]}/">{lst["title"]}</a></h3><p>{lst["summary"]}</p><div class="card-author">{len(lst["sections"])} 个分类 · {t} 本经典</div></article>'
    body = f'<section class="hero"><div class="hero-eyebrow"><span class="dot"></span>精选书单</div><h1>精选书单</h1><p>按主题精心编排的经典著作导读，每本书附一句话定位。</p></section><div class="grid">{cards_h}</div>'
    p = PUBLIC_DIR / "lists" / "index.html"
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(site_shell("精选书单 | uRead", body), encoding="utf-8")

    for lst in CURATED_LISTS:
        secs_h = ""
        for sec in lst["sections"]:
            items = ""
            for i, (title, desc) in enumerate(sec["books"], 1):
                items += f'<div class="li"><span class="li-n">{i}.</span><div><span class="li-t">{title}</span>：<span class="li-d">{desc}</span></div></div>'
            secs_h += (
                f'<div class="ls"><h2 class="ls-t">{sec["name"]}</h2>{items}</div>'
            )
        body = f'<article class="note"><div class="hero-eyebrow"><span class="dot"></span>精选书单</div><h1>{lst["title"]}</h1><p style="color:var(--muted);margin-bottom:1.5rem">{lst["summary"]}</p>{secs_h}</article>'
        f2 = PUBLIC_DIR / "lists" / lst["slug"]
        f2.mkdir(parents=True, exist_ok=True)
        (f2 / "index.html").write_text(
            site_shell(f"{lst['title']} | 精选书单 | uRead", body, lst["summary"]),
            encoding="utf-8",
        )


# ═══════════════════════════════════════════════════════════
#  CARDS LIST
# ═══════════════════════════════════════════════════════════
def build_cards(cards) -> None:
    g = "\n".join(_card(c, "/uRead/cards") for c in cards)
    body = f'<section class="hero"><div class="hero-eyebrow"><span class="dot"></span>知识卡片</div><h1>知识卡片</h1><p>从深度阅读中提炼的核心概念、模型与方法论。</p></section><div class="grid">{g}</div>'
    (PUBLIC_DIR / "cards" / "index.html").write_text(
        site_shell("知识卡片 | uRead", body), encoding="utf-8"
    )


# ═══════════════════════════════════════════════════════════
#  DETAIL PAGES
# ═══════════════════════════════════════════════════════════
def _details(section: str, notes) -> None:
    for note in notes:
        folder = PUBLIC_DIR / section / note["slug"]
        folder.mkdir(parents=True, exist_ok=True)
        tags_h = "".join(
            f'<span class="pill">{t}</span>' for t in note["meta"].get("tags", [])
        )
        m = note["meta"]
        mt = f"{m.get('author', 'uRead')} / {m.get('theme', note['section'])}"
        r = m.get("rating", 0)
        if r:
            mt += f" / {'★' * r}{'☆' * (5 - r)}"
        ch = markdown_to_html(note["body"])
        body = f'<article class="note"><div class="hero-eyebrow"><span class="dot"></span>{note["type"]}</div><h1>{note["title"]}</h1><div class="note-meta">{mt}</div><p style="color:var(--ink2)">{note["summary"]}</p><div class="tag-row">{tags_h}</div>{ch}</article>'
        (folder / "index.html").write_text(
            site_shell(f"{note['title']} | uRead", body, note["summary"]),
            encoding="utf-8",
        )


# ═══════════════════════════════════════════════════════════
#  API BUILDERS
# ═══════════════════════════════════════════════════════════
def _api_books(books):
    return [
        {
            "title": n["title"],
            "author": n["meta"].get("author", ""),
            "slug": n["slug"],
            "summary": n["summary"],
            "tags": n["meta"].get("tags", []),
            "theme": n["meta"].get("theme", ""),
            "rating": n["meta"].get("rating", 0),
            "url": f"/uRead/books/{n['slug']}/",
            "agentsPublic": n["meta"].get("agents_public", False),
        }
        for n in books
    ]


def _api_tags(notes):
    tags = {}
    for n in notes:
        for t in n["meta"].get("tags", []):
            tags.setdefault(t, []).append(n["title"])
    return [
        {"tag": t, "notes": sorted(v), "count": len(v)} for t, v in sorted(tags.items())
    ]


def _api_graph(notes):
    nodes = [{"id": n["title"], "group": n["type"]} for n in notes]
    links = []
    titles = {n["title"] for n in notes}
    for n in notes:
        for lk in n["links"]:
            if lk in titles:
                links.append({"source": n["title"], "target": lk})
    return {"nodes": nodes, "links": links}


if __name__ == "__main__":
    main()
