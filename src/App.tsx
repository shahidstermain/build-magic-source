import { lazy, Suspense, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/Layout";
import { AuthProvider } from "@/hooks/useAuth";
import { SiteMetaProvider } from "@/hooks/useSiteMeta";
import { recordVisitorOnce } from "@/lib/visitorTracking";
import { AdminGuard } from "@/components/AdminGuard";

const Index = lazy(() => import("./pages/Index.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));
const Listings = lazy(() => import("./pages/Listings.tsx"));
const ListingDetail = lazy(() => import("./pages/ListingDetail.tsx"));
const CreateListing = lazy(() => import("./pages/CreateListing.tsx"));
const ChatList = lazy(() => import("./pages/ChatList.tsx"));
const ChatRoom = lazy(() => import("./pages/ChatRoom.tsx"));
const Profile = lazy(() => import("./pages/Profile.tsx"));
const Dashboard = lazy(() => import("./pages/Dashboard.tsx"));
const AuthView = lazy(() => import("./pages/AuthView.tsx"));
const ResetPassword = lazy(() => import("./pages/ResetPassword.tsx"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy.tsx"));
const TermsOfService = lazy(() => import("./pages/TermsOfService.tsx"));
const Brand = lazy(() => import("./pages/Brand.tsx"));
const Favorites = lazy(() => import("./pages/Favorites.tsx"));
const PaymentTestChecklist = lazy(() => import("./pages/PaymentTestChecklist.tsx"));
const TripPlanner = lazy(() => import("./pages/TripPlanner.tsx"));
const MyTrips = lazy(() => import("./pages/MyTrips.tsx"));
const AdminEmails = lazy(() => import("./pages/AdminEmails.tsx"));
const AdminAffiliates = lazy(() => import("./pages/AdminAffiliates.tsx"));
const AdminAffiliateRevenue = lazy(() => import("./pages/AdminAffiliateRevenue.tsx"));
const AdminKnowledge = lazy(() => import("./pages/AdminKnowledge.tsx"));
const AdminTripLeads = lazy(() => import("./pages/AdminTripLeads.tsx"));
const Contact = lazy(() => import("./pages/Contact.tsx"));
const WhatsNew = lazy(() => import("./pages/WhatsNew.tsx"));
const AdminReleaseNotes = lazy(() => import("./pages/AdminReleaseNotes.tsx"));
const AdminPriceQA = lazy(() => import("./pages/AdminPriceQA.tsx"));
const Blog = lazy(() => import("./pages/Blog.tsx"));
const BlogPost = lazy(() => import("./pages/BlogPost.tsx"));
const AdminBlog = lazy(() => import("./pages/AdminBlog.tsx"));
const AdminBlogEditor = lazy(() => import("./pages/AdminBlogEditor.tsx"));
const Pricing = lazy(() => import("./pages/Pricing.tsx"));

const queryClient = new QueryClient();

const App = () => {
  useEffect(() => {
    void recordVisitorOnce();
  }, []);
  return (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <AuthProvider>
        <SiteMetaProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <Suspense fallback={null}>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<Index />} />
              <Route path="/listings" element={<Listings />} />
              <Route path="/listings/:id" element={<ListingDetail />} />
              <Route path="/sell" element={<CreateListing />} />
              <Route path="/chats" element={<ChatList />} />
              <Route path="/chats/:id" element={<ChatRoom />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/auth" element={<AuthView />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/terms" element={<TermsOfService />} />
              <Route path="/brand" element={<Brand />} />
              <Route path="/favorites" element={<Favorites />} />
              <Route path="/payment-test" element={<PaymentTestChecklist />} />
              <Route path="/trip-planner" element={<TripPlanner />} />
              <Route path="/my-trips" element={<MyTrips />} />
              <Route path="/admin/emails" element={<AdminGuard><AdminEmails /></AdminGuard>} />
              <Route path="/admin/affiliates" element={<AdminGuard><AdminAffiliates /></AdminGuard>} />
              <Route path="/admin/affiliate-revenue" element={<AdminGuard><AdminAffiliateRevenue /></AdminGuard>} />
              <Route path="/admin/knowledge" element={<AdminGuard><AdminKnowledge /></AdminGuard>} />
              <Route path="/admin/trip-leads" element={<AdminGuard><AdminTripLeads /></AdminGuard>} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/whats-new" element={<WhatsNew />} />
              <Route path="/admin/release-notes" element={<AdminGuard><AdminReleaseNotes /></AdminGuard>} />
              <Route path="/admin/price-qa" element={<AdminGuard><AdminPriceQA /></AdminGuard>} />
              <Route path="/blog" element={<Blog />} />
              <Route path="/blog/:slug" element={<BlogPost />} />
              <Route path="/admin/blog" element={<AdminGuard><AdminBlog /></AdminGuard>} />
              <Route path="/admin/blog/new" element={<AdminGuard><AdminBlogEditor /></AdminGuard>} />
              <Route path="/admin/blog/edit/:id" element={<AdminGuard><AdminBlogEditor /></AdminGuard>} />
              <Route path="/pricing" element={<Pricing />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
          </Suspense>
        </TooltipProvider>
        </SiteMetaProvider>
      </AuthProvider>
    </BrowserRouter>
  </QueryClientProvider>
  );
};

export default App;
