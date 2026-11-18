/**
 * 与共享契约的枚举一致性测试。
 *
 * uRead 的领域类型必须与 `schemas/KnowledgeAsset.py`（三个产品与 uAI Core 共用）逐字对齐，
 * 否则导出的知识资产会被其它产品拒绝，或反过来无法导入 SAG 证据。
 *
 * 契约文件在工作区布局下位于 `../schemas/`；单独 fork 本仓库时该目录不存在，
 * 此时跳过而不是失败——但工作区的质量循环会确保它真的被执行。
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const CONTRACT = path.join(ROOT, '..', 'schemas', 'KnowledgeAsset.py');
const TYPES = readFileSync(path.join(ROOT, 'src/data/types.ts'), 'utf-8');

function pythonLiteral(name: string): Set<string> {
  const source = readFileSync(CONTRACT, 'utf-8');
  const match = new RegExp(`${name} = Literal\\[(.*?)\\]`, 's').exec(source);
  if (!match) throw new Error(`共享契约中找不到 ${name}`);
  return new Set([...match[1].matchAll(/"([^"]+)"/g)].map((item) => item[1]));
}

function tsUnion(name: string): Set<string> {
  const match = new RegExp(`export type ${name} =\\s*(.*?);`, 's').exec(TYPES);
  if (!match) throw new Error(`src/data/types.ts 中找不到 ${name}`);
  return new Set([...match[1].matchAll(/'([^']+)'/g)].map((item) => item[1]));
}

function pyModelFields(className: string): Set<string> {
  const match = new RegExp(`class ${className}\\(BaseModel\\):(.*?)(?=\\nclass |$)`, 's').exec(
    readFileSync(CONTRACT, 'utf-8'),
  );
  if (!match) throw new Error(`共享契约中找不到模型 ${className}`);
  const fields = new Set<string>();
  for (const line of match[1].split('\n')) {
    const found = /^ {4}(\w+)\??:/.exec(line);
    if (found && found[1] !== 'model_config') fields.add(found[1]);
  }
  return fields;
}

function tsInterfaceFields(name: string): Set<string> {
  const match = new RegExp(`export interface ${name}[^{]*\\{([\\s\\S]*?)\\n\\}`).exec(TYPES);
  if (!match) throw new Error(`src/data/types.ts 中找不到 interface ${name}`);
  const fields = new Set<string>();
  for (const line of match[1].split('\n')) {
    const found = /^\s{2}(\w+)\??:/.exec(line);
    if (found) fields.add(found[1]);
  }
  return fields;
}

const differences = (name: string) => {
  const contract = pythonLiteral(name);
  const local = tsUnion(name);
  return {
    missing: [...contract].filter((item) => !local.has(item)),
    extra: [...local].filter((item) => !contract.has(item)),
  };
};

describe.skipIf(!existsSync(CONTRACT))('与共享契约的枚举一致', () => {
  const cases = ['AssetType', 'AssetStatus', 'RelationType'];

  it.each(cases)('%s 与 uRead 的同名类型完全一致', (name) => {
    const diff = differences(name);
    expect(diff.missing, `uRead 缺少契约允许的取值：${diff.missing.join(', ')}`).toEqual([]);
    expect(diff.extra, `uRead 引入了契约没有的取值：${diff.extra.join(', ')}`).toEqual([]);
  });

  it('AnchorKind 覆盖契约 Anchor.kind 的全部取值（SAG 用 line_range）', () => {
    const source = readFileSync(CONTRACT, 'utf-8');
    const block = /kind: Literal\[(.*?)\]/s.exec(source);
    expect(block, '共享契约未定义 Anchor.kind').toBeTruthy();
    const contract = new Set([...(block?.[1] ?? '').matchAll(/"([^"]+)"/g)].map((item) => item[1]));
    const local = tsUnion('AnchorKind');

    for (const kind of contract) {
      expect(local.has(kind), `uRead 的 AnchorKind 缺少 ${kind}，无法表达该类引用`).toBe(true);
    }
    // line_range 是 SAG 证据的锚点形态，必须显式存在
    expect(contract.has('line_range')).toBe(true);
    expect(local.has('line_range')).toBe(true);
  });

  it('SourceRef.source_type 与契约一致（导入的资产才能被别处解析）', () => {
    const source = readFileSync(CONTRACT, 'utf-8');
    const block = /source_type: Literal\[(.*?)\]/s.exec(source);
    expect(block, '共享契约未定义 SourceRef.source_type').toBeTruthy();
    const contract = new Set([...(block?.[1] ?? '').matchAll(/"([^"]+)"/g)].map((item) => item[1]));
    const local = new Set(
      [
        ...(/source_type\?:\s*(.*?);/s.exec(TYPES)?.[1] ?? '').matchAll(/'([^']+)'/g),
      ].map((item) => item[1]),
    );
    const missing = [...contract].filter((item) => !local.has(item));
    expect(missing, `uRead 的 source_type 缺少契约取值：${missing.join(', ')}`).toEqual([]);
  });
});

describe.skipIf(!existsSync(CONTRACT))('模型字段覆盖共享契约', () => {
  // 契约字段必须在本地类型里有落点：没有落点的字段会在导入时被静默丢弃
  const models: Array<[string, string]> = [
    ['Anchor', 'Anchor'],
    ['SourceRef', 'SourceRef'],
    ['Relation', 'Relation'],
    ['Metadata', 'AssetMetadata'],
    ['KnowledgeAsset', 'BaseAsset'],
  ];

  it.each(models)('契约 %s 的字段都被 %s 承接', (pythonName, tsName) => {
    const contract = pyModelFields(pythonName);
    const local = tsInterfaceFields(tsName);
    const missing = [...contract].filter((field) => !local.has(field));
    expect(missing, `${tsName} 无法承接契约字段：${missing.join(', ')}`).toEqual([]);
  });

  it('Anchor 带结构化行区间（SAG 证据靠行号定位，不该只留一个字符串）', () => {
    const fields = tsInterfaceFields('Anchor');
    expect(fields.has('start_line')).toBe(true);
    expect(fields.has('end_line')).toBe(true);
  });

  it('共享质量指标在 uRead 里是具名字段（不是索引签名里的 unknown）', () => {
    const fields = tsInterfaceFields('AssetMetadata');
    for (const field of ['evidence_coverage', 'freshness_score', 'next_review_at', 'token_count']) {
      expect(fields.has(field), `AssetMetadata 缺少 ${field}`).toBe(true);
    }
  });
});

describe.skipIf(existsSync(CONTRACT))('共享契约不可用时的显式提示', () => {
  it('跳过契约核对，但必须说明原因（避免误以为已通过）', () => {
    expect(existsSync(CONTRACT)).toBe(false);
    // 单独 fork 本仓库时契约文件不存在：本文件不会给出任何「契约已通过」的结论
    expect(TYPES).toContain('export type AssetType');
  });
});
