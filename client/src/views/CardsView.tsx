import React, { useState } from 'react';
import KnowledgeCard from '../components/KnowledgeCard';

const CardsView: React.FC = () => {
  const [cards] = useState([
    {
      id: 'card-1',
      title: 'SOLID原则',
      content: 'SOLID是面向对象设计的五个基本原则，由Robert C. Martin提出。',
      type: 'concept',
      category: '软件工程',
      tags: ['设计模式', '架构'],
      createdAt: new Date().toISOString()
    },
    {
      id: 'card-2',
      title: '缓存一致性协议',
      content: '在多核处理器中，确保所有核心看到的内存状态一致的机制。',
      type: 'fact',
      category: '计算机体系结构',
      tags: ['缓存', '并发'],
      createdAt: new Date(Date.now() - 86400000).toISOString()
    }
  ]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">知识卡片</h1>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
          创建卡片
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cards.map((card) => (
          <KnowledgeCard key={card.id} card={card} />
        ))}
      </div>
    </div>
  );
};

export default CardsView;