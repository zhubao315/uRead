/**
 * 阅读闭环（工作台）：现实问题 → 选书 → 阅读 → 费曼输出 → 应用验证。
 *
 * 刻意复用现有 Note 结构：intent / feynman 只是 note_kind 的两种新用途，
 * 关联用已有的 book_id 与 KnowledgeRelation。不新增 Store、不改八类备份契约。
 * AI 只提供可复制的 Prompt 模板；不调用任何 API，不自动写入人的笔记。
 */
import React, { useMemo, useState } from 'react';

import Button from '../components/Button';
import ConfirmAction from '../components/ConfirmAction';
import DraftNotice from '../components/DraftNotice';
import FeedbackBanner from '../components/FeedbackBanner';
import StateBlock, { resolveState } from '../components/StateBlock';
import { NOTE_KIND_LABEL, PROVENANCE_LABEL } from '../data/labels';
import type { ContentProvenance, Note } from '../data/types';
import { useActionRunner } from '../hooks/useActionRunner';
import { useDraft } from '../hooks/useDraft';
import { useLibraryStore } from '../store/libraryStore';

type Tab = 'intent' | 'feynman';

const AI_PROMPTS = [
  {
    title: '解释概念',
    text: '请用通俗语言解释这本书中的核心概念，举一个我熟悉的例子，并指出最常见的误解。只作为背景参考，不要替我写理解。',
  },
  {
    title: '梳理框架',
    text: '请按「问题 → 论点 → 证据 → 结论」整理这本书的结构，标出作者没有回答的问题。',
  },
  {
    title: '苏格拉底式追问',
    text: '针对我的复述，依次提出三个能暴露概念混淆、逻辑跳跃和适用边界的问题；不要直接给出答案。',
  },
];

const section = (heading: string, body: string) => `## ${heading}\n\n${body.trim() || '（尚未填写）'}\n`;

const provenanceOf = (note: Note): ContentProvenance =>
  note.metadata.provenance ?? 'HUMAN_WRITTEN';

const ReadingLoopView: React.FC = () => {
  const [tab, setTab] = useState<Tab>('intent');
  const notes = useLibraryStore((state) => state.notes);
  const books = useLibraryStore((state) => state.books);
  const relations = useLibraryStore((state) => state.relations);
  const addNote = useLibraryStore((state) => state.addNote);
  const updateNote = useLibraryStore((state) => state.updateNote);
  const removeNote = useLibraryStore((state) => state.removeNote);
  const link = useLibraryStore((state) => state.link);
  const load = useLibraryStore((state) => state.load);
  const error = useLibraryStore((state) => state.error);
  const errorHint = useLibraryStore((state) => state.errorHint);
  const loading = useLibraryStore((state) => state.loading);
  const initialized = useLibraryStore((state) => state.initialized);
  const { run, busy, feedback, dismiss } = useActionRunner();

  const intentDraft = useDraft('loop-intent', {
    title: '', problem: '', why: '', goal: '', current: '', gap: '', choice: '', bookId: '', candidates: '',
  });
  const feynmanDraft = useDraft('loop-feynman', {
    title: '', claim: '', explain: '', experience: '', doubt: '', apply: '', bookId: '', intentId: '',
  });

  const intents = useMemo(() => notes.filter((note) => note.note_kind === 'intent'), [notes]);
  const outputs = useMemo(() => notes.filter((note) => note.note_kind === 'feynman'), [notes]);
  const bookTitle = (id?: string) => (id ? books.find((book) => book.id === id)?.title ?? '资料已删除' : '未关联资料');

  const relatedBookIds = (noteId: string) =>
    relations.filter((relation) => relation.source_id === noteId && relation.type === 'related_to')
      .map((relation) => relation.target_id);

  // 即使资料库是空的，也应该能先写下「我为什么读」——这是闭环的起点，不是空状态。
  const viewState = resolveState({ error, loading, initialized, isEmpty: false });

  const submitIntent = async (event: React.FormEvent) => {
    event.preventDefault();
    const v = intentDraft.values;
    if (!v.title.trim() || !v.problem.trim()) {
      return;
    }
    const content = [
      section('我现在真正想解决什么', v.problem),
      section('为什么需要读', v.why),
      section('希望通过阅读解决什么', v.goal),
      section('我现在对此的认识', v.current),
      section('目前的知识缺口', v.gap),
      section('最终选择与理由', v.choice),
    ].join('\n');
    const candidates = v.candidates.split(/[,，\s]+/).filter(Boolean);
    const ok = await run(
      async () => {
        const note = await addNote({
          title: v.title.trim(),
          content,
          note_kind: 'intent',
          book_id: v.bookId || undefined,
          tags: ['阅读意图', ...candidates],
          provenance: 'HUMAN_WRITTEN',
        });
        for (const id of candidates) {
          if (books.some((book) => book.id === id)) {
            await link('related_to', note.id, id);
          }
        }
      },
      { label: '保存阅读意图', success: '阅读意图已保存，选书理由也一并留下来了', onDone: intentDraft.clear },
    );
    void ok;
  };

  const submitFeynman = async (event: React.FormEvent) => {
    event.preventDefault();
    const v = feynmanDraft.values;
    if (!v.title.trim() || !v.claim.trim()) {
      return;
    }
    const content = [
      section('这本书最重要的观点', v.claim),
      section('不看原文，我自己的解释', v.explain),
      section('与我真实经验的联系', v.experience),
      section('我的认同与质疑', v.doubt),
      section('我准备应用到哪个场景', v.apply),
    ].join('\n');
    const ok = await run(
      async () => {
        const note = await addNote({
          title: v.title.trim(),
          content,
          note_kind: 'feynman',
          book_id: v.bookId || undefined,
          tags: ['费曼输出'],
          provenance: 'HUMAN_WRITTEN',
        });
        if (v.intentId) {
          await link('derived_from', note.id, v.intentId);
        }
      },
      { label: '保存费曼输出', success: '费曼输出已保存', onDone: feynmanDraft.clear },
    );
    void ok;
  };

  const verify = (note: Note) => run(
    () => updateNote(note.id, { metadata: { ...note.metadata, provenance: 'HUMAN_VERIFIED' } }),
    { label: '标记核验', success: '已标记为本人核验' },
  );

  return (
    <section className="mx-auto max-w-5xl px-5 py-8 font-inter text-body">
      <header className="mb-6">
        <p className="text-sm text-muted">工作台 / 阅读闭环</p>
        <h1 className="font-editorial mt-1 text-3xl text-navy">为问题而读，亲自理解，用输出检验认知</h1>
        <p className="mt-2 text-sm text-muted">
          阅读是人的事情，AI 是工具。这里只保存你亲笔写下的意图、摘录、复述与判断。
        </p>
      </header>

      {feedback ? <FeedbackBanner feedback={feedback} onDismiss={dismiss} /> : null}
      <StateBlock
        error={error}
        hint={errorHint}
        onRetry={() => void load()}
        loading={loading}
        loadingText="正在读取本机阅读闭环…"
        emptyTitle="还没有资料库内容"
        emptyAction={<a href="#/workspace/library" className="text-brand hover:underline">先去资料库添加一本书</a>}
      />

      {viewState === 'content' ? (
        <>
          <div className="mb-6 flex flex-wrap gap-2" role="tablist" aria-label="阅读闭环步骤">
            {([
              ['intent', '01 问题与选书'],
              ['feynman', '03 用自己的话讲清楚'],
            ] as const).map(([key, label]) => (
              <button key={key} type="button" role="tab" aria-selected={tab === key}
                onClick={() => setTab(key)}
                className={`rounded-full px-4 py-2 text-sm ${tab === key ? 'bg-navy text-white' : 'border border-border bg-surface text-navy'}`}>
                {label}
              </button>
            ))}
          </div>

          {tab === 'intent' ? (
            <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
              <form onSubmit={(event) => void submitIntent(event)} className="rounded-xl border border-border bg-surface p-5">
                <h2 className="font-editorial text-xl text-navy">我现在想解决什么问题？</h2>
                <DraftNotice draft={intentDraft} />
                <label className="mt-4 block text-sm">问题标题
                  <input value={intentDraft.values.title} onChange={(e) => intentDraft.set({ title: e.target.value })}
                    className="mt-1 w-full rounded border border-border px-3 py-2" placeholder="例如：如何提高投资决策质量" />
                </label>
                {([
                  ['problem', '我现在真正想解决什么'],
                  ['why', '为什么需要读'],
                  ['goal', '希望通过阅读解决什么'],
                  ['current', '我现在对此的认识'],
                  ['gap', '目前的知识缺口'],
                  ['choice', '最终选择与理由'],
                ] as const).map(([key, label]) => (
                  <label key={key} className="mt-3 block text-sm">{label}
                    <textarea value={intentDraft.values[key]} onChange={(e) => intentDraft.set({ [key]: e.target.value })}
                      rows={2} className="mt-1 w-full rounded border border-border px-3 py-2" />
                  </label>
                ))}
                <label className="mt-3 block text-sm">关联资料（可选）
                  <select value={intentDraft.values.bookId} onChange={(e) => intentDraft.set({ bookId: e.target.value })}
                    className="mt-1 w-full rounded border border-border px-3 py-2">
                    <option value="">暂不关联</option>
                    {books.map((book) => <option key={book.id} value={book.id}>{book.title}</option>)}
                  </select>
                </label>
                <label className="mt-3 block text-sm">候选书籍 ID（逗号分隔，AI 可参考但不替你决定）
                  <input value={intentDraft.values.candidates} onChange={(e) => intentDraft.set({ candidates: e.target.value })}
                    className="mt-1 w-full rounded border border-border px-3 py-2" placeholder="book-id-1, book-id-2" />
                </label>
                <div className="mt-5"><Button type="submit" disabled={busy}>保存阅读意图</Button></div>
              </form>

              <div>
                <h2 className="font-editorial text-xl text-navy">我的问题库（{intents.length}）</h2>
                {intents.length === 0 ? <p className="mt-3 text-sm text-muted">还没有记录阅读意图。先写下你真正想解决的问题。</p> : null}
                <ul className="mt-3 space-y-3">
                  {intents.map((note) => (
                    <li key={note.id} className="rounded-lg border border-border bg-surface p-4">
                      <p className="font-semibold text-navy">{note.title}</p>
                      <p className="mt-1 text-xs text-muted">
                        {bookTitle(note.book_id)} · {PROVENANCE_LABEL[provenanceOf(note)]}
                      </p>
                      {relatedBookIds(note.id).length ? (
                        <p className="mt-1 text-xs text-muted">
                          候选：{relatedBookIds(note.id).map(bookTitle).join('、')}
                        </p>
                      ) : null}
                      <p className="mt-2 line-clamp-3 whitespace-pre-line text-sm text-muted">{note.content}</p>
                      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
                        {provenanceOf(note) !== 'HUMAN_VERIFIED' ? (
                          <button type="button" onClick={() => void verify(note)} className="text-brand hover:underline">标记已核验</button>
                        ) : null}
                        <ConfirmAction label="删除" confirmLabel="确认删除这条阅读意图？"
                          disabled={busy} onConfirm={() => removeNote(note.id)} />
                      </div>
                    </li>
                  ))}
                </ul>
                <AIPromptBox />
              </div>
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
              <form onSubmit={(event) => void submitFeynman(event)} className="rounded-xl border border-border bg-surface p-5">
                <h2 className="font-editorial text-xl text-navy">用自己的话讲清楚</h2>
                <DraftNotice draft={feynmanDraft} />
                <label className="mt-4 block text-sm">标题
                  <input value={feynmanDraft.values.title} onChange={(e) => feynmanDraft.set({ title: e.target.value })}
                    className="mt-1 w-full rounded border border-border px-3 py-2" placeholder="例如：我如何理解《思考，快与慢》" />
                </label>
                {([
                  ['claim', '这本书最重要的观点是什么'],
                  ['explain', '不看原文，我能不能讲明白'],
                  ['experience', '与我的生活、工作或投资经验有什么关系'],
                  ['doubt', '哪些观点我不完全认同，还有什么问题没解决'],
                  ['apply', '我准备把这个观点应用到哪个具体场景'],
                ] as const).map(([key, label]) => (
                  <label key={key} className="mt-3 block text-sm">{label}
                    <textarea value={feynmanDraft.values[key]} onChange={(e) => feynmanDraft.set({ [key]: e.target.value })}
                      rows={3} className="mt-1 w-full rounded border border-border px-3 py-2" />
                  </label>
                ))}
                <label className="mt-3 block text-sm">关联资料
                  <select value={feynmanDraft.values.bookId} onChange={(e) => feynmanDraft.set({ bookId: e.target.value })}
                    className="mt-1 w-full rounded border border-border px-3 py-2">
                    <option value="">不关联</option>
                    {books.map((book) => <option key={book.id} value={book.id}>{book.title}</option>)}
                  </select>
                </label>
                <label className="mt-3 block text-sm">回应哪个阅读问题
                  <select value={feynmanDraft.values.intentId} onChange={(e) => feynmanDraft.set({ intentId: e.target.value })}
                    className="mt-1 w-full rounded border border-border px-3 py-2">
                    <option value="">不关联</option>
                    {intents.map((note) => <option key={note.id} value={note.id}>{note.title}</option>)}
                  </select>
                </label>
                <div className="mt-5"><Button type="submit" disabled={busy}>保存费曼输出</Button></div>
              </form>

              <div>
                <h2 className="font-editorial text-xl text-navy">内化记录（{outputs.length}）</h2>
                {outputs.length === 0 ? <p className="mt-3 text-sm text-muted">还没有输出。不复述一遍，就很难知道自己是否真的理解。</p> : null}
                <ul className="mt-3 space-y-3">
                  {outputs.map((note) => (
                    <li key={note.id} className="rounded-lg border border-border bg-surface p-4">
                      <p className="font-semibold text-navy">{note.title}</p>
                      <p className="mt-1 text-xs text-muted">
                        {NOTE_KIND_LABEL[note.note_kind]} · {bookTitle(note.book_id)} · {PROVENANCE_LABEL[provenanceOf(note)]}
                      </p>
                      <p className="mt-2 line-clamp-4 whitespace-pre-line text-sm text-muted">{note.content}</p>
                      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
                        {provenanceOf(note) !== 'HUMAN_VERIFIED' ? (
                          <button type="button" onClick={() => void verify(note)} className="text-brand hover:underline">标记已核验</button>
                        ) : null}
                        <ConfirmAction label="删除" confirmLabel="确认删除这条费曼输出？"
                          disabled={busy} onConfirm={() => removeNote(note.id)} />
                      </div>
                    </li>
                  ))}
                </ul>
                <AIPromptBox />
              </div>
            </div>
          )}

          <p className="mt-10 rounded-lg border border-border bg-mist/40 p-4 text-xs text-muted">
            当前版本不调用任何 AI 服务，也不会把 Prompt 结果自动写入笔记。
            AI 生成的内容如需保留，请由你亲自编辑确认，并主动标记为「本人已核验」。
          </p>
        </>
      ) : null}
    </section>
  );
};

/** AI 只提供可复制的 Prompt 模板；结果不自动回填，更不会冒充个人理解。 */
const AIPromptBox: React.FC = () => (
  <aside className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4" aria-label="AI 参考提示词">
    <p className="text-sm font-semibold text-amber-900">AI 伴读参考（需主动触发）</p>
    <p className="mt-1 text-xs text-amber-800">以下只是可复制的提问模板；AI 不能替你阅读、感受或判断。</p>
    <ul className="mt-3 space-y-2">
      {AI_PROMPTS.map((prompt) => (
        <li key={prompt.title} className="rounded border border-amber-200 bg-white p-3">
          <p className="text-xs font-semibold text-navy">{prompt.title}</p>
          <p className="mt-1 text-xs text-muted">{prompt.text}</p>
        </li>
      ))}
    </ul>
  </aside>
);

export default ReadingLoopView;
