import Link from "next/link";

export default function HomePage() {
  return (
    <div className="py-16 text-center">
      <h1 className="text-3xl font-semibold">Vinx</h1>
      <p className="mt-2 text-gray-600">
        Placeholder homepage — final look comes once we apply your design direction.
      </p>
      <Link href="/products" className="mt-6 inline-block border border-black px-6 py-2 text-sm">
        Shop now
      </Link>
    </div>
  );
}
