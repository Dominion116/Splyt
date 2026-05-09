import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/*
 * Avatar
 * - Renders an image when `src` provided, falls back to initials,
 *   then to a generic icon. Always exposes alt text via `name`.
 * - Sizes: xs | sm | md | lg | xl
 */
const avatarVariants = cva(
  "inline-flex items-center justify-center overflow-hidden rounded-full bg-primary-soft text-primary font-medium select-none",
  {
    variants: {
      size: {
        xs: "h-6 w-6 text-[10px]",
        sm: "h-8 w-8 text-xs",
        md: "h-10 w-10 text-sm",
        lg: "h-12 w-12 text-base",
        xl: "h-16 w-16 text-lg"
      }
    },
    defaultVariants: { size: "md" }
  }
);

export interface AvatarProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof avatarVariants> {
  src?: string;
  name?: string;
}

function initialsFrom(name?: string) {
  if (!name) return "";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("");
}

export function Avatar({ className, size, src, name, children, ...props }: AvatarProps) {
  const [imgFailed, setImgFailed] = React.useState(false);
  const initials = initialsFrom(name);

  return (
    <span
      role="img"
      aria-label={name ?? "Avatar"}
      className={cn(avatarVariants({ size }), className)}
      {...props}
    >
      {src && !imgFailed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          onError={() => setImgFailed(true)}
          className="h-full w-full object-cover"
        />
      ) : children ? (
        children
      ) : initials ? (
        <span aria-hidden="true">{initials}</span>
      ) : (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-1/2 w-1/2" fill="currentColor">
          <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 2c-3.3 0-8 1.7-8 5v1h16v-1c0-3.3-4.7-5-8-5Z" />
        </svg>
      )}
    </span>
  );
}
