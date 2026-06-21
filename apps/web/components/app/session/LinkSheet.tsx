"use client";

interface Props {
  link: string;
  onClose: () => void;
}

export function LinkSheet({ link, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4">
    </div>
  );
}
