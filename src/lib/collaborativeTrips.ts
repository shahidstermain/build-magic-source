import { supabase } from "@/integrations/supabase/client";

const TABLE_MISSING_CODE = "42P01"; // PostgreSQL: relation does not exist

export async function saveCollaborativeTrip(
  tripId: string,
  userId: string,
  tripTitle: string,
  notes: string,
  collaborators: string[]
) {
  try {
    if (!notes && collaborators.length === 0) {
      return { success: true, collabTripId: null };
    }

    const { data: collabTrip, error: tripError } = await supabase
      .from("collaborative_trips")
      .insert({
        trip_id: tripId,
        name: tripTitle,
        shared_notes: notes || null,
        created_by: userId,
      })
      .select()
      .single();

    if (tripError) {
      // Table doesn't exist yet — migration pending, fail silently
      if (tripError.code === TABLE_MISSING_CODE) {
        console.warn("collaborative_trips table not found. Run DASHBOARD_RUN_THIS.sql first.");
        return { success: false, error: tripError };
      }
      throw tripError;
    }

    if (collabTrip && collaborators.length > 0) {
      const { error: collabError } = await supabase
        .from("trip_collaborators")
        .insert(
          collaborators.map(email => ({
            collaborative_trip_id: collabTrip.id,
            email: email.toLowerCase().trim(),
            role: "collaborator",
          }))
        );

      if (collabError) {
        // Non-fatal — trip was saved, just collaborators failed
        console.warn("Failed to save collaborators:", collabError.message);
      }
    }

    return { success: true, collabTripId: collabTrip.id };
  } catch (error) {
    console.error("Failed to save collaborative trip:", error);
    return { success: false, error };
  }
}

export async function getCollaborativeTrip(tripId: string) {
  try {
    const { data: collabTrip, error: tripError } = await supabase
      .from("collaborative_trips")
      .select(`
        id,
        name,
        shared_notes,
        created_by,
        trip_collaborators (
          email,
          user_id,
          role,
          invited_at,
          joined_at
        )
      `)
      .eq("trip_id", tripId)
      .single();

    if (tripError) {
      if (tripError.code === TABLE_MISSING_CODE) {
        console.warn("collaborative_trips table not found. Run DASHBOARD_RUN_THIS.sql first.");
        return { success: false, error: tripError };
      }
      throw tripError;
    }

    return { success: true, data: collabTrip };
  } catch (error) {
    console.error("Failed to fetch collaborative trip:", error);
    return { success: false, error };
  }
}
