export function Raccoon({ small = false }: { small?: boolean }) {
  return <svg viewBox="0 0 64 54" fill="none" className={small ? 'raccoon small' : 'raccoon'} aria-hidden="true">
    <path d="M8 23 7 5c9-2 16 3 19 9h12C41 8 48 3 57 5l-1 18c6 8 3 18-7 24-10 7-24 7-34 0C5 41 2 31 8 23Z" fill="currentColor" />
    <path d="m11 9 3 14 9-7c-4-4-7-6-12-7Zm42 0-3 14-9-7c4-4 7-6 12-7Z" fill="#292d2d" />
    <path d="M7 31c6-10 18-11 25-2 7-9 19-8 25 2l-4 9c-8 6-16 1-21-4-5 5-13 10-21 4Z" fill="#292d2d" />
    <path d="M21 29c-4 0-6 2-6 5 4 1 7 0 8-3l-2-2Zm22 0c4 0 6 2 6 5-4 1-7 0-8-3l2-2Z" fill="#f5f3ed" />
    <path d="M27 40h10l-5 5-5-5Z" fill="#292d2d" />
  </svg>;
}
