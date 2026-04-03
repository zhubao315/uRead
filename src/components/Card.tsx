import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'glass' | 'default' | 'elevated';
  hoverEffect?: boolean;
}

const Card: React.FC<CardProps> = ({
  children,
  variant = 'glass',
  hoverEffect = true,
  className = '',
  ...props
}) => {
  const baseClasses = 'rounded-xl transition-all duration-200';

  const variants = {
    glass: 'card-glass shadow-sm hover:shadow-md',
    default: 'bg-white border border-gray-200 shadow-sm',
    elevated: 'bg-white border border-gray-200 shadow-lg'
  };

  const hoverClasses = hoverEffect ? 'hover:transform hover:scale-105' : '';

  return (
    <div
      className={`${baseClasses} ${variants[variant]} ${hoverClasses} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export default Card;