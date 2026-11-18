/**
 * 界面层的「不变量」静态检查。
 *
 * 为什么用静态检查而不是渲染测试：这些规则一旦回退，人眼几乎发现不了
 * （`outline: none` 只影响键盘用户；漏一个 `catch` 只在磁盘出错时才表现）。
 * 渲染测试只能覆盖我想到写用例的那条路径，静态规则能覆盖整个 src/。
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SRC = path.join(ROOT, 'src');

/** 递归收集源码（只含 ts/tsx/css）。 */
function sources(dir: string = SRC): Array<{ file: string; text: string }> {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) {
      return sources(full);
    }
    if (!/\.(ts|tsx|css)$/.test(name)) {
      return [];
    }
    return [{ file: path.relative(ROOT, full), text: readFileSync(full, 'utf-8') }];
  });
}

/**
 * 找 `<Button` / `<button` 这样的标签起点，要求标签名后是空白或 `>`。
 *
 * 少了这个边界判断，`React.FC<ButtonProps>` 里的 `<ButtonProps>` 会被当成按钮，
 * 于是每个用到该类型的文件都误报。
 */
function findTag(text: string, from: number, tag = '<Button'): number {
  let cursor = text.indexOf(tag, from);
  while (cursor !== -1) {
    const next = text[cursor + tag.length];
    if (next === undefined || /[\s/>]/.test(next)) {
      return cursor;
    }
    cursor = text.indexOf(tag, cursor + tag.length);
  }
  return -1;
}

/**
 * 从 `<Tag` 的名字结尾处读到配对的 `>`，返回尖括号内的完整属性文本。
 *
 * 为什么要自己扫描而不是 `indexOf('>')`：JSX 属性里满是 `=>` 与 `? :`，
 * 朴素地找第一个 `>` 会把 `onClick={() => x}` 截断成 `onClick={() =&`，
 * 于是每个带箭头函数的按钮都被误判成死按钮。
 */
function readTag(text: string, openIndex: number): string | null {
  let depth = 0;
  let quote = '';
  for (let index = openIndex; index < text.length; index += 1) {
    const char = text[index];
    if (quote) {
      if (char === quote) {
        quote = '';
      }
      continue;
    }
    if (char === '"' || char === "'" || char === '`') {
      quote = char;
      continue;
    }
    if (char === '{' || char === '(' || char === '[') {
      depth += 1;
      continue;
    }
    if (char === '}' || char === ')' || char === ']') {
      depth -= 1;
      continue;
    }
    if (char === '>' && depth === 0) {
      return text.slice(openIndex, index);
    }
  }
  return null;
}

const ALL = sources();
const byFile = (needle: string) => ALL.filter((item) => item.file.endsWith(needle));
const at = (file: string) => byFile(file)[0]?.text ?? '';

/** 扫出全部测试文件（相对 ROOT），用于交叉验证 README 声称的文件数。 */
function listTestFiles(dir = path.join(ROOT, 'tests')): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) {
      return listTestFiles(full);
    }
    return /\.test\.(ts|tsx)$/.test(name) ? [path.relative(ROOT, full)] : [];
  });
}

describe('界面不变量', () => {
  it('src/ 里不允许阻塞式浏览器弹窗（装不下“下一步做什么”）', () => {
    const offenders = ALL.filter((item) => /window\.(alert|confirm)\s*\(/.test(item.text)).map(
      (item) => item.file,
    );

    expect(offenders, `仍在使用 window.alert/confirm：${offenders.join(', ')}`).toEqual([]);
  });

  it('原生 <button> 一律显式声明 type（表单里默认是 submit）', () => {
    const offenders: string[] = [];
    for (const item of ALL) {
      if (!item.file.endsWith('.tsx')) {
        continue;
      }
      for (const match of item.text.matchAll(/<button\b[^>]*>/gs)) {
        if (!/type="/.test(match[0])) {
          const line = item.text.slice(0, match.index).split('\n').length;
          offenders.push(`${item.file}:${line}`);
        }
      }
    }

    expect(offenders, `缺少 type 的 <button>：${offenders.join(', ')}`).toEqual([]);
  });

  it('四个列表视图都读取 store 的 error，并复用 StateBlock', () => {
    const views = [
      'src/views/LibraryView.tsx',
      'src/views/NotesView.tsx',
      'src/views/CardsView.tsx',
      'src/views/BookListsView.tsx',
    ];

    for (const view of views) {
      const text = at(view);
      // 只判断数组长度是不够的：IndexedDB 打不开时同样得到空数组
      expect(text, `${view} 没有读取 state.error`).toContain('state.error');
      expect(text, `${view} 没有读取 state.loading`).toContain('state.loading');
      expect(text, `${view} 未使用 StateBlock`).toContain('StateBlock');
      expect(text, `${view} 未使用 resolveState 判定状态`).toContain('resolveState');
    }
  });

  it('每个视图的写盘动作都经过 useActionRunner（不允许裸 try/finally）', () => {
    const views = [
      'src/views/LibraryView.tsx',
      'src/views/NotesView.tsx',
      'src/views/CardsView.tsx',
      'src/views/BookListsView.tsx',
      'src/views/Dashboard.tsx',
    ];

    for (const view of views) {
      const text = at(view);
      expect(text, `${view} 未使用 useActionRunner`).toContain('useActionRunner');
      expect(text, `${view} 仍有 setSaving 之类的局部忙标志`).not.toMatch(/\bsetSaving\b/);
    }
  });

  it('自己渲染删除按钮的地方都走两步确认组件', () => {
    // 视图里把删除委托给卡片组件的，只要求卡片组件合规
    const consumers = [
      'src/views/LibraryView.tsx',
      'src/views/Dashboard.tsx',
      'src/components/NoteCard.tsx',
      'src/components/KnowledgeCard.tsx',
      'src/components/BookListCard.tsx',
    ];

    for (const file of consumers) {
      expect(at(file), `${file} 未引入 ConfirmAction`).toContain('ConfirmAction');
    }
  });

  it('焦点轮廓必须是真实 CSS，且不能被 outline: none 抹掉', () => {
    // 只看真实声明：注释里解释历史 bug 时会原样引用 `outline: none`
    const css = at('src/index.css').replace(/\/\*[\s\S]*?\*\//g, '');

    expect(css, '.focus-ring 未定义').toContain('.focus-ring');
    expect(css, 'focus-ring 必须给出可见轮廓').toMatch(/outline:\s*2px solid/);
    expect(css, '不允许再出现 outline: none').not.toContain('outline: none');
    // `ring:` 是 Tailwind 类名不是 CSS 属性，写进样式表等于什么都没写
    expect(css, '不允许把 Tailwind 类名当 CSS 属性写').not.toMatch(/^\s*ring:/m);
    expect(css, '缺少全局 :focus-visible 规则').toContain(':focus-visible');
  });

  it('不使用对比度不达标的 text-gray-400（白底约 2.8:1）', () => {
    const offenders = ALL.filter((item) => item.text.includes('text-gray-400')).map(
      (item) => item.file,
    );

    expect(offenders, `对比度不足：${offenders.join(', ')}`).toEqual([]);
  });

  it('中文界面里不出现英文的加载/错误字面量', () => {
    const offenders = ALL.filter(
      (item) =>
        item.file.endsWith('.tsx') && /['"`>]\s*(Loading|Saving|Error|Submitting)\.\.\.\s*['"`<]/.test(item.text),
    ).map((item) => item.file);

    expect(offenders, `残留英文提示：${offenders.join(', ')}`).toEqual([]);
  });

  it('导航栏没有装饰性的死控件（有样式无动作）', () => {
    const navbar = at('src/components/Navbar.tsx');

    expect(navbar, '导航栏必须提供真正可用的搜索').toContain('role="search"');
    expect(navbar).not.toMatch(/<div[^>]*hover:bg-gray-50[^>]*>\s*<div[^>]*>\s*<span[^>]*>U</s);
    expect(navbar, '书库是 Pages 静态目录，不能用 React Router 的 Link（会被 SPA 吞成 404）')
      .toContain('href={item.staticHref}');
  });

  it('搜索框有可访问名称（aria-label 或关联的 <label htmlFor>）', () => {
    // 注意不能用 `<input ...>` 整段正则：属性里的箭头函数含 `>`，会把标签截断
    const offenders: string[] = [];
    for (const item of ALL) {
      if (!item.file.endsWith('.tsx')) {
        continue;
      }
      for (const match of item.text.matchAll(/<input\b/g)) {
        const declaration = item.text.slice(match.index, match.index + 400);
        if (!declaration.includes('type="search"')) {
          continue;
        }
        const hasAriaLabel = declaration.includes('aria-label=');
        const idMatch = /id="([^"]+)"/.exec(declaration);
        const hasLinkedLabel = Boolean(idMatch) && item.text.includes(`htmlFor="${idMatch![1]}"`);
        if (!hasAriaLabel && !hasLinkedLabel) {
          const line = item.text.slice(0, match.index).split('\n').length;
          offenders.push(`${item.file}:${line}`);
        }
      }
    }

    expect(offenders, `搜索框缺少可访问名称：${offenders.join(', ')}`).toEqual([]);
  });

  it('未知路由有兜底页面（原来只会渲染一个空白 main）', () => {
    const app = at('src/App.tsx');

    expect(app).toContain('path="*"');
    expect(app).toMatch(/这个地址下没有内容|NotFound/);
  });

  it('README 记录的测试数与界面能力表不是手写的空话', () => {
    const readme = readFileSync(path.join(ROOT, 'README.md'), 'utf-8');

    expect(readme).toContain('加载 / 空 / 出错三种界面互不混淆');
    expect(readme).toContain('两步确认');
    expect(readme).toContain('全站搜索');
    // 「\d+ passed」等于没核对：任何数字都能过。
    // 这里要求 README 同时写 passed / skipped / 总数并互相验算——
    // 只写一个数会在「共享契约缺失导致 1 条跳过」的环境里漂移成假话（轮次 19 实测）。
    const claim =
      /单元测试：\*\*npm test 报 (\d+) passed \/ (\d+) 跳过，共 (\d+) 个用例\*\*（(\d+) 个测试文件/.exec(readme);
    expect(
      claim,
      'README 的测试数行必须写成「单元测试：**npm test 报 N passed / M 跳过，共 T 个用例**（K 个测试文件…）」',
    ).not.toBeNull();
    const [, passed, skipped, total, files] = claim as unknown as RegExpExecArray;

    expect(Number(passed) + Number(skipped)).toBe(Number(total));

    const testFiles = listTestFiles();
    expect(
      Number(files),
      `README 说 ${files} 个测试文件，实际扫到 ${testFiles.length} 个：${testFiles.join(', ')}`,
    ).toBe(testFiles.length);

    // README 还承诺了「没有共享契约」那套环境下的数字，同样得自洽：
    // 只写一组数字的话，读者无法判断跳过的是同一条还是整片。
    const alt = /那种环境下报 \*\*(\d+) passed \/ (\d+) 跳过，共 (\d+) 个用例\*\*/.exec(readme);
    expect(
      alt,
      'README 要写出缺共享契约时的真实数字（passed / 跳过 / 总数），否则「唯一会跳过」是句无法核对的话',
    ).not.toBeNull();
    if (alt) {
      const [, altPassed, altSkipped, altTotal] = alt as unknown as RegExpExecArray;
      expect(Number(altPassed) + Number(altSkipped)).toBe(Number(altTotal));
      expect(Number(altTotal), '有无共享契约，用例总数不该变（跳过不等于消失）').toBe(Number(total));
    }
  });

  it('列表页的过滤词与新建入口一律走 URL（一处实现，四处生效）', () => {
    // 回归：只有资料库认 ?q=，于是「从搜索跳过去」的三个页面显示全量列表；
    // 仪表板两个写着「新建」的按钮也只是跳转，落地还得再找一次按钮。
    for (const view of ['LibraryView', 'NotesView', 'CardsView', 'BookListsView']) {
      const source = at(`src/views/${view}.tsx`);
      expect(source, `${view} 必须用 useQueryFilter，过滤词才能被搜索/后退/分享带回`)
        .toContain('useQueryFilter()');
      expect(source, `${view} 的创建表单必须由 ?new=1 打开`).toContain('useCreateFlag()');
    }

    const search = at('src/views/SearchView.tsx');
    for (const route of ['/library', '/notes', '/cards', '/booklists']) {
      expect(search, `搜索结果的 ${route} 链接必须带查询词`).toContain(`'${route}' + carry`);
    }
    expect(search).toContain('encodeURIComponent(settledQuery.trim())');

    const dashboard = at('src/views/Dashboard.tsx');
    expect(dashboard).toContain('to="/library?new=1"');
    expect(dashboard).toContain('to="/notes?new=1"');
  });

  it('不存在点了没反应的按钮（Stage 0 审计里那一类死交互不许回来）', () => {
    // 审计记录的原始缺陷就是「Hero 播放按钮 / 新建书单无 onClick」：
    // 一个看起来能点、点了什么也不发生的东西，比没有这个按钮更伤信任。
    const dead: string[] = [];

    for (const { file, text } of ALL.filter((item) => item.file.endsWith('.tsx'))) {
      for (const tag of ['<Button', '<button']) {
        let cursor = findTag(text, 0, tag);
        while (cursor !== -1) {
          const tagText = readTag(text, cursor + tag.length - 1);
          if (tagText === null) {
            break; // 语法异常，交给 tsc 与 ESLint
          }
          const lines = text.slice(0, cursor).split('\n').length;
          // 允许两种合法情形：提交按钮，以及把 onClick 连同其它属性
          // 一起透传进来的原语组件（Button 自己的实现就是这样）。
          const legal =
            tagText.includes('onClick') ||
            tagText.includes('type="submit"') ||
            tagText.includes('{...');
          if (!legal) {
            dead.push(`${file}:${lines}`);
          }
          cursor = findTag(text, cursor + tagText.length, tag);
        }
      }
    }

    expect(dead, `这些按钮既不提交也没有 onClick：${dead.join('、')}`).toEqual([]);
  });

  it('四个表单页都要有看得见的拒绝理由（role="alert"）', () => {
    const silent = ['LibraryView', 'NotesView', 'CardsView', 'BookListsView'].filter(
      (view) => !at(`src/views/${view}.tsx`).includes('role="alert"'),
    );
    expect(silent, `这些表单页只把按钮置灰，用户不知道为什么不能提交：${silent.join('、')}`).toEqual([]);
  });

  it('破坏性确认必须与真实后果一致（清空 = 八类，不是三类）', () => {
    const dashboard = at('src/views/Dashboard.tsx');
    const repository = at('src/data/repository.ts');

    // 确认文案的数据源必须是全景；写死「资料/笔记/卡片」就是当年那个坑
    expect(dashboard).toContain('inventoryDetail');
    expect(dashboard).toMatch(/只有「导出 JSON 备份」能完整恢复/);
    expect(dashboard).toMatch(/仅笔记与卡片|不是完整备份/);

    // 全景必须覆盖 resetLibrary 清空的每一个仓储
    const cleared = new Set(
      [...repository.matchAll(/clear\('([A-Za-z]+)'\)/g)].map((match) => match[1]),
    );
    const covered = new Set(
      [...repository.matchAll(/store: '([A-Za-z]+)'/g)].map((match) => match[1]),
    );
    const missing = [...cleared].filter((store) => !covered.has(store));
    expect(missing, `清空这些仓储却没进备份全景：${missing.join('、')}`).toEqual([]);
    expect(cleared.size).toBe(8);
  });

  it('未提交的内容只暂存，绝不进数据层（草稿不是知识）', () => {
    const hook = at('src/hooks/useDraft.ts');
    expect(hook).toContain("'uread:draft:v1:'");
    // 草稿唯一的落点是 localStorage：出现 IndexedDB 或仓储 import，
    // 未提交的半成品就会顺着备份/导出变成「知识」。
    expect(hook).not.toMatch(/indexedDB|openDB|from '\.\.\/data\//);
    // 存不下时必须如实报 blocked，而不是静默失败
    expect(hook).toContain('setBlocked(true)');

    const leaked = ALL.filter(
      ({ file, text }) =>
        file.startsWith('src/data/') && (text.includes('localStorage') || text.includes('uread:draft')),
    ).map(({ file }) => file);
    expect(leaked, `草稿越界进了数据层（备份会把它当知识带走）：${leaked.join('、')}`).toEqual([]);
  });

  it('四个表单页都接了草稿，且都能清空', () => {
    // 回归的是「敲了半天的笔记，点一下导航栏就没了」：
    // 少接一个页面，用户就会在那个页面上再次丢输入，而界面从来不说会丢。
    for (const view of ['LibraryView', 'NotesView', 'CardsView', 'BookListsView']) {
      const source = at(`src/views/${view}.tsx`);
      expect(source, `${view} 没有暂存未提交内容，切页面或刷新会整段丢失`).toContain('useDraft(');
      expect(source, `${view} 少了草稿提示，恢复的内容会冒充已保存的条目`).toContain(
        '<DraftNotice draft={draft} />',
      );
      expect(source, `${view} 提交成功后不清空草稿，下次进来仍是旧内容`).toContain('draft.clear()');
    }

    // 提示语只能有一处：组件必须引用共享常量，自己另抄一份文案不算「有提示」。
    // （曾经写成 toContain('DRAFT_RESTORED_HINT')，结果 import 语句里也有这个词，
    //   把 JSX 里的引用换成硬编码文案后这条断言照样绿——变异核对才把它抓出来。）
    const notice = at('src/components/DraftNotice.tsx');
    const hook = at('src/hooks/useDraft.ts');
    expect(notice).toMatch(/\{DRAFT_RESTORED_HINT\}/);
    expect(notice).toMatch(/\{DRAFT_BLOCKED_HINT\}/);
    expect(hook).toContain('已恢复上次未提交的内容');
    expect(notice, '文案被抄进组件：以后某一页的「尚未保存」会悄悄丢掉').not.toContain('已恢复上次未提交的内容');
    expect(notice).toContain('丢弃草稿');
  });

  it('书单卡片必须解析书名，不许把 id 当文字渲染', () => {
    // 用户看得懂「深入理解计算机系统」，看不懂「book_7f3c…」；
    // 而只报「N 本书」等于把选择权藏起来——唯一的入口还是个编辑界面。
    const card = at('src/components/BookListCard.tsx');
    expect(card, '卡片必须渲染书名列表').toContain('<ul');
    expect(card, '书名要能点回资料库定位原文').toContain('/library?q=');
    expect(card, '深链必须转义书名（书名里有 & 或 # 时链接会断）').toContain('encodeURIComponent(entry.title)');
    // 注意区分 `key={entry.id}`（合法）与 `>{entry.id}<`（把内部 id 渲染成人话）
    expect(card, '不许把内部 id 渲染给用户').not.toMatch(/>\s*\{entry\.id\}/);

    // 折叠不是隐藏：必须说清还有几本，否则「5 本书」就成了谎话
    expect(card).toContain('展开全部');
    expect(card).toMatch(/entries\.length > BOOK_TITLE_LIMIT/);
  });

  it('阅读状态标签全仓库只有一处定义', () => {
    // 「在读 / 正在读 / 阅读中」这种漂移没人会发现，直到两份文案在界面上打架。
    const owners = ALL.filter(({ text }) => text.includes("'在读'")).map(({ file }) => file);
    expect(owners, `阅读状态标签只能定义在 src/data/labels.ts，现在有 ${owners.length} 处：${owners.join('、')}`).toEqual([
      'src/data/labels.ts',
    ]);

    const card = at('src/components/BookListCard.tsx');
    expect(card, '书单卡片要用共享标签，不要另写一份').toContain('READING_STATUS_LABEL');
  });

  it('不许出现「未知书籍」这类既不说原因也不给出路的文案', () => {
    // 「未知」把责任推给数据；真相是资料被删了，而且用户能改挂回去。
    // 只查字符串字面量与 JSX 文本：注释里引用这句旧文案是为了记住为什么不能这么写。
    const pattern = /['"](未知书籍|未知资料|未知来源)['"]|>\s*(未知书籍|未知资料|未知来源)\s*[<{]/;
    const vague = ALL.filter(({ text }) => pattern.test(text)).map(({ file }) => file);
    expect(vague, `这些文件还在用含糊文案：${vague.join('、')}`).toEqual([]);

    const labels = at('src/data/labels.ts');
    expect(labels, '孤儿文案必须定义在 src/data/labels.ts').toContain('export const ORPHAN_BOOK_LABEL =');
    // 这句话不许在别处再抄一遍：两处各写一份，迟早有一处漏改
    const duplicated = ALL.filter(
      ({ file, text }) => !file.endsWith('src/data/labels.ts') && text.includes('所属资料已删除'),
    ).map(({ file }) => file);
    expect(duplicated, `「所属资料已删除」只能出现在 labels.ts：${duplicated.join('、')}`).toEqual([]);
    // 视图与卡片都必须引用常量：两处各写一份，迟早有一处漏改
    expect(at('src/views/NotesView.tsx')).toContain('ORPHAN_BOOK_LABEL');
    expect(at('src/components/NoteCard.tsx')).toContain('ORPHAN_BOOK_HINT');
    expect(at('src/components/NoteCard.tsx')).toContain('ORPHAN_NO_TARGET_HINT');
  });

  it('没有可选目标时不许渲染空控件', () => {
    // 空 <select> / 空勾选框比不渲染更糟：它承诺了一个做不到的操作
    const card = at('src/components/NoteCard.tsx');
    expect(card, '没有可改挂的资料时必须换成说明文字').toContain('libraryBooks.length > 0');
  });
});
