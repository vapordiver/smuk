/**
 * ImpactButton – The "Impact" Button from Indigo Scholar
 * Full-width capable, 2xl rounded, primary color with themed shadow-glow.
 * Hover: scale(0.98) for tactile feedback per DESIGN.md.
 *
 * @param {{
 *   children: React.ReactNode,
 *   variant?: 'primary'|'secondary'|'ghost',
 *   size?: 'sm'|'md'|'lg',
 *   icon?: string,
 *   onClick?: () => void,
 *   fullWidth?: boolean,
 *   className?: string
 * }} props
 */
const VARIANT_CLASSES = {
  primary:
    'bg-primary text-on-primary shadow-lg shadow-primary/20 hover:shadow-primary/30',
  secondary:
    'bg-surface-container-low text-primary hover:bg-surface-container',
  ghost:
    'bg-transparent text-primary hover:bg-primary/5',
};

const SIZE_CLASSES = {
  sm: 'px-4 py-2 text-sm',
  md: 'px-6 py-3 text-base',
  lg: 'px-8 py-4 text-lg',
};

export default function ImpactButton({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  onClick,
  fullWidth = false,
  className = '',
}) {
  return (
    <button
      onClick={onClick}
      className={`
        inline-flex items-center justify-center gap-2
        rounded-xl font-bold cursor-pointer
        transition-all duration-200
        hover:scale-[0.98] active:scale-[0.96]
        ${VARIANT_CLASSES[variant] || VARIANT_CLASSES.primary}
        ${SIZE_CLASSES[size] || SIZE_CLASSES.md}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
    >
      {icon && (
        <span className="material-symbols-outlined">{icon}</span>
      )}
      {children}
    </button>
  );
}
