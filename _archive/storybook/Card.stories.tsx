import type { Meta, StoryObj } from '@storybook/react';
import Card from './Card';

const meta: Meta<typeof Card> = {
  title: 'Components/Card',
  component: Card,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['glass', 'default', 'elevated']
    },
    hoverEffect: {
      control: { type: 'boolean' }
    }
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Glass: Story = {
  args: {
    children: (
      <div className="p-6">
        <h3 className="font-inter font-semibold text-gray-900 mb-2">Glass Card</h3>
        <p className="font-inter text-gray-600">This is a glassmorphism card with backdrop blur effect.</p>
      </div>
    ),
    variant: 'glass',
    hoverEffect: true
  },
};

export const Default: Story = {
  args: {
    children: (
      <div className="p-6">
        <h3 className="font-inter font-semibold text-gray-900 mb-2">Default Card</h3>
        <p className="font-inter text-gray-600">This is a clean, simple card design.</p>
      </div>
    ),
    variant: 'default',
    hoverEffect: false
  },
};

export const Elevated: Story = {
  args: {
    children: (
      <div className="p-6">
        <h3 className="font-inter font-semibold text-gray-900 mb-2">Elevated Card</h3>
        <p className="font-inter text-gray-600">This card has a prominent shadow for emphasis.</p>
      </div>
    ),
    variant: 'elevated',
    hoverEffect: true
  },
};

export const WithContent: Story = {
  render: () => (
    <Card variant="glass" className="max-w-md">
      <div className="p-6 space-y-4">
        <h3 className="font-inter font-semibold text-xl text-gray-900">Knowledge Card</h3>
        <p className="font-inter text-gray-700 leading-relaxed">
          SOLID原则是面向对象设计的五个基本原则，由Robert C. Martin提出。这些原则帮助开发者创建更可维护、可扩展的代码。
        </p>
        <div className="flex flex-wrap gap-2">
          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">设计模式</span>
          <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-sm">架构</span>
          <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-sm">面向对象</span>
        </div>
        <div className="flex justify-between items-center pt-4 border-t border-gray-200">
          <span className="font-inter text-sm text-gray-500">2024年3月25日</span>
          <button className="text-blue-600 hover:text-blue-800 transition-colors">
            查看详情
          </button>
        </div>
      </div>
    </Card>
  ),
};