import React from 'react';

interface BookList {
  id: string;
  title: string;
  description: string;
  bookCount: number;
  type: string;
  tags: string[];
  createdAt: string;
}

interface BookListCardProps {
  bookList: BookList;
}

const BookListCard: React.FC<BookListCardProps> = ({ bookList }) => {
  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'personal':
        return '个人书单';
      case 'curated':
        return '精选书单';
      case 'shared':
        return '共享书单';
      default:
        return '其他';
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <h3 className="font-semibold text-gray-900">{bookList.title}</h3>
        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
          {bookList.bookCount} 本
        </span>
      </div>

      <p className="text-gray-600 mb-4">{bookList.description}</p>

      <div className="flex flex-wrap gap-2 mb-4">
        {bookList.tags.map((tag, index) => (
          <span key={index} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
            #{tag}
          </span>
        ))}
      </div>

      <div className="flex justify-between items-center text-xs text-gray-500">
        <span>{getTypeLabel(bookList.type)}</span>
        <button className="text-blue-600 hover:text-blue-800">查看详情</button>
      </div>
    </div>
  );
};

export default BookListCard;