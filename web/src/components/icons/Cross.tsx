export const Cross = ({
  className,
  onClick,
}: {
  className?: string;
  onClick?: (e: React.MouseEvent<SVGElement>) => void;
}) => (
  <svg
    className={`h-6 w-6 ${className ?? ''}`}
    fill="none"
    onClick={onClick}
    stroke="currentColor"
    strokeWidth={2}
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M6 18L18 6M6 6l12 12"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
