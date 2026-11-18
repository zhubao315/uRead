import { beforeEach, describe, expect, it } from 'vitest';

import { useLibraryStore, computeStats } from '../../src/store/libraryStore';
import * as repo from '../../src/data/repository';

describe('library store', () => {
  beforeEach(async () => {
    await repo.resetLibrary();
    useLibraryStore.setState({ books: [], notes: [], cards: [], booklists: [], relations: [] });
  });

  it('load 读取本地数据到状态', async () => {
    await repo.createBook({ title: '状态测试书' });
    await useLibraryStore.getState().load();

    const state = useLibraryStore.getState();
    expect(state.books).toHaveLength(1);
    expect(state.initialized).toBe(true);
    expect(state.loading).toBe(false);
  });

  it('新增笔记后状态同步更新', async () => {
    await useLibraryStore.getState().load();
    await useLibraryStore.getState().addNote({ title: '新笔记', content: '内容' });

    const state = useLibraryStore.getState();
    expect(state.notes).toHaveLength(1);
    expect(state.notes[0].title).toBe('新笔记');
  });

  it('删除笔记后状态同步移除', async () => {
    await useLibraryStore.getState().load();
    const note = await useLibraryStore.getState().addNote({ title: '待删除', content: '内容' });
    await useLibraryStore.getState().removeNote(note.id);

    expect(useLibraryStore.getState().notes).toHaveLength(0);
  });

  it('新增卡片并标记核验', async () => {
    await useLibraryStore.getState().load();
    const card = await useLibraryStore.getState().addCard({ title: '卡片', content: '内容' });
    await useLibraryStore.getState().updateCard(card.id, { reviewed: true });

    const state = useLibraryStore.getState();
    expect(state.cards[0].reviewed).toBe(true);
  });

  it('统计指标全部由真实数据计算', async () => {
    await useLibraryStore.getState().load();
    await useLibraryStore.getState().addBook({ title: '书' });
    await useLibraryStore.getState().addNote({ title: '笔记', content: '内容' });
    await useLibraryStore.getState().addCard({ title: '卡片', content: '内容' });

    const state = useLibraryStore.getState();
    const stats = computeStats(state);
    expect(stats.bookCount).toBe(1);
    expect(stats.noteCount).toBe(1);
    expect(stats.cardCount).toBe(1);
    expect(stats.reviewedCardCount).toBe(0);
    expect(stats.highlightCount).toBe(0);
  });

  it('重置后清空本地数据', async () => {
    await useLibraryStore.getState().load();
    await useLibraryStore.getState().addNote({ title: '将被清空', content: '内容' });
    await useLibraryStore.getState().reset();

    expect(useLibraryStore.getState().notes).toHaveLength(0);
    expect(await repo.listNotes()).toHaveLength(0);
  });

  it('加载示例库后状态与本地库一致，且标注为合成数据', async () => {
    const counts = await useLibraryStore.getState().loadSample();

    expect(counts.skipped).toBe(false);
    const state = useLibraryStore.getState();
    expect(state.books).toHaveLength(counts.books);
    expect(state.notes).toHaveLength(counts.notes);
    expect(state.cards).toHaveLength(counts.cards);
    expect(state.relations).toHaveLength(counts.relations);
    expect(state.books.every((book) => (book.metadata.tags ?? []).includes('synthetic-demo'))).toBe(
      true,
    );
    expect(state.sampleBusy).toBe(false);
  });

  it('重复加载示例库不重复写入，清除只删示例', async () => {
    await useLibraryStore.getState().loadSample();
    const realBook = await useLibraryStore.getState().addBook({ title: '真实书目' });

    const second = await useLibraryStore.getState().loadSample();
    expect(second.skipped).toBe(true);
    expect(useLibraryStore.getState().books).toHaveLength(4);

    const removed = await useLibraryStore.getState().removeSample();
    expect(removed.books).toBe(3);
    expect(useLibraryStore.getState().books.map((book) => book.id)).toEqual([realBook.id]);
    expect(useLibraryStore.getState().relations).toHaveLength(0);
  });
});
