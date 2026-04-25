
-- 1. Profiles: restrict row-level SELECT to owner; expose safe fields via a view
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

CREATE POLICY "Owners can view their own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);

CREATE OR REPLACE VIEW public.public_profiles
WITH (security_invoker = true) AS
SELECT
  id,
  name,
  photo_url,
  city,
  area,
  is_location_verified,
  total_listings,
  successful_sales,
  created_at
FROM public.profiles;

GRANT SELECT ON public.public_profiles TO anon, authenticated;

-- 2. Harden increment_listing_views to require auth
CREATE OR REPLACE FUNCTION public.increment_listing_views(_listing_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  UPDATE public.listings
  SET views_count = views_count + 1
  WHERE id = _listing_id AND status = 'active';
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.increment_listing_views(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.increment_listing_views(uuid) TO authenticated;

-- 3. Make chat-images bucket private and add participant-only access
UPDATE storage.buckets SET public = false WHERE id = 'chat-images';

DROP POLICY IF EXISTS "Chat images are publicly viewable" ON storage.objects;
DROP POLICY IF EXISTS "Chat participants can view images" ON storage.objects;

CREATE POLICY "Chat participants can view chat images"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'chat-images'
  AND EXISTS (
    SELECT 1 FROM public.chats c
    WHERE (c.id::text = (storage.foldername(name))[1])
      AND (auth.uid() = c.buyer_id OR auth.uid() = c.seller_id)
  )
);

-- 4. Listing-images: add explicit per-object SELECT policy (does not allow bucket listing)
DROP POLICY IF EXISTS "Listing images are publicly viewable" ON storage.objects;
CREATE POLICY "Listing images are publicly viewable"
ON storage.objects
FOR SELECT
USING (bucket_id = 'listing-images');

-- 5. Realtime authorization: restrict subscriptions to chats / notifications the user owns
ALTER TABLE IF EXISTS realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can subscribe to allowed topics" ON realtime.messages;
CREATE POLICY "Authenticated users can subscribe to allowed topics"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  -- Postgres-changes broadcasts use the schema/table topic; restrict to allowed feeds
  (
    extension = 'postgres_changes'
    AND (
      -- messages broadcast: only chat participants
      (
        (payload->>'schema') = 'public'
        AND (payload->>'table') = 'messages'
        AND EXISTS (
          SELECT 1 FROM public.chats c
          WHERE c.id::text = COALESCE(payload->'record'->>'chat_id', payload->'old_record'->>'chat_id')
            AND (auth.uid() = c.buyer_id OR auth.uid() = c.seller_id)
        )
      )
      -- notifications: only the owner
      OR (
        (payload->>'schema') = 'public'
        AND (payload->>'table') = 'notifications'
        AND auth.uid()::text = COALESCE(payload->'record'->>'user_id', payload->'old_record'->>'user_id')
      )
      -- chats: only participants
      OR (
        (payload->>'schema') = 'public'
        AND (payload->>'table') = 'chats'
        AND (
          auth.uid()::text = COALESCE(payload->'record'->>'buyer_id', payload->'old_record'->>'buyer_id')
          OR auth.uid()::text = COALESCE(payload->'record'->>'seller_id', payload->'old_record'->>'seller_id')
        )
      )
    )
  )
  -- Broadcast/presence channels: scope to user's own topic prefix
  OR (
    extension IN ('broadcast', 'presence')
    AND topic LIKE ('user:' || auth.uid()::text || '%')
  )
);
