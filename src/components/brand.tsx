import Link from "next/link";

export function Logo() {
	return (
		<Link href="/" className="flex items-center space-x-1 text-2xl text-primary">
			<span className="font-semibold">Obie</span>
			<span className="font-light">Desk</span>
		</Link>
	);
}
