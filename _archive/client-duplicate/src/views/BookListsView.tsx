import React, { useState } from 'react';
import BookListCard from '../components/BookListCard';

const BookListsView: React.FC = () => {
  const [bookLists] = useState([
    {
      id: 'booklist-1',
      title: '前端开发必读书籍',
      description: '精选前端技术书籍，从基础到进阶',
      bookCount: 8,
      type: 'personal',
      tags: ['前端', 'JavaScript', 'React'],
      createdAt: new Date().toISOString()
    },
    {
      id: 'booklist-2',
      title: '系统设计经典',
      description: '系统设计的权威指南和案例分析',
      bookCount: 5,
      type: 'curated',
      tags: ['系统设计', '架构'],
      createdAt: new Date(Date.now() - 172800000).toISOString()
    }
  ]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">精选书单</h1>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
          新建书单
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {bookLists.map((bookList) => (
          <BookListCard key={bookList.id} bookList={bookList} />
        ))}
      </div>
    </div>
  );
};

export default BookListsView;