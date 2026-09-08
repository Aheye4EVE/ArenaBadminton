type GoogleLogoProps = {
  size?: number;
};

/**
 * The official four-colour Google G mark kept inline so the auth buttons do
 * not depend on a remote image host or an additional asset request.
 */
export default function GoogleLogo({ size = 18 }: GoogleLogoProps) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      role="img"
    >
      <path
        fill="#4285F4"
        d="M21.35 12.27c0-.79-.07-1.55-.23-2.27H12v4.3h5.24a4.48 4.48 0 0 1-1.94 2.94v2.45h3.14c1.84-1.69 2.91-4.18 2.91-7.42Z"
      />
      <path
        fill="#34A853"
        d="M12 21.97c2.63 0 4.84-.87 6.45-2.35l-3.14-2.45c-.87.58-1.98.92-3.31.92-2.54 0-4.69-1.72-5.46-4.02H3.3v2.53A9.74 9.74 0 0 0 12 21.97Z"
      />
      <path
        fill="#FBBC05"
        d="M6.54 14.07a5.85 5.85 0 0 1 0-3.74V7.8H3.3a9.98 9.98 0 0 0 0 8.8l3.24-2.53Z"
      />
      <path
        fill="#EA4335"
        d="M12 6.31c1.43 0 2.72.49 3.73 1.45l2.8-2.8C16.83 3.41 14.63 2.03 12 2.03A9.74 9.74 0 0 0 3.3 7.8l3.24 2.53C7.31 8.03 9.46 6.31 12 6.31Z"
      />
    </svg>
  );
}
