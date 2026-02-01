/**
 * Loading Spinner Component
 * مكون مؤشر التحميل
 */

import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: 'primary' | 'secondary' | 'white' | 'success' | 'warning' | 'error';
  text?: string;
  fullScreen?: boolean;
  overlay?: boolean;
}

const sizeClasses = {
  sm: 'w-4 h-4 border-2',
  md: 'w-8 h-8 border-2',
  lg: 'w-12 h-12 border-3',
  xl: 'w-16 h-16 border-4',
};

const colorClasses = {
  primary: 'border-blue-500 border-t-transparent',
  secondary: 'border-purple-500 border-t-transparent',
  white: 'border-white border-t-transparent',
  success: 'border-green-500 border-t-transparent',
  warning: 'border-yellow-500 border-t-transparent',
  error: 'border-red-500 border-t-transparent',
};

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  color = 'primary',
  text,
  fullScreen = false,
  overlay = false,
}) => {
  const spinner = (
    <div className="flex flex-col items-center justify-center gap-3">
      <div
        className={`
          ${sizeClasses[size]}
          ${colorClasses[color]}
          rounded-full
          animate-spin
        `}
      />
      {text && (
        <p className={`text-sm ${color === 'white' ? 'text-white' : 'text-gray-600'}`}>
          {text}
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm z-50">
        {spinner}
      </div>
    );
  }

  if (overlay) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-sm z-10">
        {spinner}
      </div>
    );
  }

  return spinner;
};

// Skeleton Loading Component
interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'full';
  className?: string;
  animation?: 'pulse' | 'wave' | 'none';
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 20,
  rounded = 'md',
  className = '',
  animation = 'pulse',
}) => {
  const roundedClasses = {
    none: 'rounded-none',
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    full: 'rounded-full',
  };

  const animationClasses = {
    pulse: 'animate-pulse',
    wave: 'animate-shimmer',
    none: '',
  };

  return (
    <div
      className={`
        bg-gray-200
        ${roundedClasses[rounded]}
        ${animationClasses[animation]}
        ${className}
      `}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
      }}
    />
  );
};

// Skeleton Text
interface SkeletonTextProps {
  lines?: number;
  lineHeight?: number;
  gap?: number;
}

export const SkeletonText: React.FC<SkeletonTextProps> = ({
  lines = 3,
  lineHeight = 16,
  gap = 8,
}) => {
  return (
    <div className="space-y-2" style={{ gap }}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          height={lineHeight}
          width={i === lines - 1 ? '75%' : '100%'}
        />
      ))}
    </div>
  );
};

// Skeleton Card
export const SkeletonCard: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`bg-white rounded-xl p-6 shadow-sm ${className}`}>
      <div className="flex items-center gap-4 mb-4">
        <Skeleton width={48} height={48} rounded="full" />
        <div className="flex-1">
          <Skeleton height={20} width="60%" className="mb-2" />
          <Skeleton height={14} width="40%" />
        </div>
      </div>
      <SkeletonText lines={3} />
    </div>
  );
};

// Skeleton Table
interface SkeletonTableProps {
  rows?: number;
  columns?: number;
}

export const SkeletonTable: React.FC<SkeletonTableProps> = ({
  rows = 5,
  columns = 4,
}) => {
  return (
    <div className="bg-white rounded-xl overflow-hidden shadow-sm">
      {/* Header */}
      <div className="flex gap-4 p-4 bg-gray-50 border-b">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} height={20} width={`${100 / columns}%`} />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-4 p-4 border-b last:border-0">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton key={colIndex} height={16} width={`${100 / columns}%`} />
          ))}
        </div>
      ))}
    </div>
  );
};

export default LoadingSpinner;
