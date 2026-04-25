export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      affiliate_clicks: {
        Row: {
          affiliate_url: string
          created_at: string
          id: string
          ip_hash: string | null
          recommendation_id: string | null
          referer: string | null
          trip_id: string | null
          user_agent: string | null
          user_id: string | null
          vendor_id: string | null
        }
        Insert: {
          affiliate_url: string
          created_at?: string
          id?: string
          ip_hash?: string | null
          recommendation_id?: string | null
          referer?: string | null
          trip_id?: string | null
          user_agent?: string | null
          user_id?: string | null
          vendor_id?: string | null
        }
        Update: {
          affiliate_url?: string
          created_at?: string
          id?: string
          ip_hash?: string | null
          recommendation_id?: string | null
          referer?: string | null
          trip_id?: string | null
          user_agent?: string | null
          user_id?: string | null
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_clicks_recommendation_id_fkey"
            columns: ["recommendation_id"]
            isOneToOne: false
            referencedRelation: "affiliate_link_performance"
            referencedColumns: ["recommendation_id"]
          },
          {
            foreignKeyName: "affiliate_clicks_recommendation_id_fkey"
            columns: ["recommendation_id"]
            isOneToOne: false
            referencedRelation: "trip_recommendations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_clicks_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trip_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_clicks_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "affiliate_vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_conversions: {
        Row: {
          amount_inr: number | null
          click_id: string | null
          commission_inr: number | null
          created_at: string
          external_order_id: string | null
          id: string
          raw_payload: Json
          recommendation_id: string | null
          recorded_by: string | null
          source: string
          status: string
          updated_at: string
          user_id: string | null
          vendor_id: string | null
        }
        Insert: {
          amount_inr?: number | null
          click_id?: string | null
          commission_inr?: number | null
          created_at?: string
          external_order_id?: string | null
          id?: string
          raw_payload?: Json
          recommendation_id?: string | null
          recorded_by?: string | null
          source?: string
          status?: string
          updated_at?: string
          user_id?: string | null
          vendor_id?: string | null
        }
        Update: {
          amount_inr?: number | null
          click_id?: string | null
          commission_inr?: number | null
          created_at?: string
          external_order_id?: string | null
          id?: string
          raw_payload?: Json
          recommendation_id?: string | null
          recorded_by?: string | null
          source?: string
          status?: string
          updated_at?: string
          user_id?: string | null
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_conversions_click_id_fkey"
            columns: ["click_id"]
            isOneToOne: false
            referencedRelation: "affiliate_clicks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_conversions_recommendation_id_fkey"
            columns: ["recommendation_id"]
            isOneToOne: false
            referencedRelation: "affiliate_link_performance"
            referencedColumns: ["recommendation_id"]
          },
          {
            foreignKeyName: "affiliate_conversions_recommendation_id_fkey"
            columns: ["recommendation_id"]
            isOneToOne: false
            referencedRelation: "trip_recommendations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_conversions_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "affiliate_vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_vendors: {
        Row: {
          active: boolean
          affiliate_url_template: string
          category: string
          commission_type: string | null
          commission_value: string | null
          created_at: string
          description: string | null
          disclosure_text: string
          homepage_url: string | null
          id: string
          logo_url: string | null
          name: string
          priority: number
          slug: string
          trusted: boolean
          updated_at: string
          webhook_secret: string | null
        }
        Insert: {
          active?: boolean
          affiliate_url_template: string
          category: string
          commission_type?: string | null
          commission_value?: string | null
          created_at?: string
          description?: string | null
          disclosure_text?: string
          homepage_url?: string | null
          id?: string
          logo_url?: string | null
          name: string
          priority?: number
          slug: string
          trusted?: boolean
          updated_at?: string
          webhook_secret?: string | null
        }
        Update: {
          active?: boolean
          affiliate_url_template?: string
          category?: string
          commission_type?: string | null
          commission_value?: string | null
          created_at?: string
          description?: string | null
          disclosure_text?: string
          homepage_url?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          priority?: number
          slug?: string
          trusted?: boolean
          updated_at?: string
          webhook_secret?: string | null
        }
        Relationships: []
      }
      andaman_knowledge: {
        Row: {
          data: Json
          id: boolean
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          data?: Json
          id?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          data?: Json
          id?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      chats: {
        Row: {
          buyer_id: string
          created_at: string
          id: string
          last_message_at: string
          listing_id: string
          seller_id: string
          updated_at: string
        }
        Insert: {
          buyer_id: string
          created_at?: string
          id?: string
          last_message_at?: string
          listing_id: string
          seller_id: string
          updated_at?: string
        }
        Update: {
          buyer_id?: string
          created_at?: string
          id?: string
          last_message_at?: string
          listing_id?: string
          seller_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chats_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      collaborative_trips: {
        Row: {
          created_at: string | null
          created_by: string
          id: string
          name: string
          shared_notes: string | null
          trip_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          id?: string
          name: string
          shared_notes?: string | null
          trip_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          id?: string
          name?: string
          shared_notes?: string | null
          trip_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "collaborative_trips_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trip_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      email_logs: {
        Row: {
          attempt: number
          created_at: string
          error: string | null
          id: string
          metadata: Json
          provider: string
          provider_message_id: string | null
          recipient: string
          status: string
          subject: string | null
          template: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          attempt?: number
          created_at?: string
          error?: string | null
          id?: string
          metadata?: Json
          provider?: string
          provider_message_id?: string | null
          recipient: string
          status?: string
          subject?: string | null
          template: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          attempt?: number
          created_at?: string
          error?: string | null
          id?: string
          metadata?: Json
          provider?: string
          provider_message_id?: string | null
          recipient?: string
          status?: string
          subject?: string | null
          template?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      email_suppressions: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json
          reason: string
          source: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json
          reason: string
          source?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json
          reason?: string
          source?: string
        }
        Relationships: []
      }
      favorites: {
        Row: {
          created_at: string
          id: string
          listing_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          listing_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          listing_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_images: {
        Row: {
          created_at: string
          display_order: number
          id: string
          image_url: string
          listing_id: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          image_url: string
          listing_id: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          image_url?: string
          listing_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_images_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_reviews: {
        Row: {
          comment: string
          created_at: string | null
          helpful_count: number | null
          id: string
          is_verified: boolean | null
          listing_id: string
          ratings: Json
          updated_at: string | null
          user_id: string
        }
        Insert: {
          comment: string
          created_at?: string | null
          helpful_count?: number | null
          id?: string
          is_verified?: boolean | null
          listing_id: string
          ratings: Json
          updated_at?: string | null
          user_id: string
        }
        Update: {
          comment?: string
          created_at?: string | null
          helpful_count?: number | null
          id?: string
          is_verified?: boolean | null
          listing_id?: string
          ratings?: Json
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_reviews_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listings: {
        Row: {
          area: string | null
          category: string
          city: string
          condition: Database["public"]["Enums"]["listing_condition"]
          created_at: string
          description: string
          id: string
          is_featured: boolean
          price: number
          seller_id: string
          status: Database["public"]["Enums"]["listing_status"]
          subcategory: string | null
          title: string
          updated_at: string
          views_count: number
        }
        Insert: {
          area?: string | null
          category: string
          city?: string
          condition?: Database["public"]["Enums"]["listing_condition"]
          created_at?: string
          description?: string
          id?: string
          is_featured?: boolean
          price: number
          seller_id: string
          status?: Database["public"]["Enums"]["listing_status"]
          subcategory?: string | null
          title: string
          updated_at?: string
          views_count?: number
        }
        Update: {
          area?: string | null
          category?: string
          city?: string
          condition?: Database["public"]["Enums"]["listing_condition"]
          created_at?: string
          description?: string
          id?: string
          is_featured?: boolean
          price?: number
          seller_id?: string
          status?: Database["public"]["Enums"]["listing_status"]
          subcategory?: string | null
          title?: string
          updated_at?: string
          views_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "listings_seller_profile_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listings_seller_profile_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string
          chat_id: string
          created_at: string
          id: string
          image_url: string | null
          read_at: string | null
          sender_id: string
        }
        Insert: {
          body: string
          chat_id: string
          created_at?: string
          id?: string
          image_url?: string | null
          read_at?: string | null
          sender_id: string
        }
        Update: {
          body?: string
          chat_id?: string
          created_at?: string
          id?: string
          image_url?: string | null
          read_at?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          chat_id: string | null
          created_at: string
          id: string
          link: string | null
          listing_id: string | null
          read_at: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          body?: string | null
          chat_id?: string | null
          created_at?: string
          id?: string
          link?: string | null
          listing_id?: string | null
          read_at?: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          body?: string | null
          chat_id?: string | null
          created_at?: string
          id?: string
          link?: string | null
          listing_id?: string | null
          read_at?: string | null
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          listing_id: string | null
          notes: Json
          purpose: string
          razorpay_order_id: string
          razorpay_payment_id: string | null
          razorpay_signature: string | null
          status: Database["public"]["Enums"]["payment_status"]
          trip_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          id?: string
          listing_id?: string | null
          notes?: Json
          purpose?: string
          razorpay_order_id: string
          razorpay_payment_id?: string | null
          razorpay_signature?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          trip_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          listing_id?: string | null
          notes?: Json
          purpose?: string
          razorpay_order_id?: string
          razorpay_payment_id?: string | null
          razorpay_signature?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          trip_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      phone_otps: {
        Row: {
          attempts: number
          channel: string
          code_hash: string
          consumed_at: string | null
          created_at: string
          expires_at: string
          id: string
          phone: string
          user_id: string
        }
        Insert: {
          attempts?: number
          channel: string
          code_hash: string
          consumed_at?: string | null
          created_at?: string
          expires_at: string
          id?: string
          phone: string
          user_id: string
        }
        Update: {
          attempts?: number
          channel?: string
          code_hash?: string
          consumed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          phone?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          area: string | null
          city: string | null
          created_at: string
          email: string | null
          id: string
          is_location_verified: boolean
          name: string | null
          phone: string | null
          phone_verified_at: string | null
          photo_url: string | null
          successful_sales: number
          total_listings: number
          updated_at: string
        }
        Insert: {
          area?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          id: string
          is_location_verified?: boolean
          name?: string | null
          phone?: string | null
          phone_verified_at?: string | null
          photo_url?: string | null
          successful_sales?: number
          total_listings?: number
          updated_at?: string
        }
        Update: {
          area?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_location_verified?: boolean
          name?: string | null
          phone?: string | null
          phone_verified_at?: string | null
          photo_url?: string | null
          successful_sales?: number
          total_listings?: number
          updated_at?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          created_at: string
          details: string | null
          id: string
          listing_id: string
          reason: string
          reporter_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["report_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          listing_id: string
          reason: string
          reporter_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          listing_id?: string
          reason?: string
          reporter_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      review_helpfulness: {
        Row: {
          created_at: string | null
          id: string
          is_helpful: boolean
          review_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_helpful: boolean
          review_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_helpful?: boolean
          review_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_helpfulness_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "listing_reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      site_settings: {
        Row: {
          github_repo_url: string | null
          id: boolean
          site_description: string
          site_title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          github_repo_url?: string | null
          id?: boolean
          site_description?: string
          site_title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          github_repo_url?: string | null
          id?: boolean
          site_description?: string
          site_title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      trip_collaborators: {
        Row: {
          collaborative_trip_id: string
          email: string
          id: string
          invited_at: string | null
          joined_at: string | null
          role: string | null
          user_id: string | null
        }
        Insert: {
          collaborative_trip_id: string
          email: string
          id?: string
          invited_at?: string | null
          joined_at?: string | null
          role?: string | null
          user_id?: string | null
        }
        Update: {
          collaborative_trip_id?: string
          email?: string
          id?: string
          invited_at?: string | null
          joined_at?: string | null
          role?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trip_collaborators_collaborative_trip_id_fkey"
            columns: ["collaborative_trip_id"]
            isOneToOne: false
            referencedRelation: "collaborative_trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_day_feedback: {
        Row: {
          comment: string | null
          created_at: string
          day_number: number
          id: string
          is_helpful: boolean
          trip_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          day_number: number
          id?: string
          is_helpful?: boolean
          trip_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          day_number?: number
          id?: string
          is_helpful?: boolean
          trip_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      trip_generation_logs: {
        Row: {
          conflicts_fixed: Json
          created_at: string
          duration_ms: number | null
          error: string | null
          id: string
          inputs: Json
          model: string | null
          output: Json | null
          status: string
          trip_id: string
          user_id: string
        }
        Insert: {
          conflicts_fixed?: Json
          created_at?: string
          duration_ms?: number | null
          error?: string | null
          id?: string
          inputs: Json
          model?: string | null
          output?: Json | null
          status?: string
          trip_id: string
          user_id: string
        }
        Update: {
          conflicts_fixed?: Json
          created_at?: string
          duration_ms?: number | null
          error?: string | null
          id?: string
          inputs?: Json
          model?: string | null
          output?: Json | null
          status?: string
          trip_id?: string
          user_id?: string
        }
        Relationships: []
      }
      trip_pdfs: {
        Row: {
          created_at: string
          id: string
          storage_path: string
          trip_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          storage_path: string
          trip_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          storage_path?: string
          trip_id?: string
          user_id?: string
        }
        Relationships: []
      }
      trip_recommendations: {
        Row: {
          affiliate_url: string
          click_count: number
          conversion_count: number
          created_at: string
          cta_label: string
          disclosure_text: string
          id: string
          is_affiliate: boolean
          item_name: string
          item_type: string
          merchant_name: string
          meta: Json
          price_inr: number | null
          price_label: string | null
          rank: number
          short_description: string | null
          trip_id: string
          user_id: string
          vendor_id: string | null
        }
        Insert: {
          affiliate_url: string
          click_count?: number
          conversion_count?: number
          created_at?: string
          cta_label?: string
          disclosure_text?: string
          id?: string
          is_affiliate?: boolean
          item_name: string
          item_type: string
          merchant_name: string
          meta?: Json
          price_inr?: number | null
          price_label?: string | null
          rank?: number
          short_description?: string | null
          trip_id: string
          user_id: string
          vendor_id?: string | null
        }
        Update: {
          affiliate_url?: string
          click_count?: number
          conversion_count?: number
          created_at?: string
          cta_label?: string
          disclosure_text?: string
          id?: string
          is_affiliate?: boolean
          item_name?: string
          item_type?: string
          merchant_name?: string
          meta?: Json
          price_inr?: number | null
          price_label?: string | null
          rank?: number
          short_description?: string | null
          trip_id?: string
          user_id?: string
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trip_recommendations_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trip_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_recommendations_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "affiliate_vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_requests: {
        Row: {
          created_at: string
          error: string | null
          id: string
          inputs: Json
          itinerary: Json | null
          preview: Json | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          error?: string | null
          id?: string
          inputs: Json
          itinerary?: Json | null
          preview?: Json | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          error?: string | null
          id?: string
          inputs?: Json
          itinerary?: Json | null
          preview?: Json | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      verification_requests: {
        Row: {
          created_at: string
          id: string
          id_document_url: string | null
          note: string | null
          requested_area: string
          reviewed_at: string | null
          reviewed_by: string | null
          reviewer_note: string | null
          status: Database["public"]["Enums"]["verification_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          id_document_url?: string | null
          note?: string | null
          requested_area: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_note?: string | null
          status?: Database["public"]["Enums"]["verification_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          id_document_url?: string | null
          note?: string | null
          requested_area?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_note?: string | null
          status?: Database["public"]["Enums"]["verification_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      whatsapp_shares: {
        Row: {
          created_at: string | null
          id: string
          listing_id: string | null
          message_template: string | null
          share_type: string
          trip_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          listing_id?: string | null
          message_template?: string | null
          share_type: string
          trip_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          listing_id?: string | null
          message_template?: string | null
          share_type?: string
          trip_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_shares_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_shares_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trip_requests"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      affiliate_link_performance: {
        Row: {
          affiliate_url: string | null
          clicks: number | null
          commission_inr: number | null
          conversions: number | null
          is_high_traffic_no_revenue: boolean | null
          item_name: string | null
          link_created_at: string | null
          merchant_name: string | null
          recommendation_id: string | null
          revenue_inr: number | null
          trip_id: string | null
          vendor_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trip_recommendations_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trip_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_recommendations_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "affiliate_vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      public_profiles: {
        Row: {
          area: string | null
          city: string | null
          created_at: string | null
          id: string | null
          is_location_verified: boolean | null
          name: string | null
          photo_url: string | null
          successful_sales: number | null
          total_listings: number | null
        }
        Insert: {
          area?: string | null
          city?: string | null
          created_at?: string | null
          id?: string | null
          is_location_verified?: boolean | null
          name?: string | null
          photo_url?: string | null
          successful_sales?: number | null
          total_listings?: number | null
        }
        Update: {
          area?: string | null
          city?: string | null
          created_at?: string | null
          id?: string | null
          is_location_verified?: boolean | null
          name?: string | null
          photo_url?: string | null
          successful_sales?: number | null
          total_listings?: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      affiliate_daily_stats: {
        Args: {
          _from: string
          _to: string
          _trip_id?: string
          _vendor_id?: string
        }
        Returns: {
          clicks: number
          commission_inr: number
          conversions: number
          day: string
          revenue_inr: number
        }[]
      }
      affiliate_link_revenue_stats: {
        Args: {
          _from: string
          _item_type?: string
          _to: string
          _vendor_id?: string
        }
        Returns: {
          affiliate_url: string
          clicks: number
          conversion_rate: number
          conversions: number
          item_name: string
          item_type: string
          link_created_at: string
          merchant_name: string
          pending_conversions: number
          pending_revenue_inr: number
          recommendation_id: string
          vendor_id: string
          verified_commission_inr: number
          verified_conversions: number
          verified_revenue_inr: number
          zero_revenue_30d: boolean
        }[]
      }
      affiliate_vendor_stats: {
        Args: { _from: string; _to: string }
        Returns: {
          clicks: number
          commission_inr: number
          conversions: number
          revenue_inr: number
          vendor_id: string
          vendor_name: string
        }[]
      }
      calculate_listing_rating: {
        Args: { listing_uuid: string }
        Returns: {
          average_rating: number
          total_reviews: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_listing_views: {
        Args: { _listing_id: string }
        Returns: undefined
      }
      record_affiliate_conversion: {
        Args: {
          _amount_inr: number
          _click_id: string
          _commission_inr: number
          _external_order_id: string
          _raw_payload: Json
          _recommendation_id: string
          _status: string
          _user_id: string
        }
        Returns: string
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      listing_condition: "new" | "like_new" | "good" | "fair"
      listing_status: "active" | "sold" | "paused" | "removed"
      notification_type:
        | "message"
        | "favorite_update"
        | "listing_status"
        | "verification"
        | "system"
      payment_status: "created" | "paid" | "failed"
      report_status: "pending" | "reviewed" | "dismissed" | "actioned"
      verification_status: "pending" | "approved" | "rejected" | "cancelled"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
      listing_condition: ["new", "like_new", "good", "fair"],
      listing_status: ["active", "sold", "paused", "removed"],
      notification_type: [
        "message",
        "favorite_update",
        "listing_status",
        "verification",
        "system",
      ],
      payment_status: ["created", "paid", "failed"],
      report_status: ["pending", "reviewed", "dismissed", "actioned"],
      verification_status: ["pending", "approved", "rejected", "cancelled"],
    },
  },
} as const
