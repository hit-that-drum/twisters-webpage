import type { ButtonHTMLAttributes } from 'react';
import type { IconType } from 'react-icons';
import { HiOutlinePlusCircle } from 'react-icons/hi';
import { MdOutlineModeEditOutline } from 'react-icons/md';
import { RiDeleteBack2Line } from 'react-icons/ri';

const baseClassName =
  'inline-flex items-center justify-center gap-2 rounded-xl text-slate-900 transition-all';

const sizeClassName = 'h-12 min-w-[140px] px-4 py-2 text-sm font-black uppercase';

type GlobalButtonAppearance = 'filled' | 'outlined';

const appearanceClassName: Record<GlobalButtonAppearance, string> = {
  filled: 'border border-transparent bg-amber-300 text-slate-900 shadow-sm hover:bg-amber-200',
  outlined: 'border-3 border-amber-300 bg-transparent text-slate-900 shadow-sm hover:bg-amber-50',
};

const joinClassName = (...classNames: Array<string | undefined>) => {
  return classNames.filter(Boolean).join(' ');
};

type IconBasicMappingType = 'ADD' | 'EDIT' | 'DELETE' | 'NONE';

const iconBasicMapping: Record<IconBasicMappingType, IconType | null> = {
  ADD: HiOutlinePlusCircle,
  EDIT: MdOutlineModeEditOutline,
  DELETE: RiDeleteBack2Line,
  NONE: null,
};

interface GlobalButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  label: string;
  appearance?: GlobalButtonAppearance;
  variant?: string;
  icon?: IconType;
  iconBasicMappingType?: IconBasicMappingType;
  iconClassName?: string;
  labelClassName?: string;
}

export default function GlobalButton({
  label,
  appearance = 'filled',
  variant,
  icon,
  iconBasicMappingType = 'NONE',
  iconClassName,
  labelClassName,
  className,
  style,
  ...buttonProps
}: GlobalButtonProps) {
  const Icon = icon ?? iconBasicMapping[iconBasicMappingType];

  return (
    <button
      type="button"
      {...buttonProps}
      className={joinClassName(
        baseClassName,
        sizeClassName,
        appearanceClassName[appearance],
        variant,
        className,
      )}
      style={style}
    >
      {Icon && (
        <span aria-hidden="true" className={iconClassName ?? 'text-base'}>
          <Icon />
        </span>
      )}
      <span className={labelClassName}>{label}</span>
    </button>
  );
}
