/**
 * 组件层的可见行为断言。
 *
 * 这一类断言以前是空白：四个视图把「读取失败」渲染成「资料库是空的，先导入一本书」，
 * 没有任何测试会发现它，而它的后果是使用者去重复导入、甚至清库重来。
 */
// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import ConfirmAction from '../../src/components/ConfirmAction';
import FeedbackBanner from '../../src/components/FeedbackBanner';
import StateBlock, { resolveState } from '../../src/components/StateBlock';

describe('StateBlock 区分出错 / 加载 / 空', () => {
  it('出错态是可中断的告警，带重试按钮', () => {
    render(<StateBlock error="浏览器拒绝打开本地数据库" hint="关闭其它标签页后重试" onRetry={vi.fn()} />);

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('本地数据读取失败');
    expect(alert).toHaveTextContent('浏览器拒绝打开本地数据库');
    expect(alert).toHaveTextContent('关闭其它标签页后重试');
    expect(screen.getByRole('button', { name: '重试' })).toBeInTheDocument();
    // 出错时绝不应该出现“先导入一本书”这类新手引导
    expect(alert).not.toHaveTextContent('导入');
  });

  it('没有 onRetry 就不渲染重试按钮', () => {
    render(<StateBlock error="读取失败" />);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('点击重试会真的重新读取', () => {
    const onRetry = vi.fn();
    render(<StateBlock error="读取失败" onRetry={onRetry} />);

    fireEvent.click(screen.getByRole('button', { name: '重试' }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('加载态是 polite 的 status 区域并给出等待说明', () => {
    render(<StateBlock loading loadingText="正在读取本地数据…" />);

    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('正在读取本地数据');
    // 骨架占位对读屏应当隐藏，否则会念一堆无意义的内容
    expect(status.querySelector('[aria-hidden="true"]')).not.toBeNull();
  });

  it('空态与出错态是两种不同的界面（这是本轮修复的核心）', () => {
    const { rerender } = render(<StateBlock emptyTitle="资料库是空的" />);
    const empty = screen.getByRole('status');
    expect(empty).toHaveTextContent('资料库是空的');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    rerender(<StateBlock error="浏览器拒绝打开本地数据库" />);
    expect(screen.getByRole('alert')).toHaveTextContent('本地数据读取失败');
    expect(screen.queryByText('资料库是空的')).not.toBeInTheDocument();
  });

  it('resolveState 对同一组输入给出与渲染一致的结论', () => {
    expect(resolveState({ error: 'x', isEmpty: true })).toBe('error');
    expect(resolveState({ loading: true, initialized: false, isEmpty: true })).toBe('loading');
    expect(resolveState({ initialized: true, isEmpty: true })).toBe('empty');
    expect(resolveState({ initialized: true, isEmpty: false })).toBe('content');
  });
});

describe('ConfirmAction 破坏性动作两步确认', () => {
  it('第一次点击只进入确认态，不执行', () => {
    const onConfirm = vi.fn();
    render(
      <ConfirmAction
        label="删除"
        confirmLabel="确认删除？"
        detail="会连带删除 3 条笔记"
        onConfirm={onConfirm}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '删除' }));

    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: '确认删除？' })).toBeInTheDocument();
    // 后果必须在执行前就说明，而不是删完才提示
    expect(screen.getByRole('status')).toHaveTextContent('会连带删除 3 条笔记');
  });

  it('第二次点击才执行，且执行后退回正常态', () => {
    const onConfirm = vi.fn();
    render(<ConfirmAction label="删除" confirmLabel="确认删除？" onConfirm={onConfirm} />);

    fireEvent.click(screen.getByRole('button', { name: '删除' }));
    fireEvent.click(screen.getByRole('button', { name: '确认删除？' }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: '删除' })).toBeInTheDocument();
  });

  it('忙碌时可被禁用（避免连点产生竞态）', () => {
    const onConfirm = vi.fn();
    render(<ConfirmAction label="删除" confirmLabel="确认删除？" onConfirm={onConfirm} disabled />);

    fireEvent.click(screen.getByRole('button', { name: '删除' }));
    fireEvent.click(screen.getByRole('button', { name: '删除' }));

    expect(onConfirm).not.toHaveBeenCalled();
  });
});

describe('FeedbackBanner 替代 window.alert', () => {
  it('错误提示带下一步动作并可关闭', () => {
    const onDismiss = vi.fn();
    render(
      <FeedbackBanner
        feedback={{ kind: 'error', text: '导入失败：导入的文件不是合法 JSON', hint: '请使用导出功能生成的文件' }}
        onDismiss={onDismiss}
      />,
    );

    const banner = screen.getByRole('status');
    expect(banner).toHaveTextContent('导入失败');
    expect(banner).toHaveTextContent('请使用导出功能生成的文件');

    fireEvent.click(screen.getByRole('button', { name: '关闭提示' }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('没有反馈时不渲染任何节点', () => {
    render(<FeedbackBanner feedback={null} />);

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
