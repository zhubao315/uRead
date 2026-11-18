/**
 * 把底层异常翻译成「用户能照做」的话。
 *
 * 为什么需要单独一层：uRead 是本地优先应用，真正的失败来自 IndexedDB 与
 * JSON 解析，而这些异常默认是英文技术语（`QuotaExceededError`、
 * `Unexpected token ...`）。直接显示给用户，等于把排查工作丢给不懂代码的人。
 *
 * 约定：每条文案都必须给出**下一步动作**，不能只说「出错了」。
 */

export interface ActionableError {
  /** 一句话说明发生了什么（中文，面向使用者）。 */
  message: string;
  /** 用户可以立刻照做的动作。 */
  hint: string;
}

/** 已知的浏览器异常名 → 可读说明。新增条目必须同时补测试。 */
const KNOWN: Record<string, ActionableError> = {
  NotReadableError: {
    message: '浏览器拒绝打开本地数据库',
    hint: '同一份数据被另一个标签页占用时会出现这种情况：关掉其它 uRead 标签页后点「重试」。',
  },
  InvalidStateError: {
    message: '浏览器数据库连接已失效',
    hint: '刷新页面即可重新建立连接；若反复出现，请检查浏览器扩展是否拦截了 IndexedDB。',
  },
  QuotaExceededError: {
    message: '浏览器存储空间不足，写入没有完成',
    hint: '先到「仪表板 → 导出」备份数据，再删除不再需要的笔记或卡片，然后重试。',
  },
  SecurityError: {
    message: '浏览器出于隐私设置禁止了本地存储',
    hint: '隐私/无痕模式下 IndexedDB 常被禁用；请换到普通窗口，或在浏览器设置里允许本站存储。',
  },
  AbortError: {
    message: '本次操作被浏览器中断',
    hint: '通常是页面刷新或切换标签页导致；重新操作一次即可。',
  },
  IndexedDbBlockedError: {
    message: '本地数据库一时打不开（被其他标签页占用，或被浏览器存储设置拦下）',
    hint:
      '先关掉其它打开 uRead 的标签页再点「重试」；仍不行就检查是否处于无痕模式，或在浏览器设置里允许本站存储。',
  },
  VersionError: {
    message: '本地数据的版本与当前程序不一致',
    hint: '请勿混用旧版本构建：刷新页面；若仍失败，先导出备份再清除本地数据。',
  },
  SyntaxError: {
    message: '导入的文件不是合法 JSON',
    hint: '请确认选择的是「导出」功能生成的 .json 文件；手工编辑过的文件注意逗号与引号是否完整。',
  },
  TypeError: {
    message: '导入的数据结构与预期不符',
    hint: '请使用与当前版本匹配的导出文件；跨版本导入前先备份现有数据。',
  },
};

/** 仓储层抛出的业务错误（`图书不存在: xxx`）：保留对象名，去掉内部 id 噪音。 */
const BUSINESS = /^(\S+?)不存在[:：]/;

/**
 * 把任意异常转成可执行说明。
 *
 * 未知异常也要给出可用的下一步（重试 + 导出备份），因为「未知」最容易让人放弃。
 */
export function describeError(error: unknown): ActionableError {
  if (error instanceof Error) {
    const known = KNOWN[error.name];
    if (known) {
      return known;
    }

    const business = BUSINESS.exec(error.message ?? '');
    if (business) {
      return {
        message: error.message.replace(/[:：].*$/, ''),
        hint: '这条记录可能已在另一个标签页被删除，刷新列表后再试。',
      };
    }

    if (/JSON/i.test(error.message ?? '')) {
      return KNOWN.SyntaxError;
    }

    if (error.message) {
      return {
        message: error.message,
        hint: '如果反复出现，先到「仪表板 → 导出」备份，再重试该操作。',
      };
    }
  }

  return {
    message: '操作未完成',
    hint: '请重试一次；若仍然失败，先导出备份，再考虑清除本地数据后重新导入。',
  };
}
