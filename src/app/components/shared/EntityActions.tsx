import { LucideIcon, Eye, Pencil, Trash2, MoreVertical } from "lucide-react";
import { canManage } from "../../utils/permissions";
import { Button } from "../ui/button";
import { cn } from "../ui/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

export type ExtraAction = {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  className?: string;
};

type EntityActionsProps = {
  onView?: () => void;
  showView?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  extraActions?: ExtraAction[];
  /** If not provided, uses canManage() from permissions. Set to false to hide Edit/Delete. */
  canEditDelete?: boolean;
  /** Optional class for the container div */
  className?: string;
  /** Button size: sm = h-8 w-8 p-0, icon = size="icon" (Kept for compatibility) */
  size?: "sm" | "icon";
};

/**
 * Reusable View / Edit / Delete actions for list rows.
 * Now using a DropdownMenu (vertical three dots) for a cleaner UI.
 */
export function EntityActions({
  onView,
  onEdit,
  onDelete,
  extraActions = [],
  canEditDelete,
  className = "",
}: EntityActionsProps) {
  const showEditDelete = canEditDelete ?? canManage();

  return (
    <div className={className} onClick={(e) => e.stopPropagation()}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Open menu</span>
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {onView && (
            <DropdownMenuItem onClick={onView} className="gap-2 cursor-pointer">
              <Eye className="w-4 h-4 text-indigo-600" />
              View
            </DropdownMenuItem>
          )}

          {extraActions.map((action, idx) => (
            <DropdownMenuItem key={idx} onClick={action.onClick} className={cn("gap-2 cursor-pointer", action.className)}>
              <action.icon className="w-4 h-4" />
              {action.label}
            </DropdownMenuItem>
          ))}

          {showEditDelete && onEdit && (
            <DropdownMenuItem onClick={onEdit} className="gap-2 cursor-pointer">
              <Pencil className="w-4 h-4 text-primary" />
              Edit
            </DropdownMenuItem>
          )}
          {showEditDelete && onDelete && (
            <DropdownMenuItem
              onClick={onDelete}
              className="gap-2 text-red-600 cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

