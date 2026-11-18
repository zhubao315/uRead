import React, { useRef } from 'react';
import { Link } from 'react-router-dom';

import Button, { buttonClasses } from '../components/Button';
import Card from '../components/Card';
import ConfirmAction from '../components/ConfirmAction';
import FeedbackBanner from '../components/FeedbackBanner';
import { BookOpenIcon, ClockIcon, LightBulbIcon, StarIcon } from '../components/Icon';
import StateBlock from '../components/StateBlock';
import { useActionRunner } from '../hooks/useActionRunner';
import { computeStats, useLibraryStore } from '../store/libraryStore';

/** 触发浏览器下载。失败（例如内容过大）会抛出，由调用方处理。 */
function downloadBlob(content: string, mime: string, filename: string): void {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

const Dashboard: React.FC = () => {
  const books = useLibraryStore((state) => state.books);
  const notes = useLibraryStore((state) => state.notes);
  const cards = useLibraryStore((state) => state.cards);
  const error = useLibraryStore((state) => state.error);
  const errorHint = useLibraryStore((state) => state.errorHint);
  const loading = useLibraryStore((state) => state.loading);
  const initialized = useLibraryStore((state) => state.initialized);
  const load = useLibraryStore((state) => state.load);
  const exportJson = useLibraryStore((state) => state.exportJson);
  const importJson = useLibraryStore((state) => state.importJson);
  const exportMarkdown = useLibraryStore((state) => state.exportMarkdown);
  const importMarkdown = useLibraryStore((state) => state.importMarkdown);
  const reset = useLibraryStore((state) => state.reset);

  const fileInput = useRef<HTMLInputElement>(null);
  const { run, busy, feedback, dismiss } = useActionRunner();

  const stats = computeStats({ books, notes, cards });
  const inventoryText = useLibraryStore((state) => state.inventoryText);
  // 确认框必须说清真实后果：宁可写「未取到条数」，也不能只报三类、却清掉八类
  const inventoryDetail = inventoryText ?? '资料、笔记、卡片、书单、阅读记录、划线、批注、知识关系（未取到条数）';

  const statCards = [
    {
      label: '资料库',
      value: String(stats.bookCount),
      icon: <BookOpenIcon size="lg" />,
      path: '/library',
    },
    {
      label: '读书笔记',
      value: String(stats.noteCount),
      icon: <ClockIcon size="lg" />,
      path: '/notes',
    },
    {
      label: '知识卡片',
      value: String(stats.cardCount),
      icon: <LightBulbIcon size="lg" />,
      path: '/cards',
    },
    {
      label: '已核验卡片',
      value: String(stats.reviewedCardCount),
      icon: <StarIcon size="lg" />,
      path: '/cards',
    },
  ];

  const recentNotes = notes.slice(0, 5);

  const stamp = () => new Date().toISOString().slice(0, 10);

  const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    const text = await file.text();
    const isMarkdown = file.name.endsWith('.md');

    await run(
      async () => {
        if (isMarkdown) {
          const result = await importMarkdown(text);
          // 部分恢复必须说出来：只报成功条数会让人以为备份已完整回来
          if (result.skipped > 0) {
            return `已从 Markdown 恢复 ${result.imported} 条资产，另有 ${result.skipped} 个区块无法解析（这些内容没有写回，请检查文件是否被手工编辑过）`;
          }
          return `已从 Markdown 恢复 ${result.imported} 条资产`;
        }
        const result = await importJson(JSON.parse(text) as never);
        if (!result.complete) {
          return (
            `已恢复 ${result.restored_total} 条，但这个备份（格式 v${result.bundle_version}）里没有：` +
            `${result.missing.join('、')}。这些类型的数据本机已被清空且无法找回；` +
            '今后请用「导出 JSON 备份」重新导出一份完整备份'
          );
        }
        return `已从 JSON 备份完整恢复 ${result.restored_total} 条（含阅读记录、划线、批注、知识关系）`;
      },
      {
        label: `导入 ${file.name}`,
        // success 返回字符串时由 runner 直接展示
        success: (message) => message as string,
      },
    );

    if (fileInput.current) {
      fileInput.current.value = '';
    }
  };

  return (
    <div className="space-y-8 font-inter">
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-cyan-700 rounded-2xl text-white">
        <div className="absolute inset-0 bg-black opacity-10"></div>
        <div className="relative px-8 py-16 text-center">
          <h1 className="text-4xl md:text-5xl font-inter font-bold mb-6 leading-tight">
            让每一次阅读，都留下可生长的沉淀
          </h1>
          <p className="text-lg md:text-xl opacity-90 mb-10 max-w-2xl mx-auto">
            uRead · 本地优先的阅读与知识萃取工作台
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            {/* ?new=1：写着「导入资料」，落地就得是可提交的表单。
                这里是链接而不是 a 里套 button：交互内容嵌套是无效 HTML，
                读屏软件会念成「链接，内含按钮」，键盘用户还得多空按一次回车。 */}
            <Link
              to="/library?new=1"
              className={buttonClasses({
                variant: 'secondary',
                size: 'lg',
                className: 'w-full sm:w-auto text-center inline-block',
              })}
            >
              导入资料
            </Link>
            <Link
              to="/notes?new=1"
              className={buttonClasses({
                variant: 'outline',
                size: 'lg',
                className:
                  'w-full sm:w-auto text-center inline-block border-white text-white hover:bg-white hover:text-blue-700',
              })}
            >
              写第一条笔记
            </Link>
          </div>
        </div>
      </section>

      {/* 读取失败要挡住后续操作：数据都没读到，统计数字就全是假的 */}
      {error ? <StateBlock error={error} hint={errorHint} onRetry={() => void load()} /> : null}

      <FeedbackBanner feedback={feedback} onDismiss={dismiss} />

      {error ? null : (
        <section aria-label="学习概览">
          <h2 className="text-2xl font-inter font-semibold text-gray-900 mb-6">学习概览</h2>
          {loading && !initialized ? (
            <Card variant="default" className="p-6">
              <p role="status" className="text-sm font-inter text-gray-600">
                正在读取本地数据…
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {statCards.map((stat) => (
                <Link key={stat.label} to={stat.path} className="block">
                  <Card variant="glass" hoverEffect className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-3 rounded-xl bg-blue-50 text-blue-600">{stat.icon}</div>
                    </div>
                    <p className="text-sm font-inter text-gray-600 mb-1">{stat.label}</p>
                    <p className="text-3xl font-inter font-bold text-gray-900">{stat.value}</p>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <section>
          <Card variant="default" className="p-6">
            <h2 className="text-xl font-inter font-semibold text-gray-900 mb-4">最近笔记</h2>
            {recentNotes.length === 0 ? (
              <p className="font-inter text-sm text-gray-600">
                还没有笔记。到
                <Link to="/notes" className="mx-1 text-blue-600 hover:text-blue-800 underline">
                  读书笔记
                </Link>
                记录第一条阅读心得。
              </p>
            ) : (
              <div className="space-y-3">
                {recentNotes.map((note) => (
                  <Link
                    key={note.id}
                    to={`/search?q=${encodeURIComponent(note.title)}`}
                    className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors duration-150"
                  >
                    <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-inter font-medium text-gray-900 truncate">{note.title}</p>
                      <p className="text-xs font-inter text-gray-600">
                        {new Date(note.created_at).toLocaleString('zh-CN')}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </Card>
        </section>

        <section>
          <Card variant="default" className="p-6">
            <h2 className="text-xl font-inter font-semibold text-gray-900 mb-4">数据管理</h2>
            <p className="font-inter text-sm text-gray-600 mb-4">
              数据保存在本机浏览器（IndexedDB），可随时导出备份或迁移到其他设备。
              <strong>清除浏览器数据会一并删除这些内容</strong>，长期保留请先导出。
            </p>
            <div className="flex flex-wrap gap-3">
              <Button
                variant="primary"
                isLoading={busy}
                onClick={() =>
                  void run(
                    async () => {
                      const bundle = await exportJson();
                      downloadBlob(
                        JSON.stringify(bundle, null, 2),
                        'application/json',
                        `uread-library-${stamp()}.json`,
                      );
                      return '已导出 JSON 备份：含资料、笔记、卡片、书单、阅读记录、划线、批注、知识关系（请确认浏览器已下载该文件）';
                    },
                    { label: '导出 JSON' },
                  )
                }
              >
                导出 JSON 备份
              </Button>
              <Button
                variant="outline"
                isLoading={busy}
                onClick={() =>
                  void run(
                    async () => {
                      const markdown = await exportMarkdown();
                      downloadBlob(
                        markdown,
                        'text/markdown',
                        `uread-knowledge-${stamp()}.md`,
                      );
                      return '已导出 Markdown 知识资产：只有笔记与卡片，**不是完整备份**（其余类型请用「导出 JSON 备份」）';
                    },
                    { label: '导出 Markdown' },
                  )
                }
              >
                导出 Markdown（仅笔记与卡片）
              </Button>
              <Button variant="outline" disabled={busy} onClick={() => fileInput.current?.click()}>
                导入备份
              </Button>
              <input
                ref={fileInput}
                type="file"
                accept=".json,.md"
                aria-label="选择要导入的备份文件"
                className="hidden"
                onChange={handleImportFile}
              />
              <ConfirmAction
                label="清空本地数据"
                confirmLabel="确认清空全部数据？"
                detail={`会删除本机全部数据（${inventoryDetail}），且无法撤销；只有「导出 JSON 备份」能完整恢复，Markdown 导出不含其余类型`}
                disabled={busy}
                onConfirm={() =>
                  run(() => reset(), {
                    success: '已清空本机数据（含合成示例库）',
                    label: '清空本地数据',
                  })
                }
              />
            </div>
          </Card>
        </section>
      </div>
    </div>
  );
};

export default Dashboard;
