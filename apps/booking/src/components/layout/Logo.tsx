import type { SVGProps } from 'react';

export function Logo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 256 256"
      width="1em"
      height="1em"
      {...props}
    >
      <path
        fill="currentColor"
        d="M128 24a104 104 0 1 0 104 104A104.11 104.11 0 0 0 128 24Zm0 192a88 88 0 1 1 88-88a88.1 88.1 0 0 1-88 88Zm-28-56a12 12 0 0 1 0-24a12 12 0 0 1 0 24Zm56 0a12 12 0 0 1 0-24a12 12 0 0 1 0 24Zm-4-52.22a32 32 0 0 0-48 0a12 12 0 0 1-19.51-14.56a56 56 0 0 1 87 0a12 12 0 0 1-19.51 14.56Z"
      />
    </svg>
  );
}
