import React, { useState } from 'react';
import Card from '../components/Card';
import Button from '../components/Button';
import Icon, { LightBulbIcon, StarIcon, PlusIcon, TagIcon } from '../components/Icon';

const CardsView: React.FC = () => {
  const [activeTag, setActiveTag] = useState('all');

  const knowledgeCards = [
    {
      id: 'card-1',
      title: 'SOLID原则',
      content: 'SOLID是面向对象设计的五个基本原则，由Robert C. Martin提出。这些原则帮助开发者创建更可维护、可扩展的代码。',
      type: 'concept',
      category: '软件工程',
      tags: ['设计模式', '架构', '面向对象'],
      sourceBook: '敏捷软件开发：原则、模式与实践',
      createdAt: new Date().toISOString(),
      connections: 3,
      importance: 'high'
    },
    {
      id: 'card-2',
      title: '缓存一致性协议',
      content: '在多核处理器中，确保所有核心看到的内存状态一致的机制。MESI协议是最常见的缓存一致性协议。',
      type: 'fact',
      category: '计算机体系结构',
      tags: ['缓存', '并发', '性能优化'],
      sourceBook: '深入理解计算机系统',
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      connections: 5,
      importance: 'medium'
    },
    {
      id: 'card-3',
      title: '函数式编程的优势',
      content: '函数式编程通过不可变数据和纯函数减少了副作用，使代码更易于测试、推理和维护。',
      type: 'idea',
      category: '编程范式',
      tags: ['函数式编程', '代码质量', '可测试性'],
      sourceBook: 'Functional Programming in JavaScript',
      createdAt: new Date(Date.now() - 172800000).toISOString(),
      connections: 2,
      importance: 'high'
    }
  ];

  const allTags = Array.from(new Set(knowledgeCards.flatMap(card => card.tags)));
  const filteredCards = activeTag === 'all' ? knowledgeCards : knowledgeCards.filter(card => card.tags.includes(activeTag));

  const getTypeConfig = (type: string) => {
    switch (type) {
      case 'concept':
        return { icon: <LightBulbIcon size="sm" />, color: 'blue', bgColor: 'bg-blue-100', textColor: 'text-blue-800', label: '概念' };
      case 'fact':
        return { icon: <StarIcon size="sm" />, color: 'green', bgColor: 'bg-green-100', textColor: 'text-green-800', label: '事实' };
      case 'idea':
        return { icon: <LightBulbIcon size="sm" />, color: 'purple', bgColor: 'bg-purple-100', textColor: 'text-purple-800', label: '想法' };
      default:
        return { icon: <LightBulbIcon size="sm" />, color: 'gray', bgColor: 'bg-gray-100', textColor: 'text-gray-800', label: '其他' };
    }
  };

  const getImportanceConfig = (importance: string) => {
    switch (importance) {
      case 'high':
        return { color: 'red', label: '重要', bgColor: 'bg-red-50', textColor: 'text-red-700' };
      case 'medium':
        return { color: 'yellow', label: '中等', bgColor: 'bg-yellow-50', textColor: 'text-yellow-700' };
      default:
        return { color: 'gray', label: '普通', bgColor: 'bg-gray-50', textColor: 'text-gray-700' };
    }
  };

  return (
    <div className="space-y-6 font-inter">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-inter font-bold text-gray-900">知识卡片</h1>
          <p className="font-inter text-gray-600 mt-1">提炼核心概念，构建知识网络</p>
        </div>
        <Button variant="primary" size="lg" className="w-full sm:w-auto">
          <PlusIcon size="sm" />
          <span className="ml-2">创建卡片</span>
        </Button>
      </div>

      {/* Stats Overview */}
      <Card variant="default" className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-3xl font-inter font-bold text-blue-600 mb-1">{knowledgeCards.length}</div>
            <div className="font-inter text-sm text-gray-600">总卡片数</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-inter font-bold text-green-600 mb-1">{allTags.length}</div>
            <div className="font-inter text-sm text-gray-600">标签分类</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-inter font-bold text-purple-600 mb-1">
              {knowledgeCards.reduce((sum, card) => sum + card.connections, 0)}
            </div>
            <div className="font-inter text-sm text-gray-600">关联关系</div>
          </div>
        </div>
      </Card>

      {/* Tags Filter */}
      <Card variant="default" className="p-4">
        <div className="flex items-center space-x-2 mb-3">
          <TagIcon size="md" className="text-gray-500" />
          <span className="font-inter font-medium text-gray-900">按标签筛选</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveTag('all')}
            className={`px-4 py-2 rounded-lg font-inter font-medium transition-all duration-200 cursor-pointer-custom ${
              activeTag === 'all'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            全部 ({knowledgeCards.length})
          </button>
          {allTags.map((tag) => {
            const count = knowledgeCards.filter(card => card.tags.includes(tag)).length;
            return (
              <button
                key={tag}
                onClick={() => setActiveTag(tag)}
                className={`px-4 py-2 rounded-lg font-inter font-medium transition-all duration-200 cursor-pointer-custom ${
                  activeTag === tag
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                #{tag} ({count})
              </button>
            );
          })}
        </div>
      </Card>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCards.map((card) => {
          const typeConfig = getTypeConfig(card.type);
          const importanceConfig = getImportanceConfig(card.importance);

          return (
            <Card key={card.id} variant="glass" hoverEffect={true} className="p-6 group">
              {/* Card Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <div className={`p-2 ${typeConfig.bgColor} rounded-lg`}>
                    <span className={typeConfig.textColor}>{typeConfig.icon}</span>
                  </div>
                  <div>
                    <span className={`px-2 py-1 rounded-full text-xs font-inter font-medium ${typeConfig.bgColor} ${typeConfig.textColor}`}>
                      {typeConfig.label}
                    </span>
                  </div>
                </div>
                <div className={`px-2 py-1 rounded-full text-xs font-inter font-medium ${importanceConfig.bgColor} ${importanceConfig.textColor}`}>
                  {importanceConfig.label}
                </div>
              </div>

              {/* Card Title */}
              <h3 className="font-inter font-semibold text-gray-900 mb-3 leading-tight">
                {card.title}
              </h3>

              {/* Card Content */}
              <p className="font-inter text-gray-700 mb-4 line-clamp-3 leading-relaxed">
                {card.content}
              </p>

              {/* Category and Source */}
              <div className="mb-4">
                <div className="flex items-center justify-between text-sm font-inter text-gray-600 mb-1">
                  <span>分类: {card.category}</span>
                  <span>来源: {card.sourceBook}</span>
                </div>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-2 mb-4">
                {card.tags.slice(0, 3).map((tag, index) => (
                  <span key={index} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-inter font-medium">
                    #{tag}
                  </span>
                ))}
                {card.tags.length > 3 && (
                  <span className="px-2 py-1 bg-gray-100 text-gray-500 rounded text-xs font-inter font-medium">
                    +{card.tags.length - 3}
                  </span>
                )}
              </div>

              {/* Connections and Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-1">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                    </svg>
                    <span className="font-inter text-xs text-gray-500">{card.connections} 个关联</span>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button className="cursor-pointer-custom p-1 text-gray-400 hover:text-blue-600 transition-colors duration-150">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                    </svg>
                  </button>
                  <button className="cursor-pointer-custom p-1 text-gray-400 hover:text-blue-600 transition-colors duration-150">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredCards.length === 0 && (
        <Card variant="default" className="p-12 text-center">
          <LightBulbIcon size="lg" className="mx-auto text-gray-400 mb-4" />
          <h3 className="font-inter font-semibold text-gray-900 mb-2">
            {activeTag === 'all' ? '暂无知识卡片' : `没有包含 "${activeTag}" 的卡片`}
          </h3>
          <p className="font-inter text-gray-600 mb-6">
            {activeTag === 'all' ? '从读书笔记中提取核心概念，制作知识卡片' : '尝试选择其他标签或创建新卡片'}
          </p>
          <Button variant="primary">
            <PlusIcon size="sm" />
            <span className="ml-2">{activeTag === 'all' ? '创建卡片' : '新建卡片'}</span>
          </Button>
        </Card>
      )}

      {/* Floating Action Button */}
      <div className="fixed bottom-6 right-6 z-40">
        <Button variant="primary" size="lg" className="shadow-lg">
          <PlusIcon size="md" />
        </Button>
      </div>
    </div>
  );
};

export default CardsView;