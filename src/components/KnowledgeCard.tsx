import React from 'react';
import Card from './Card';
import ConfirmAction from './ConfirmAction';
import { LightBulbIcon, ClockIcon } from './Icon';
import type { KnowledgeCard } from '../data/types';

interface KnowledgeCardProps {
  card: KnowledgeCard;
  onDelete?: (id: string) => void;
  onToggleReviewed?: (id: string, reviewed: boolean) => void;
}

const TYPE_LABEL: Record<KnowledgeCard['card_type'], string> = {
  concept: '概念',
  fact: '事实',
  quote: '引用',
  idea: '想法',
  insight: '洞察',
  principle: '原则',
  method: '方法',
  evidence: '证据',
  question: '问题',
};

const IMPORTANCE_LABEL: Record<'low' | 'medium' | 'high', string> = {
  low: '低',
  medium: '中',
  high: '高',
};

const KnowledgeCard: React.FC<KnowledgeCardProps> = ({
  card,
  onDelete,
  onToggleReviewed,
}) => (
  <Card variant="glass" hoverEffect className="p-6">
    <div className="flex items-start justify-between mb-4">
      <div className="flex items-center space-x-2">
        <div className="p-2 rounded-lg bg-purple-100 text-purple-600">
          <LightBulbIcon size="sm" />
        </div>
        <h3 className="font-inter font-semibold text-gray-900">{card.title}</h3>
      </div>
      <span className="px-2 py-1 rounded-full text-xs font-inter font-medium bg-purple-100 text-purple-700">
        {TYPE_LABEL[card.card_type] ?? '概念'}
      </span>
    </div>

    {card.definition && (
      <p className="font-inter text-sm text-gray-600 mb-3 border-l-2 border-purple-200 pl-3">
        {card.definition}
      </p>
    )}

    <p className="font-inter text-gray-700 mb-4 line-clamp-4 leading-relaxed whitespace-pre-wrap">
      {card.content}
    </p>

    {card.source_refs.length > 0 && (
      <div className="mb-4 text-xs font-inter text-gray-600 bg-gray-50 border border-gray-200 rounded-lg p-3">
        <div className="font-medium text-gray-700 mb-1">来源</div>
        {card.source_refs.map((ref) => (
          <div key={ref.source_id} className="truncate">
            {ref.title || ref.url || ref.source_id}
          </div>
        ))}
      </div>
    )}

    <div className="flex flex-wrap gap-2 mb-4">
      {(card.metadata.tags ?? []).map((tag) => (
        <span
          key={tag}
          className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-inter font-medium"
        >
          #{tag}
        </span>
      ))}
    </div>

    <div className="flex items-center justify-between pt-4 border-t border-gray-100">
      <div className="flex items-center space-x-1">
        <ClockIcon size="sm" className="text-gray-500" />
        <span className="font-inter text-xs text-gray-500">
          {new Date(card.created_at).toLocaleDateString('zh-CN')}
        </span>
      </div>
      <div className="flex items-center space-x-3">
        <span className="font-inter text-xs text-gray-500">
          重要度：{IMPORTANCE_LABEL[card.importance ?? 'medium']}
        </span>
        {onToggleReviewed && (
          <button
            type="button"
            onClick={() => onToggleReviewed(card.id, !card.reviewed)}
            aria-pressed={card.reviewed}
            className={`cursor-pointer-custom text-xs font-inter font-medium transition-colors duration-150 ${
              card.reviewed ? 'text-green-600' : 'text-gray-500 hover:text-green-600'
            }`}
          >
            {card.reviewed ? '已核验' : '待核验'}
          </button>
        )}
        {onDelete && (
          <ConfirmAction
            label="删除"
            confirmLabel="确认删除？"
            detail="卡片会连同它与来源笔记的关系一起删除，且无法撤销"
            onConfirm={() => onDelete(card.id)}
          />
        )}
      </div>
    </div>
  </Card>
);

export default KnowledgeCard;
