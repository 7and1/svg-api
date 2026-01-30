"use client";

import { motion } from "framer-motion";
import clsx from "clsx";

interface SkeletonProps {
  className?: string;
  variant?: "text" | "circular" | "rectangular" | "rounded";
  width?: string | number;
  height?: string | number;
  animate?: boolean;
}

export const Skeleton = ({
  className,
  variant = "text",
  width,
  height,
  animate = true,
}: SkeletonProps) => {
  const baseClasses = clsx(
    "bg-black/10 dark:bg-white/10",
    variant === "text" && "rounded",
    variant === "circular" && "rounded-full",
    variant === "rectangular" && "rounded-none",
    variant === "rounded" && "rounded-lg",
    animate && "animate-pulse",
    className
  );

  const style: React.CSSProperties = {
    width: width ?? (variant === "text" ? "100%" : undefined),
    height: height ?? (variant === "text" ? "1em" : undefined),
  };

  if (animate) {
    return (
      <motion.div
        className={baseClasses}
        style={style}
        initial={{ opacity: 0.5 }}
        animate={{ opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
      />
    );
  }

  return <div className={baseClasses} style={style} />;
};

// Icon grid skeleton for loading state
export const IconGridSkeleton = ({ columns = 6 }: { columns?: number }) => {
  return (
    <div
      className="grid gap-4"
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-black/10 bg-white/50 p-4 dark:border-white/10 dark:bg-white/5"
        >
          <Skeleton variant="circular" width={48} height={48} className="mx-auto" />
          <Skeleton variant="text" width="80%" className="mx-auto mt-3" />
          <Skeleton variant="text" width="50%" className="mx-auto mt-2" />
        </div>
      ))}
    </div>
  );
};

// List skeleton for loading state
export const IconListSkeleton = () => {
  return (
    <div className="space-y-2">
      {Array.from({ length: 10 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 rounded-xl border border-black/10 bg-white/50 p-3 dark:border-white/10 dark:bg-white/5"
        >
          <Skeleton variant="circular" width={32} height={32} />
          <div className="min-w-0 flex-1">
            <Skeleton variant="text" width="30%" />
            <Skeleton variant="text" width="50%" className="mt-2" />
          </div>
        </div>
      ))}
    </div>
  );
};

// Search skeleton
export const SearchSkeleton = () => {
  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <Skeleton variant="rounded" width="100%" height={40} />
        <Skeleton variant="rounded" width={100} height={40} />
        <Skeleton variant="rounded" width={100} height={40} />
      </div>
      <IconGridSkeleton columns={6} />
    </div>
  );
};
