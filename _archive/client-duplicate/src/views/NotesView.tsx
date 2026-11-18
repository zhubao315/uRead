import React, { useState } from 'react';
import NoteCard from '../components/NoteCard';

const NotesView: React.FC = () => {
  const [notes] = useState([
    {
      id: 'note-1',
      bookTitle: '深入理解计算机系统',
      author: 'Randal E. Bryant',
      type: 'highlight',
      content: '内存管理是计算机系统的核心概念之一，理解它对于编写高效程序至关重要。',
      position: 25,
      tags: ['内存', '系统编程'],
      createdAt: new Date().toISOString()
    },
    {
      id: 'note-2',
      bookTitle: '设计模式',
      author: 'Gang of Four',
      type: 'summary',
      content: '观察者模式定义了一种一对多的依赖关系，让多个观察者对象同时监听某一个主题对象。',
      position: 45,
      tags: ['设计模式', '面向对象'],
      createdAt: new Date(Date.now() - 86400000).toISOString()
    }
  ]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">读书笔记</h1>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
          新建笔记
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {notes.map((note) => (
          <NoteCard key={note.id} note={note} />
        ))}
      </div>
    </div>
  );
};

export default NotesView;