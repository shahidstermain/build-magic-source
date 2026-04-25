# Critical Fixes - Implementation Guide

## Priority 1: Review System Fixes

### Fix 1: Add Review Fetching Hook

Create `src/hooks/useReviews.tsx`:

```typescript
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

type Review = {
  id: string;
  user_name: string;
  user_avatar?: string;
  created_at: string;
  comment: string;
  ratings: Record<string, number>;
  helpful_count: number;
  is_verified: boolean;
};

type ReviewStats = {
  average_rating: number;
  total_reviews: number;
};

export function useReviews(listingId: string) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<ReviewStats>({ average_rating: 0, total_reviews: 0 });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("listing_reviews")
        .select(`
          id,
          comment,
          ratings,
          helpful_count,
          is_verified,
          created_at,
          user_id
        `)
        .eq("listing_id", listingId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch user profiles separately
      const userIds = [...new Set(data?.map(r => r.user_id) || [])];
      const { data: profiles } = await supabase
        .from("public_profiles")
        .select("id, name, photo_url")
        .in("id", userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      setReviews(
        data?.map(r => ({
          ...r,
          user_name: profileMap.get(r.user_id)?.name || "Anonymous",
          user_avatar: profileMap.get(r.user_id)?.photo_url,
        })) || []
      );
    } catch (error) {
      console.error("Failed to fetch reviews:", error);
      toast({ title: "Failed to load reviews", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [listingId, toast]);

  const fetchStats = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc("calculate_listing_rating", {
        listing_uuid: listingId,
      });

      if (error) throw error;
      if (data && data.length > 0) {
        setStats({
          average_rating: data[0].average_rating || 0,
          total_reviews: data[0].total_reviews || 0,
        });
      }
    } catch (error) {
      console.error("Failed to fetch review stats:", error);
    }
  }, [listingId]);

  const submitReview = useCallback(
    async (ratings: Record<string, number>, comment: string) => {
      if (!user) {
        toast({ title: "Please sign in to leave a review", variant: "destructive" });
        return false;
      }

      // Validation
      if (Object.keys(ratings).length === 0) {
        toast({ title: "Please provide ratings", variant: "destructive" });
        return false;
      }

      const trimmedComment = comment.trim();
      if (trimmedComment.length < 10) {
        toast({ title: "Please write at least 10 characters", variant: "destructive" });
        return false;
      }
      if (trimmedComment.length > 1000) {
        toast({ title: "Review is too long (max 1000 characters)", variant: "destructive" });
        return false;
      }

      setSubmitting(true);
      try {
        const { error } = await supabase.from("listing_reviews").insert({
          listing_id: listingId,
          user_id: user.id,
          ratings,
          comment: trimmedComment,
        });

        if (error) throw error;

        toast({ title: "Review submitted successfully!" });
        
        // Refresh reviews and stats
        await Promise.all([fetchReviews(), fetchStats()]);
        
        return true;
      } catch (error: any) {
        console.error("Review submission error:", error);
        if (error.code === "23505") {
          toast({ title: "You've already reviewed this listing", variant: "destructive" });
        } else {
          toast({ title: "Failed to submit review", variant: "destructive" });
        }
        return false;
      } finally {
        setSubmitting(false);
      }
    },
    [user, listingId, toast, fetchReviews, fetchStats]
  );

  useEffect(() => {
    fetchReviews();
    fetchStats();
  }, [fetchReviews, fetchStats]);

  return {
    reviews,
    stats,
    loading,
    submitting,
    submitReview,
    refetch: fetchReviews,
  };
}
```

### Fix 2: Update ReviewSystem Component

Replace `src/components/ReviewSystem.tsx` with the improved version that uses the hook:

```typescript
import { useState } from "react";
import { Star, MessageSquare, ThumbsUp, Flag, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useReviews } from "@/hooks/useReviews";

// ... (keep existing type definitions and criteria)

interface ReviewSystemProps {
  listingId: string;
  category: string;
}

export function ReviewSystem({ listingId, category }: ReviewSystemProps) {
  const { reviews, stats, loading, submitting, submitReview } = useReviews(listingId);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [comment, setComment] = useState("");

  const criteria = category === "experiences" ? EXPERIENCE_CRITERIA : 
                  category === "accommodation" ? ACCOMMODATION_CRITERIA : 
                  EXPERIENCE_CRITERIA;

  const handleSubmit = async () => {
    const success = await submitReview(ratings, comment);
    if (success) {
      setShowReviewForm(false);
      setRatings({});
      setComment("");
    }
  };

  // ... (rest of component using the hook data)
}
```

### Fix 3: Update ListingDetail to Use Real Data

In `src/pages/ListingDetail.tsx`, remove hardcoded values:

```typescript
{/* Reviews Section for Experiences and Accommodation */}
{(listing.category === "experiences" || listing.category === "accommodation") && (
  <div className="mt-8">
    <ReviewSystem
      listingId={listing.id}
      category={listing.category}
    />
  </div>
)}
```

## Priority 2: Activity Filter Persistence

### Fix 4: Persist Activity Filters in URL

Update `src/pages/Listings.tsx`:

```typescript
// Initialize from URL params
const [selectedActivities, setSelectedActivities] = useState<string[]>(() => {
  const activities = params.get("activities");
  return activities ? activities.split(",").filter(Boolean) : [];
});

// Sync to URL when activities change
useEffect(() => {
  const next = new URLSearchParams(params);
  if (selectedActivities.length > 0) {
    next.set("activities", selectedActivities.join(","));
  } else {
    next.delete("activities");
  }
  setParams(next, { replace: true });
}, [selectedActivities]);

// Update the dependency array in the main useEffect
useEffect(() => {
  // ... existing load logic
}, [category, area, sort, priceRange, selectedActivities, params, toast]);
```

## Priority 3: Collaborative Trip Persistence

### Fix 5: Save Collaborative Trip Data

Create `src/lib/collaborativeTrips.ts`:

```typescript
import { supabase } from "@/integrations/supabase/client";

export async function saveCollaborativeTrip(
  tripId: string,
  userId: string,
  tripTitle: string,
  notes: string,
  collaborators: string[]
) {
  try {
    // Create collaborative trip record
    const { data: collabTrip, error: tripError } = await supabase
      .from("collaborative_trips")
      .insert({
        trip_id: tripId,
        name: tripTitle,
        shared_notes: notes,
        created_by: userId,
      })
      .select()
      .single();

    if (tripError) throw tripError;

    // Add collaborators if any
    if (collabTrip && collaborators.length > 0) {
      const { error: collabError } = await supabase
        .from("trip_collaborators")
        .insert(
          collaborators.map(email => ({
            collaborative_trip_id: collabTrip.id,
            email,
            role: "collaborator",
          }))
        );

      if (collabError) throw collabError;
    }

    return { success: true, collabTripId: collabTrip.id };
  } catch (error) {
    console.error("Failed to save collaborative trip:", error);
    return { success: false, error };
  }
}
```

Update `src/pages/TripPlanner.tsx`:

```typescript
import { saveCollaborativeTrip } from "@/lib/collaborativeTrips";

const onPreview = async () => {
  // ... existing preview creation code ...
  
  // Save collaborative data if present
  if ((tripNotes || collaborators.length > 0) && user) {
    await saveCollaborativeTrip(
      result.trip_id,
      user.id,
      result.preview.trip_title,
      tripNotes,
      collaborators
    );
  }
};
```

## Priority 4: Database Triggers

### Fix 6: Add Updated_at Triggers

Create `supabase/migrations/20241226_add_triggers.sql`:

```sql
-- Function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to listing_reviews
CREATE TRIGGER update_listing_reviews_updated_at
  BEFORE UPDATE ON listing_reviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Apply to collaborative_trips
CREATE TRIGGER update_collaborative_trips_updated_at
  BEFORE UPDATE ON collaborative_trips
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add rate limiting for reviews
CREATE OR REPLACE FUNCTION check_review_rate_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF (
    SELECT COUNT(*) 
    FROM listing_reviews 
    WHERE user_id = NEW.user_id 
    AND created_at > NOW() - INTERVAL '24 hours'
  ) >= 5 THEN
    RAISE EXCEPTION 'Review rate limit exceeded. Maximum 5 reviews per day.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER review_rate_limit
  BEFORE INSERT ON listing_reviews
  FOR EACH ROW EXECUTE FUNCTION check_review_rate_limit();
```

## Priority 5: WhatsApp Share Tracking

### Fix 7: Implement Share Tracking

Update `src/components/WhatsAppShare.tsx`:

```typescript
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export function WhatsAppShare({ title, price, url, type = "listing", variant = "button" }: WhatsAppShareProps) {
  const { toast } = useToast();
  const { user } = useAuth();

  const handleShare = async () => {
    const message = formatMessage();
    const whatsappUrl = `https://wa.me/?text=${message}`;
    
    // Track the share
    if (user) {
      try {
        await supabase.from("whatsapp_shares").insert({
          user_id: user.id,
          share_type: type,
          message_template: decodeURIComponent(message),
        });
      } catch (error) {
        console.error("Failed to track share:", error);
        // Don't block the share if tracking fails
      }
    }
    
    try {
      window.open(whatsappUrl, '_blank');
    } catch (error) {
      navigator.clipboard.writeText(decodeURIComponent(message));
      toast({ 
        title: "Message copied to clipboard", 
        description: "Paste it in WhatsApp to share" 
      });
    }
  };

  // ... rest of component
}
```

## Testing Checklist

After applying fixes:

- [ ] Reviews load correctly on listing detail page
- [ ] Can submit a review successfully
- [ ] Review stats update after submission
- [ ] Activity filters persist in URL
- [ ] Can navigate back/forward with filters intact
- [ ] Collaborative trip data saves to database
- [ ] WhatsApp shares are tracked
- [ ] Rate limiting prevents review spam
- [ ] Updated_at timestamps update correctly

## Deployment Steps

1. Apply database migrations in order:
   - `20241225_enhanced_features.sql`
   - `20241226_add_triggers.sql`

2. Deploy frontend changes

3. Test in staging environment

4. Monitor error logs for any issues

5. Gradually roll out to production