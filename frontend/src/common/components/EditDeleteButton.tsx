import { MdOutlineModeEditOutline } from 'react-icons/md';
import { RiDeleteBack2Line } from 'react-icons/ri';

interface EditDeleteButtonProps {
  onEditClick: () => void;
  onDeleteClick: () => void;
  isDeleting?: boolean;
  isDeleteDisabled?: boolean;
}

export default function EditDeleteButton({
  onEditClick,
  onDeleteClick,
  isDeleting = false,
  isDeleteDisabled = false,
}: EditDeleteButtonProps) {
  const deleteDisabled = isDeleting || isDeleteDisabled;

  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={onEditClick}
        className="flex size-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition-colors hover:bg-yellow-100 hover:text-yellow-700"
      >
        <span aria-hidden="true" className="text-base">
          <MdOutlineModeEditOutline />
        </span>
      </button>

      <span className="text-slate-300">|</span>

      <button
        type="button"
        disabled={deleteDisabled}
        onClick={onDeleteClick}
        className="flex size-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition-colors hover:bg-red-100 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isDeleting ? (
          <span aria-hidden="true" className="text-base">
            ...
          </span>
        ) : (
          <span aria-hidden="true" className="text-base">
            <RiDeleteBack2Line />
          </span>
        )}
      </button>
    </div>
  );
}
