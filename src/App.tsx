import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/Layout";
import { AuthProvider } from "@/hooks/useAuth";
import { SiteMetaProvider } from "@/hooks/useSiteMeta";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import Listings from "./pages/Listings.tsx";
import ListingDetail from "./pages/ListingDetail.tsx";
import CreateListing from "./pages/CreateListing.tsx";
import ChatList from "./pages/ChatList.tsx";
import ChatRoom from "./pages/ChatRoom.tsx";
import Profile from "./pages/Profile.tsx";
import Dashboard from "./pages/Dashboard.tsx";
import AuthView from "./pages/AuthView.tsx";
import ResetPassword from "./pages/ResetPassword.tsx";
import PrivacyPolicy from "./pages/PrivacyPolicy.tsx";
import TermsOfService from "./pages/TermsOfService.tsx";
import Brand from "./pages/Brand.tsx";
import Favorites from "./pages/Favorites.tsx";
import PaymentTestChecklist from "./pages/PaymentTestChecklist.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <AuthProvider>
        <SiteMetaProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
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
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </TooltipProvider>
        </SiteMetaProvider>
      </AuthProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
