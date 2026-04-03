import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BookOpenIcon, DocumentIcon, LightBulbIcon, StarIcon } from './Icon';

const Navbar: React.FC = () => {
  const location = useLocation();

  const navItems = [
    { path: '/', label: '仪表板', icon: <BookOpenIcon size="md" />, description: '学习概览' },
    { path: '/notes', label: '读书笔记', icon: <DocumentIcon size="md" />, description: '记录心得' },
    { path: '/booklists', label: '精选书单', icon: <StarIcon size="md" />, description: '阅读计划' },
    { path: '/cards', label: '知识卡片', icon: <LightBulbIcon size="md" />, description: '提炼精华' }
  ];

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-3 group cursor-pointer-custom">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-lg flex items-center justify-center transform transition-transform group-hover:scale-110">
              <BookOpenIcon size="lg" className="text-white" />
            </div>
            <div>
              <span className="text-xl font-inter font-bold text-gray-900">uRead</span>
              <p className="text-xs font-inter text-gray-500 -mt-1">认知沉淀工具</p>
            </div>
          </Link>

          {/* Navigation Items */}
          <div className="hidden md:flex space-x-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`relative flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-inter font-medium transition-all duration-200 cursor-pointer-custom ${
                  location.pathname === item.path
                    ? 'text-blue-600 bg-blue-50'
                    : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50'
                }`}
              >
                <span className={`transition-transform ${location.pathname === item.path ? 'scale-110' : ''}`}>
                  {item.icon}
                </span>
                <div className="flex flex-col items-start">
                  <span>{item.label}</span>
                  <span className="text-xs opacity-75">{item.description}</span>
                </div>
                {location.pathname === item.path && (
                  <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-blue-600 rounded-full"></div>
                )}
              </Link>
            ))}
          </div>

          {/* User Actions */}
          <div className="flex items-center space-x-3">
            <button className="cursor-pointer-custom p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-150">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
            <button className="cursor-pointer-custom p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-150">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </button>
            <div className="flex items-center space-x-2 cursor-pointer-custom p-2 hover:bg-gray-50 rounded-lg transition-colors duration-150">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-semibold">U</span>
              </div>
              <span className="font-inter font-medium text-gray-700 hidden lg:block">用户</span>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className="md:hidden border-t border-gray-200 bg-white">
        <div className="grid grid-cols-4 gap-1 p-2">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center space-y-1 p-3 rounded-lg text-xs font-inter transition-all duration-200 cursor-pointer-custom ${
                location.pathname === item.path
                  ? 'text-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-blue-600 hover:bg-gray-50'
              }`}
            >
              <span className={`${location.pathname === item.path ? 'scale-110' : ''}`}>
                {React.cloneElement(item.icon as React.ReactElement, { size: 'sm' })}
              </span>
              <span className="font-medium">{item.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;