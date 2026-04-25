import { useState } from "react";
import { Star, MessageSquare, ThumbsUp, Flag, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useReviews } from "@/hooks/useReviews";

type ReviewCriteria = {
  id: string;
  label: string;
  description: string;
};

const EXPERIENCE_CRITERIA: ReviewCriteria[] = [
  { id: "value", label: "Value for Money", description: "Was it worth the price?" },
  { id: "guide", label: "Guide Quality", description: "How knowledgeable was the guide?" },
  { id: "safety", label: "Safety Standards", description: "Did you feel safe throughout?" },
  { id: "experience", label: "Overall Experience", description: "Would you recommend this?" },
];

const ACCOMMODATION_CRITERIA: ReviewCriteria[] = [
  { id: "cleanliness", label: "Cleanliness", description: "How clean was the property?" },
  { id: "location", label: "Location", description: "How convenient was the location?" },
  { id: "amenities", label: "Amenities", description: "Quality of facilities provided" },
  { id: "service", label: "Service", description: "How helpful was the staff?" },
];

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
                  EXPERIENCE_CRITERIA; // Default fallback

  const handleRatingChange = (criteriaId: string, rating: number) => {
    setRatings(prev => ({ ...prev, [criteriaId]: rating }));
  };

  const handleSubmit = async () => {
    // Validate all criteria are rated
    const missingRatings = criteria.filter(c => !ratings[c.id]);
    if (missingRatings.length > 0) {
      return; // useReviews hook will show appropriate error
    }

    const success = await submitReview(ratings, comment);
    if (success) {
      setShowReviewForm(false);
      setRatings({});
      setComment("");
    }
  };

  const StarRating = ({ value, onChange, readonly = false }: { 
    value: number; 
    onChange?: (rating: number) => void; 
    readonly?: boolean;
  }) => (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={() => !readonly && onChange?.(star)}
          className={`${readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'} transition-transform`}
        >
          <Star
            className={`h-4 w-4 ${
              star <= value 
                ? "fill-yellow-400 text-yellow-400" 
                : "text-gray-300"
            }`}
          />
        </button>
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Rating Summary */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-3xl font-bold">{stats.average_rating.toFixed(1)}</span>
              <StarRating value={stats.average_rating} readonly />
              <span className="text-muted-foreground">({stats.total_reviews} reviews)</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Based on verified bookings and experiences
            </p>
          </div>
          <Button onClick={() => setShowReviewForm(!showReviewForm)}>
            <MessageSquare className="h-4 w-4 mr-2" />
            Write Review
          </Button>
        </div>
      </Card>

      {/* Review Form */}
      {showReviewForm && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Share Your Experience</h3>
          <div className="space-y-4">
            {criteria.map((criterion) => (
              <div key={criterion.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{criterion.label}</p>
                    <p className="text-sm text-muted-foreground">{criterion.description}</p>
                  </div>
                  <StarRating
                    value={ratings[criterion.id] || 0}
                    onChange={(rating) => handleRatingChange(criterion.id, rating)}
                  />
                </div>
              </div>
            ))}
            
            <div className="space-y-2">
              <label className="font-medium">Your Review</label>
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Share details about your experience... (minimum 10 characters)"
                rows={4}
                maxLength={1000}
              />
              <p className="text-xs text-muted-foreground text-right">
                {comment.length}/1000 characters
              </p>
            </div>
            
            <div className="flex gap-2">
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit Review"
                )}
              </Button>
              <Button variant="outline" onClick={() => setShowReviewForm(false)} disabled={submitting}>
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Reviews List */}
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : reviews.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">No reviews yet. Be the first to share your experience!</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
          <Card key={review.id} className="p-6">
            <div className="flex items-start gap-4">
              <Avatar>
                <AvatarImage src={review.user_avatar} />
                <AvatarFallback>{review.user_name.charAt(0)}</AvatarFallback>
              </Avatar>
              
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{review.user_name}</span>
                  {review.is_verified && (
                    <Badge variant="secondary" className="text-xs">
                      Verified Booking
                    </Badge>
                  )}
                  <span className="text-sm text-muted-foreground">
                    {new Date(review.created_at).toLocaleDateString()}
                  </span>
                </div>
                
                <div className="flex flex-wrap gap-4">
                  {Object.entries(review.ratings).map(([criteriaId, rating]) => {
                    const criterion = criteria.find(c => c.id === criteriaId);
                    return criterion ? (
                      <div key={criteriaId} className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">{criterion.label}:</span>
                        <StarRating value={rating} readonly />
                      </div>
                    ) : null;
                  })}
                </div>
                
                <p className="text-sm">{review.comment}</p>
                
                <div className="flex items-center gap-4 pt-2">
                  <Button variant="ghost" size="sm">
                    <ThumbsUp className="h-4 w-4 mr-1" />
                    Helpful ({review.helpful_count})
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Flag className="h-4 w-4 mr-1" />
                    Report
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        ))}
        </div>
      )}
    </div>
  );
}