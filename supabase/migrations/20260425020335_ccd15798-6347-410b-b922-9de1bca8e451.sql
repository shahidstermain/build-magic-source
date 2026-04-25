CREATE TYPE public.notification_type AS ENUM (
  'message',
  'favorite_update',
  'listing_status',
  'verification',
  'system'
);

CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type public.notification_type NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  listing_id UUID REFERENCES public.listings(id) ON DELETE SET NULL,
  chat_id UUID REFERENCES public.chats(id) ON DELETE SET NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user_unread
  ON public.notifications(user_id, created_at DESC)
  WHERE read_at IS NULL;

CREATE INDEX idx_notifications_user_recent
  ON public.notifications(user_id, created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users mark own notifications read"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own notifications"
  ON public.notifications FOR DELETE
  USING (auth.uid() = user_id);

-- Auto-notify on new chat messages
CREATE OR REPLACE FUNCTION public.notify_message_recipient()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_buyer UUID;
  v_seller UUID;
  v_listing UUID;
  v_listing_title TEXT;
  v_recipient UUID;
  v_sender_name TEXT;
  v_preview TEXT;
BEGIN
  SELECT c.buyer_id, c.seller_id, c.listing_id
    INTO v_buyer, v_seller, v_listing
  FROM public.chats c
  WHERE c.id = NEW.chat_id;

  v_recipient := CASE WHEN NEW.sender_id = v_buyer THEN v_seller ELSE v_buyer END;

  SELECT COALESCE(name, 'Someone') INTO v_sender_name
  FROM public.profiles WHERE id = NEW.sender_id;

  SELECT title INTO v_listing_title
  FROM public.listings WHERE id = v_listing;

  v_preview := CASE
    WHEN length(NEW.body) > 120 THEN substring(NEW.body, 1, 117) || '…'
    ELSE NEW.body
  END;

  INSERT INTO public.notifications (user_id, type, title, body, link, listing_id, chat_id)
  VALUES (
    v_recipient,
    'message',
    v_sender_name || ' sent you a message',
    COALESCE(v_listing_title || ' · ', '') || v_preview,
    '/chats/' || NEW.chat_id::text,
    v_listing,
    NEW.chat_id
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_messages_notify_recipient
AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.notify_message_recipient();

-- Realtime
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;