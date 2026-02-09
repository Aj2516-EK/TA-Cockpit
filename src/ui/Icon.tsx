import type { ComponentPropsWithoutRef } from 'react'

export function Icon({
  name,
  className,
  ...props
}: { name: string } & ComponentPropsWithoutRef<'span'>) {
  return (
    <span
      {...props}
      className={['material-symbols-rounded leading-none select-none', className]
        .filter(Boolean)
        .join(' ')}
      aria-hidden="true"
    >
      {name}
    </span>
  )
}

