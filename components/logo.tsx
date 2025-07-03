import Link from 'next/link'

export default function Logo() {
  return (
    <Link href="/" className="flex items-center justify-center gap-2 text-foreground hover:opacity-80 transition-opacity cursor-pointer">
      <span className="text-3xl major-mono-display-regular">VidsReels</span> 
    </Link>
  );  
}