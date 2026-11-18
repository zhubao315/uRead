/**
 * 错误文案的映射表是可执行断言。
 *
 * `describeError` 是本地优先应用最后一道「可读性」防线：IndexedDB 抛的是英文
 * 技术语，直接显示等于把排查工作丢给不懂代码的使用者。每条映射都必须被测试覆盖，
 * 否则改文案时没人知道哪条悄悄退回了英文原文。
 */
import { describe, expect, it } from 'vitest';

import { describeError } from '../../src/store/errors';

function error(name: string, message: string): Error {
  const built = new Error(message);
  built.name = name;
  return built;
}

describe('describeError 把底层异常翻译成可执行的下一步', () => {
  const cases: Array<[string, string, string]> = [
    ['NotReadableError', 'The database is already open', '浏览器拒绝打开本地数据库'],
    ['InvalidStateError', 'Connection is closed', '浏览器数据库连接已失效'],
    ['QuotaExceededError', 'quota exceeded', '浏览器存储空间不足，写入没有完成'],
    ['SecurityError', 'blocked', '浏览器出于隐私设置禁止了本地存储'],
    ['AbortError', 'aborted', '本次操作被浏览器中断'],
    ['VersionError', 'older version', '本地数据的版本与当前程序不一致'],
    ['SyntaxError', 'Unexpected token', '导入的文件不是合法 JSON'],
    ['TypeError', 'x is undefined', '导入的数据结构与预期不符'],
  ];

  it.each(cases)('%s → %s', (name, message, expected) => {
    const result = describeError(error(name, message));

    expect(result.message).toBe(expected);
    expect(result.hint.length).toBeGreaterThan(8);
  });

  it('每条已知映射都给出下一步动作，而不是只说“出错了”', () => {
    for (const [name, message] of cases.map(([a, b]) => [a, b])) {
      const result = describeError(error(name, message));
      expect(result.message).not.toMatch(/出错了|错误|失败$/u);
      expect(result.hint).toMatch(/[。，；]/u);
    }
  });

  it('仓储层的业务错误保留对象名、去掉内部 id 噪音', () => {
    const result = describeError(error('Error', '图书不存在: book_1f2e3d4c'));

    expect(result.message).toBe('图书不存在');
    expect(result.message).not.toContain('book_1f2e3d4c');
    expect(result.hint).toContain('刷新列表');
  });

  it('JSON 解析异常即使 name 不是 SyntaxError 也按导入文件处理', () => {
    const result = describeError(error('Error', 'Unexpected token } in JSON at position 42'));

    expect(result.message).toBe('导入的文件不是合法 JSON');
  });

  it('未知异常保留原文，但仍必须给出可照做的动作', () => {
    const result = describeError(error('SomeBrowserError', 'Failed to execute put'));

    expect(result.message).toBe('Failed to execute put');
    expect(result.hint).toContain('导出');
  });

  it('空异常（非 Error / 无 message）不能渲染出空白提示', () => {
    for (const value of [undefined, null, 'string failure', {}]) {
      const result = describeError(value);

      expect(result.message.trim().length).toBeGreaterThan(0);
      expect(result.hint.trim().length).toBeGreaterThan(0);
    }
  });

  it('没有 message 的 Error 也走兜底文案', () => {
    const result = describeError(new Error());

    expect(result.message).toBe('操作未完成');
  });
});
