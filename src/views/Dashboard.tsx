import React from 'react';
import { Link } from 'react-router-dom';
import Card from '../components/Card';
import Button from '../components/Button';
import Icon, { BookOpenIcon, LightBulbIcon, StarIcon, ClockIcon } from '../components/Icon';

const Dashboard: React.FC = () => {
  const stats = [
    { label: '读书笔记', value: '23', icon: <BookOpenIcon size="lg" />, color: 'blue', trend: '+5' },
    { label: '知识卡片', value: '45', icon: <LightBulbIcon size="lg" />, color: 'green', trend: '+12' },
    { label: '书单数量', value: '8', icon: <StarIcon size="lg" />, color: 'purple', trend: '+2' },
    { label: '阅读时长', value: '127h', icon: <ClockIcon size="lg" />, color: 'orange', trend: '+15h' }
  ];

  const recentActivity = [
    { type: 'note', title: '《深入理解计算机系统》- 内存管理章节', time: '2小时前', progress: '85%' },
    { type: 'card', title: '创建知识卡片：缓存一致性协议', time: '5小时前', progress: '完成' },
    { type: 'booklist', title: '更新书单：前端开发必读书籍', time: '1天前', progress: '60%' }
  ];

  const quickActions = [
    { label: '新建笔记', icon: '📝', description: '记录阅读心得', path: '/notes' },
    { label: '创建卡片', icon: '💡', description: '提炼核心概念', path: '/cards' },
    { label: '管理书单', icon: '📚', description: '整理阅读计划', path: '/booklists' }
  ];

  return (
    <div className="space-y-8 font-inter">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-cyan-700 rounded-2xl text-white">
        <div className="absolute inset-0 bg-black opacity-10"></div>
        <div className="relative px-8 py-16 text-center">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-5xl md:text-6xl font-inter font-bold mb-6 leading-tight">
              让每一次阅读，
              <br />
              <span className="bg-gradient-to-r from-yellow-300 to-orange-300 bg-clip-text text-transparent">
                都留下可生长的沉淀
              </span>
            </h1>
            <p className="text-xl md:text-2xl opacity-90 mb-10 max-w-2xl mx-auto">
              uRead - 专注阅读认知沉淀的智能工具
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link to="/notes">
                <Button variant="secondary" size="lg" className="w-full sm:w-auto">
                  开始阅读笔记
                </Button>
              </Link>
              <Link to="/cards">
                <Button variant="outline" size="lg" className="w-full sm:w-auto border-white text-white hover:bg-white hover:text-blue-700">
                  创建知识卡片
                </Button>
              </Link>
              <button className="cursor-pointer-custom text-white hover:text-gray-200 transition-colors duration-150">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 8V4l8 8-8 8v-4H4V8z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Grid */}
      <section>
        <h2 className="text-2xl font-inter font-semibold text-gray-900 mb-6">学习概览</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat) => (
            <Card key={stat.label} variant="glass" hoverEffect={true} className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-xl bg-${stat.color}-100`}>
                  <span className={`text-${stat.color}-600`}>{stat.icon}</span>
                </div>
                <span className="text-sm font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">
                  {stat.trend}
                </span>
              </div>
              <div>
                <p className="text-sm font-inter text-gray-600 mb-1">{stat.label}</p>
                <p className="text-3xl font-inter font-bold text-gray-900">{stat.value}</p>
              </div>
            </Card>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Activity */}
        <section>
          <Card variant="default" className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-inter font-semibold text-gray-900">最近活动</h2>
              <button className="cursor-pointer-custom text-blue-600 hover:text-blue-800 transition-colors duration-150">
                查看全部
              </button>
            </div>
            <div className="space-y-4">
              {recentActivity.map((activity, index) => (
                <div key={index} className="flex items-start space-x-4 p-4 hover:bg-gray-50 rounded-lg transition-colors duration-150 cursor-pointer-custom">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                  <div className="flex-1 min-w-0">
                    <p className="font-inter font-medium text-gray-900 mb-1">{activity.title}</p>
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-inter text-gray-500">{activity.time}</p>
                      <span className="text-xs font-inter text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                        {activity.progress}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </section>

        {/* Quick Actions */}
        <section>
          <Card variant="default" className="p-6">
            <div className="mb-6">
              <h2 className="text-xl font-inter font-semibold text-gray-900">快速操作</h2>
              <p className="text-sm font-inter text-gray-600 mt-1">选择你的下一个学习动作</p>
            </div>
            <div className="space-y-3">
              {quickActions.map((action, index) => (
                <Link
                  key={index}
                  to={action.path}
                  className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 cursor-pointer-custom group"
                >
                  <div className="text-2xl group-hover:scale-110 transition-transform duration-200">
                    {action.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-inter font-medium text-gray-900 group-hover:text-blue-700 transition-colors duration-150">
                      {action.label}
                    </h3>
                    <p className="text-sm font-inter text-gray-600">{action.description}</p>
                  </div>
                  <Icon className="text-gray-400 group-hover:text-blue-600 transition-colors duration-150">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
                    </svg>
                  </Icon>
                </Link>
              ))}
            </div>
          </Card>
        </section>
      </div>

      {/* Learning Path Preview */}
      <section>
        <Card variant="default" className="p-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-inter font-semibold text-gray-900 mb-2">学习路径</h2>
            <p className="text-gray-600">从输入到输出的完整认知闭环</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { step: '1', title: '阅读输入', desc: '获取知识源', icon: '📖' },
              { step: '2', title: '结构化沉淀', desc: '整理笔记', icon: '🧩' },
              { step: '3', title: '原子化复用', desc: '制作卡片', icon: '⚡' },
              { step: '4', title: '体系化联动', desc: '构建网络', icon: '🔗' }
            ].map((item, index) => (
              <div key={index} className="flex flex-col items-center text-center">
                <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center font-inter font-semibold mb-3">
                  {item.step}
                </div>
                <div className="text-2xl mb-2">{item.icon}</div>
                <h3 className="font-inter font-medium text-gray-900 mb-1">{item.title}</h3>
                <p className="text-sm font-inter text-gray-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </Card>
      </section>
    </div>
  );
};

export default Dashboard;