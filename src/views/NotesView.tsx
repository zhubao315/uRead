import React, { useState } from 'react';
import Card from '../components/Card';
import Button from '../components/Button';
import Icon, { DocumentIcon, LightBulbIcon, StarIcon, ClockIcon, PlusIcon } from '../components/Icon';

const NotesView: React.FC = () => {
  const [filter, setFilter] = useState('all');

  const notes = [
    {
      id: 'note-1',
      bookTitle: '深入理解计算机系统',
      author: 'Randal E. Bryant',
      type: 'highlight',
      content: '内存管理是计算机系统的核心概念之一，理解它对于编写高效程序至关重要。虚拟内存提供了抽象层，让程序员可以专注于算法和数据结构的设计。',
      position: 25,
      tags: ['内存', '系统编程', '虚拟内存'],
      createdAt: new Date().toISOString(),
      readingProgress: '85%'
    },
    {
      id: 'note-2',
      bookTitle: '设计模式',
      author: 'Gang of Four',
      type: 'summary',
      content: '观察者模式定义了一种一对多的依赖关系，让多个观察者对象同时监听某一个主题对象。当主题对象的状态发生变化时，所有依赖于它的观察者都会收到通知并自动更新。',
      position: 45,
      tags: ['设计模式', '面向对象', '事件驱动'],
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      readingProgress: '60%'
    },
    {
      id: 'note-3',
      bookTitle: 'Clean Code',
      author: 'Robert C. Martin',
      type: 'note',
      content: '函数应该只做一件事，而且要做好这件事。函数应该尽可能短小，最好不超过20行代码。函数的命名应该能够清楚地表达其意图。',
      position: 78,
      tags: ['代码质量', '重构', '软件工程'],
      createdAt: new Date(Date.now() - 172800000).toISOString(),
      readingProgress: '45%'
    }
  ];

  const filters = [
    { key: 'all', label: '全部笔记', count: notes.length },
    { key: 'highlight', label: '高亮', count: notes.filter(n => n.type === 'highlight').length },
    { key: 'note', label: '笔记', count: notes.filter(n => n.type === 'note').length },
    { key: 'summary', label: '总结', count: notes.filter(n => n.type === 'summary').length }
  ];

  const filteredNotes = filter === 'all' ? notes : notes.filter(note => note.type === filter);

  const getTypeConfig = (type: string) => {
    switch (type) {
      case 'highlight':
        return { icon: <LightBulbIcon size="sm" />, color: 'yellow', bgColor: 'bg-yellow-100', textColor: 'text-yellow-800' };
      case 'note':
        return { icon: <DocumentIcon size="sm" />, color: 'blue', bgColor: 'bg-blue-100', textColor: 'text-blue-800' };
      case 'summary':
        return { icon: <StarIcon size="sm" />, color: 'green', bgColor: 'bg-green-100', textColor: 'text-green-800' };
      default:
        return { icon: <DocumentIcon size="sm" />, color: 'gray', bgColor: 'bg-gray-100', textColor: 'text-gray-800' };
    }
  };

  return (
    <div className="space-y-6 font-inter">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-inter font-bold text-gray-900">读书笔记</h1>
          <p className="font-inter text-gray-600 mt-1">记录你的阅读思考和学习心得</p>
        </div>
        <Button variant="primary" size="lg" className="w-full sm:w-auto">
          <PlusIcon size="sm" />
          <span className="ml-2">新建笔记</span>
        </Button>
      </div>

      {/* Filter Tabs */}
      <Card variant="default" className="p-4">
        <div className="flex flex-wrap gap-2">
          {filters.map((item) => (
            <button
              key={item.key}
              onClick={() => setFilter(item.key)}
              className={`px-4 py-2 rounded-lg font-inter font-medium transition-all duration-200 cursor-pointer-custom ${
                filter === item.key
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {item.label} ({item.count})
            </button>
          ))}
        </div>
      </Card>

      {/* Notes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredNotes.map((note) => {
          const typeConfig = getTypeConfig(note.type);
          return (
            <Card key={note.id} variant="glass" hoverEffect={true} className="p-6">
              {/* Note Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <div className={`p-2 ${typeConfig.bgColor} rounded-lg`}>
                    <span className={typeConfig.textColor}>{typeConfig.icon}</span>
                  </div>
                  <div>
                    <h3 className="font-inter font-semibold text-gray-900">{note.bookTitle}</h3>
                    <p className="font-inter text-sm text-gray-600">{note.author}</p>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-inter font-medium ${typeConfig.bgColor} ${typeConfig.textColor}`}>
                  {note.type === 'highlight' ? '高亮' : note.type === 'note' ? '笔记' : '总结'}
                </span>
              </div>

              {/* Note Content */}
              <p className="font-inter text-gray-700 mb-4 line-clamp-3 leading-relaxed">
                {note.content}
              </p>

              {/* Reading Progress */}
              <div className="mb-4">
                <div className="flex items-center justify-between text-sm font-inter text-gray-600 mb-2">
                  <span>阅读进度</span>
                  <span>{note.readingProgress}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: note.readingProgress }}
                  ></div>
                </div>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-2 mb-4">
                {note.tags.map((tag, index) => (
                  <span key={index} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-inter font-medium">
                    #{tag}
                  </span>
                ))}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <div className="flex items-center space-x-2">
                  <ClockIcon size="sm" className="text-gray-400" />
                  <span className="font-inter text-xs text-gray-500">
                    {new Date(note.createdAt).toLocaleDateString('zh-CN')}
                  </span>
                </div>
                <div className="flex items-center space-x-1">
                  <span className="font-inter text-xs text-gray-500">第 {note.position} 页</span>
                  <button className="cursor-pointer-custom text-blue-600 hover:text-blue-800 transition-colors duration-150">
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
      {filteredNotes.length === 0 && (
        <Card variant="default" className="p-12 text-center">
          <DocumentIcon size="lg" className="mx-auto text-gray-400 mb-4" />
          <h3 className="font-inter font-semibold text-gray-900 mb-2">暂无{filter === 'all' ? '' : filters.find(f => f.key === filter)?.label}</h3>
          <p className="font-inter text-gray-600 mb-6">开始创建你的第一个笔记，记录学习心得</p>
          <Button variant="primary">
            <PlusIcon size="sm" />
            <span className="ml-2">创建笔记</span>
          </Button>
        </Card>
      )}
    </div>
  );
};

export default NotesView;