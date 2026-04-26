UPDATE public.posts SET cover_image_url = CASE slug
  WHEN 'port-blair-to-havelock-ferry-guide-2026' THEN 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1600&q=75'
  WHEN '7-day-andaman-itinerary-port-blair-havelock-neil' THEN 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1600&q=75'
  WHEN 'best-time-to-visit-andaman-month-by-month' THEN 'https://images.unsplash.com/photo-1502082553048-f009c37129b9?auto=format&fit=crop&w=1600&q=75'
  WHEN 'beginners-guide-scuba-diving-havelock-island' THEN 'https://images.unsplash.com/photo-1682687982501-1e58ab814714?auto=format&fit=crop&w=1600&q=75'
  WHEN 'andaman-honeymoon-guide-romantic-places-budget-tips' THEN 'https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&w=1600&q=75'
END
WHERE slug IN (
  'port-blair-to-havelock-ferry-guide-2026',
  '7-day-andaman-itinerary-port-blair-havelock-neil',
  'best-time-to-visit-andaman-month-by-month',
  'beginners-guide-scuba-diving-havelock-island',
  'andaman-honeymoon-guide-romantic-places-budget-tips'
);