import * as React from 'react';
import { cn } from '@/lib/utils';

type PageContainerProps = {
  children: React.ReactNode;
  maxWidth?:
    | 'sm'
    | 'md'
    | 'lg'
    | 'xl'
    | '2xl'
    | 'full'
    | 'screen-sm'
    | 'screen-md'
    | 'screen-lg'
    | 'screen-xl'
    | 'screen-2xl';
  className?: string;
};

const maxWidthClasses: Record<
  NonNullable<PageContainerProps['maxWidth']>,
  string
> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  full: 'max-w-full',
  'screen-sm': 'max-w-screen-sm',
  'screen-md': 'max-w-screen-md',
  'screen-lg': 'max-w-screen-lg',
  'screen-xl': 'max-w-screen-xl',
  'screen-2xl': 'max-w-screen-2xl',
};

export function PageContainer({
  children,
  maxWidth = 'screen-md',
  className,
}: PageContainerProps) {
  return (
    <div
      className={cn('container mx-auto', maxWidthClasses[maxWidth], className)}
    >
      {children}
    </div>
  );
}
