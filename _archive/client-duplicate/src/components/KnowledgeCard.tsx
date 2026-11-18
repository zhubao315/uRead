import React from 'react';

interface KnowledgeCard {
  id: string;
  title: string;
  content: string;
  type: string;
  category: string;
  tags: string[];
  createdAt: string;
}

interface CardProps {
  card: KnowledgeCard;
}

const KnowledgeCard: React.FC<CardProps> = ({ card }) => {
  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'concept':
        return '概念';
      case 'fact':
        return '事实';
      case 'quote':
        return '引用';
      case 'idea':
        return '想法';
      default:
        return '其他';
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <h3 className="font-semibold text-gray-900">{card.title}</h3>
        <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
          {getTypeLabel(card.type)}
        </span>
      </div>

      <p className="text-gray-700 mb-4">{card.content}</p>

      <div className="mb-4">
        <span className="text-sm text-gray-600">分类：{card.category}</span>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {card.tags.map((tag, index) => (
          <span key={index} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
            #{tag}
          </span>
        ))}
      </div>

      <div className="flex justify-between items-center text-xs text-gray-500">
        <span>{new Date(card.createdAt).toLocaleDateString('zh-CN')}</span>
        <button className="text-blue-600 hover:text-blue-800">编辑</button>
      </div>
    </div>
  );
};

export default KnowledgeCard;