import { useState } from "react";
import { Loader2, Rocket, TrendingUp, Sparkles, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const BOOST_PRICE_INR = 99;

type Props = {
  listingId: string | null;
  listingTitle?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBoosted?: () => void;
};

export function BoostListingDialog({
  listingId,
  listingTitle,
  open,
  onOpenChange,
  onBoosted,
}: Props) {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  const onConfirm = async () => {
    if (!listingId) return;
    setSubmitting(true);
    // Mock payment — flip the is_featured flag (matches original repo's local-state boost)
    const { error } = await supabase
      .from("listings")
      .update({ is_featured: true })
      .eq("id", listingId);
    setSubmitting(false);
    if (error) {
      toast({ title: "Boost failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({
      title: "Boost active!",
      description: "Listing ab Featured rail mein dikh rahi hai. Boat pe bharosa rakho.",
    });
    onBoosted?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-accent/10 text-accent">
            <Rocket className="h-7 w-7" />
          </div>
          <DialogTitle className="text-center text-2xl">Boost this listing</DialogTitle>
          <DialogDescription className="text-center">
            {listingTitle ? (
              <>
                Make <span className="font-medium text-foreground">{listingTitle}</span> stand out
                across the bazaar.
              </>
            ) : (
              "Make your listing stand out across the bazaar."
            )}
          </DialogDescription>
        </DialogHeader>

        <ul className="space-y-3 py-2 text-sm">
          <li className="flex items-start gap-3">
            <Sparkles className="mt-0.5 h-4 w-4 flex-none text-accent" />
            <span>
              Featured rail par show — homepage pe top spot.
            </span>
          </li>
          <li className="flex items-start gap-3">
            <TrendingUp className="mt-0.5 h-4 w-4 flex-none text-accent" />
            <span>~3× zyada views ka estimate.</span>
          </li>
          <li className="flex items-start gap-3">
            <Eye className="mt-0.5 h-4 w-4 flex-none text-accent" />
            <span>Priority placement until your listing sells.</span>
          </li>
        </ul>

        <div className="rounded-2xl border border-accent/30 bg-accent/5 p-4 text-center">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">One-time</p>
          <p className="mt-1 text-3xl font-semibold tracking-tight">
            ₹{BOOST_PRICE_INR.toLocaleString("en-IN")}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">per listing · no recurring charge</p>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button onClick={onConfirm} disabled={submitting} className="w-full" size="lg">
            {submitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Rocket className="mr-2 h-4 w-4" />
            )}
            Boost for ₹{BOOST_PRICE_INR}
          </Button>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
            className="w-full"
          >
            Maybe later
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}