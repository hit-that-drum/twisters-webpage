import type { ButtonHTMLAttributes } from 'react';
import type { IconType } from 'react-icons';
import { HiOutlinePlusCircle } from 'react-icons/hi';
import { MdOutlineModeEditOutline } from 'react-icons/md';
import { RiDeleteBack2Line } from 'react-icons/ri';

const baseClassName =
  'inline-flex items-center justify-center gap-2 rounded-xl text-slate-900 transition-all';

const variantClassName =
  'h-12 min-w-[140px] bg-amber-300 text-sm font-black uppercase shadow-sm hover:bg-amber-200 px-4 py-2';

const joinClassName = (...classNames: Array<string | undefined>) => {
  return classNames.filter(Boolean).join(' ');
};

type iconBasicMappingType = 'ADD' | 'EDIT' | 'DELETE' | 'NONE';

const iconBasicMapping = {
  ADD: HiOutlinePlusCircle,
  EDIT: MdOutlineModeEditOutline,
  DELETE: RiDeleteBack2Line,
  NONE: null,
};

interface GlobalButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  label: string;
  variant?: string;
  icon?: IconType;
  iconBasicMappingType?: iconBasicMappingType;
  iconClassName?: string;
  labelClassName?: string;
}

export default function GlobalButton({
  label,
  variant = variantClassName,
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
      className={joinClassName(baseClassName, variantClassName, variant, className)}
    >
      {Icon && (
        <span aria-hidden="true" className={iconClassName}>
          <Icon />
        </span>
      )}
      <span className={labelClassName}>{label}</span>
    </button>
  );
}
