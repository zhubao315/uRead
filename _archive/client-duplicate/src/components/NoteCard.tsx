import React from 'react';

interface Note {
  id: string;
  bookTitle: string;
  author: string;
  type: string;
  content: string;
  position?: number;
  tags: string[];
  createdAt: string;
}

interface NoteCardProps {
  note: Note;
}

const NoteCard: React.FC<NoteCardProps> = ({ note }) => {
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'highlight':
        return 'bg-yellow-100 text-yellow-800';
      case 'note':
        return 'bg-blue-100 text-blue-800';
      case 'summary':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'highlight':
        return '高亮';
      case 'note':
        return '笔记';
      case 'summary':
        return '总结';
      default:
        return '其他';
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="font-semibold text-gray-900 mb-1">{note.bookTitle}</h3>
          <p className="text-sm text-gray-600">作者：{note.author}</p>
        </div>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(note.type)}`}>
          {getTypeLabel(note.type)}
        </span>
      </div>

      <p className="text-gray-700 mb-4 line-clamp-3">{note.content}</p>

      {note.position && (
        <p className="text-xs text-gray-500 mb-3">第 {note.position} 页</p>
      )}

      <div className="flex flex-wrap gap-2 mb-4">
        {note.tags.map((tag, index) => (
          <span key={index} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
            #{tag}
          </span>
        ))}
      </div>

      <div className="flex justify-between items-center text-xs text-gray-500">
        <span>{new Date(note.createdAt).toLocaleDateString('zh-CN')}</span>
        <button className="text-blue-600 hover:text-blue-800">编辑</button>
      </div>
    </div>
  );
};

export default NoteCard;