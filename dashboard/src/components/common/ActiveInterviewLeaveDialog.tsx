import { AlertTriangle, LogOut } from "lucide-react";
import { GradientButton } from "@/components/common/GradientButton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ActiveInterviewGuard } from "@/hooks/useActiveInterviewGuard";

export function ActiveInterviewLeaveDialog({ guard }: { guard: ActiveInterviewGuard }) {
  return (
    <Dialog
      open={guard.open}
      onOpenChange={(open) => {
        if (!open) guard.cancelLeave();
      }}
    >
      <DialogContent className="dashboard-card max-w-md border-border bg-card p-0 shadow-2xl">
        <div className="p-6">
          <DialogHeader>
            <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-destructive/10 text-destructive sm:mx-0">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <DialogTitle>End this interview?</DialogTitle>
            <DialogDescription>
              Leaving now will complete this interview and count it as one used attempt.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 rounded-xl border border-border bg-background/60 p-3 text-sm text-muted-foreground">
            {guard.message}
          </div>

          <DialogFooter className="mt-5 gap-2 sm:space-x-0">
            <GradientButton type="button" variant="ghost" disabled={guard.leaving} onClick={guard.cancelLeave}>
              Cancel
            </GradientButton>
            <GradientButton type="button" disabled={guard.leaving} onClick={() => void guard.confirmLeave()}>
              <LogOut className="h-4 w-4" />
              {guard.leaving ? "Ending..." : "Leave"}
            </GradientButton>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
