CREATE TRIGGER trip_leads_set_updated_at
BEFORE UPDATE ON public.trip_leads
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();