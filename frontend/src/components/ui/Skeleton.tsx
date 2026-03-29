import React from 'react';


export interface SkeletonBlockProps {
  className?: string;
}

export const SkeletonBlock: React.FC<SkeletonBlockProps> = ({ className = '' }) => {
  return <div className={`animate-pulse bg-gray-200 rounded-lg ${className}`} />;
};

export interface SkeletonTextProps {
  width?: string;
  className?: string;
}

export const SkeletonText: React.FC<SkeletonTextProps> = ({ width = 'w-full', className = '' }) => {
  return <div className={`animate-pulse bg-gray-200 rounded h-4 ${width} ${className}`} />;
};

// === Complex Skeleton Components ===

export const SkeletonVehicleCard: React.FC = () => {
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm flex flex-col">
      {/* Top image area */}
      <div className="w-full h-48 bg-gray-200 animate-pulse rounded-t-xl" />
      
      {/* Bottom section */}
      <div className="p-4 flex flex-col gap-2">
        <SkeletonText width="w-3/4" />
        <SkeletonText width="w-1/2" className="h-3" />
        <SkeletonText width="w-1/3" className="mt-3" />
      </div>
    </div>
  );
};

export interface SkeletonTableRowProps {
  cols?: number;
}

export const SkeletonTableRow: React.FC<SkeletonTableRowProps> = ({ cols = 6 }) => {
  return (
    <tr className="border-b border-gray-200 last:border-0 hover:bg-gray-50 transition-colors">
      {Array.from({ length: cols }).map((_, index) => (
        <td key={index} className="p-4 whitespace-nowrap">
          <SkeletonText width={index === 0 ? 'w-32' : 'w-24'} />
        </td>
      ))}
    </tr>
  );
};

export const SkeletonUserCard: React.FC = () => {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6 shadow-sm flex items-center justify-between">
      <div className="flex items-center gap-4">
        {/* Avatar circle */}
        <div className="w-9 h-9 rounded-full bg-gray-200 animate-pulse shrink-0" />
        
        {/* Text lines */}
        <div className="flex flex-col gap-2">
          <SkeletonText width="w-32" />
          <SkeletonText width="w-48" className="h-3 hidden sm:block" />
        </div>
      </div>
      
      {/* Badges on right */}
      <div className="flex items-center gap-2">
        <div className="w-16 h-5 rounded-full bg-gray-200 animate-pulse" />
        <div className="w-16 h-5 rounded-full bg-gray-200 animate-pulse hidden sm:block" />
      </div>
    </div>
  );
};

export const SkeletonStatCard: React.FC = () => {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6 shadow-sm flex items-center gap-4">
      {/* Icon circle */}
      <div className="w-12 h-12 rounded-full bg-gray-200 animate-pulse shrink-0" />
      
      {/* Text lines */}
      <div className="flex flex-col gap-2 flex-1">
        <SkeletonText width="w-24" className="h-3" />
        <SkeletonText width="w-16" className="h-6" />
      </div>
    </div>
  );
};