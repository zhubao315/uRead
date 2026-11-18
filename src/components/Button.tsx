import React from 'react';

const baseClasses =
  'font-inter font-medium transition-all duration-200 cursor-pointer focus-ring rounded-lg transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none';

const variants = {
  primary: 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm',
  secondary: 'bg-cyan-600 hover:bg-cyan-700 text-white shadow-sm',
  outline: 'border border-gray-300 hover:bg-gray-50 text-gray-700 bg-transparent',
  ghost: 'text-gray-700 hover:bg-gray-100 bg-transparent',
};

const sizes = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
};

/**
 * 按钮外观的唯一定义。
 *
 * 导出它不是为了好看：导航用的链接也要长得一样，而在链接里再套一个按钮
 * 是无效 HTML（交互内容嵌套），读屏软件会把「链接里的按钮」念成一团。
 */
export function buttonClasses(options?: {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  className?: string;
}): string {
  const variant = options?.variant ?? 'primary';
  const size = options?.size ?? 'md';
  return `${baseClasses} ${variants[variant]} ${sizes[size]} ${options?.className ?? ''}`.trim();
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  className = '',
  disabled,
  ...props
}) => {
  // 未显式声明 type 的 button 在 <form> 里默认是 submit：
  // 「取消」这类按钮会把整张表交出去，所以默认给 button，调用方可覆盖。
  return (
    <button
      type="button"
      className={buttonClasses({ variant, size, className })}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      {...props}
    >
      {isLoading ? (
        <div className="flex items-center justify-center">
          <div
            className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"
            aria-hidden="true"
          ></div>
          处理中…
        </div>
      ) : (
        children
      )}
    </button>
  );
};

export default Button;