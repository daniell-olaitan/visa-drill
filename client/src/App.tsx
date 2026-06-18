import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Routes, Route } from "react-router-dom";
import AppLayout from "./components/layout/AppLayout";
import ScrollToHash from "./components/layout/ScrollToHash";
import Debrief from "./pages/Debrief";
import Index from "./pages/Index";
import Interview from "./pages/Interview";
import NotFound from "./pages/NotFound";
import Practice from "./pages/Practice";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ScrollToHash />
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Index />} />
            <Route path="/practice" element={<Practice />} />
            <Route path="/interview" element={<Interview />} />
            <Route path="/debrief" element={<Debrief />} />
            {/* Legacy routes */}
            <Route path="/demo" element={<Navigate to="/practice" replace />} />
            <Route path="/feedback" element={<Navigate to="/debrief" replace />} />
            <Route path="/dashboard" element={<Navigate to="/" replace />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
