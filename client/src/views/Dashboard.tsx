import React from 'react';
import { Link } from 'react-router-dom';

const Dashboard: React.FC = () => {
  const stats = [
    { label: '读书笔记', value: '23', icon: '📝', color: 'blue' },
    { label: '知识卡片', value: '45', icon: '💡', color: 'green' },
    { label: '书单数量', value: '8', icon: '📚', color: 'purple' },
    { label: '阅读时长', value: '127h', icon: '⏰', color: 'orange' }
  ];

  const recentActivity = [
    { type: 'note', title: '《深入理解计算机系统》- 内存管理章节', time: '2小时前' },
    { type: 'card', title: '创建知识卡片：缓存一致性协议', time: '5小时前' },
    { type: 'booklist', title: '更新书单：前端开发必读书籍', time: '1天前' }
  ];

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="text-center py-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg text-white">
        <h1 className="text-4xl font-bold mb-4">让每一次阅读，都留下可生长的沉淀</h1>
        <p className="text-xl opacity-90 mb-8">uRead - 专注阅读认知沉淀的智能工具</p>
        <div className="flex justify-center space-x-4">
          <Link
            to="/notes"
            className="bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
          >
            开始阅读笔记
          </Link>
          <Link
            to="/cards"
            className="border border-white text-white px-6 py-3 rounded-lg font-semibold hover:bg-white hover:text-blue-600 transition-colors"
          >
            创建知识卡片
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
              <span className="text-3xl">{stat.icon}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">最近活动</h2>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {recentActivity.map((activity, index) => (
              <div key={index} className="flex items-center space-x-4">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                  <p className="text-xs text-gray-500">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">快速操作</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              to="/notes"
              className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <span className="text-2xl">📝</span>
              <div>
                <h3 className="font-medium text-gray-900">新建笔记</h3>
                <p className="text-sm text-gray-600">记录阅读心得</p>
              </div>
            </Link>
            <Link
              to="/cards"
              className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <span className="text-2xl">💡</span>
              <div>
                <h3 className="font-medium text-gray-900">创建卡片</h3>
                <p className="text-sm text-gray-600">提炼核心概念</p>
              </div>
            </Link>
            <Link
              to="/booklists"
              className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <span className="text-2xl">📚</span>
              <div>
                <h3 className="font-medium text-gray-900">管理书单</h3>
                <p className="text-sm text-gray-600">整理阅读计划</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;