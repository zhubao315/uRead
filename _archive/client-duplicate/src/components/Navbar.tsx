import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const Navbar: React.FC = () => {
  const location = useLocation();

  const navItems = [
    { path: '/', label: '仪表板', icon: '📊' },
    { path: '/notes', label: '读书笔记', icon: '📝' },
    { path: '/booklists', label: '精选书单', icon: '📚' },
    { path: '/cards', label: '知识卡片', icon: '💡' }
  ];

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-2">
            <span className="text-2xl">📖</span>
            <span className="text-xl font-bold text-gray-900">uRead</span>
          </div>

          <div className="hidden md:flex space-x-8">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  location.pathname === item.path
                    ? 'text-blue-600 bg-blue-50'
                    : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50'
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
          </div>

          <div className="flex items-center space-x-4">
            <button className="text-gray-700 hover:text-blue-600 px-3 py-2 text-sm font-medium">
              登录
            </button>
            <button className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors">
              注册
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;