import Link from "next/link";

type BrandMarkProps = {
  href?: string | null;
  className?: string;
};

export default function BrandMark({ href = "/", className = "" }: BrandMarkProps) {
  const mark = <span className={`brand-wordmark ${className}`}>VINX</span>;

  return href !== null ? (
    <Link href={href} aria-label="Vinx home">
      {mark}
    </Link>
  ) : (
    mark
  );
}
