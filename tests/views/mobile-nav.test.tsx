/** 移动端底部导航：只给公开站四个内容入口，工作台不混进来。 */
// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import MobileBottomNav from '../../src/components/MobileBottomNav';

afterEach(() => cleanup());

describe('移动端底部导航', () => {
  it('四个入口且书籍指向静态书库', () => {
    render(<MemoryRouter initialEntries={['/read']}><MobileBottomNav /></MemoryRouter>);
    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(4);
    expect(screen.getByText('首页')).toBeInTheDocument();
    expect(screen.getByText('笔记')).toBeInTheDocument();
    expect(screen.getByText('书单')).toBeInTheDocument();
    expect(screen.getByText('书籍').closest('a')?.getAttribute('href')).toBe('/uRead/books/');
  });

  it('工作台不作为公开站主入口', () => {
    render(<MemoryRouter><MobileBottomNav /></MemoryRouter>);
    expect(screen.queryByText('工作台')).not.toBeInTheDocument();
  });
});
