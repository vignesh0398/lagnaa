import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import { AppLayout } from './components/layout/AppLayout';
import { RoleGuard } from './components/layout/RoleGuard';
import { AppearanceProvider } from './hooks/useAppearance';
import { AppearanceSettings } from './pages/AppearanceSettings';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Agents } from './pages/Agents';
import { CallHistory } from './pages/CallHistory';
import { PromptLibrary } from './pages/PromptLibrary';
import { KnowledgeBasePage } from './pages/KnowledgeBase';
import { Team } from './pages/Team';
import { Gateway } from './pages/Gateway';
import { WhatsAppCampaignPage } from './pages/WhatsAppCampaign';
import { WhatsAppChatHistory } from './pages/WhatsAppChatHistory';
import { EmailCampaignPage } from './pages/EmailCampaign';
import { EmailChatHistory } from './pages/EmailChatHistory';
import { SecurityScans } from './pages/SecurityScans';
import { AnalyticsHub } from './pages/AnalyticsHub';
import { ApiWebhooks } from './pages/ApiWebhooks';
import { BillingUsage } from './pages/BillingUsage';
import { GoHighLevel } from './pages/GoHighLevel';
import { SeoMarketing } from './pages/SeoMarketing';
import { CompetitorCompare } from './pages/marketing/CompetitorCompare';
import { SocialPreview } from './pages/marketing/SocialPreview';
import { SocialStudio } from './pages/marketing/SocialStudio';
import { LocalSeo } from './pages/marketing/LocalSeo';
import { MarketingRoadmap } from './pages/marketing/MarketingRoadmap';
import { WhiteLabelSettings } from './pages/marketing/WhiteLabelSettings';
import { Contacts } from './pages/Contacts';
import { Conversations } from './pages/Conversations';
import { ProspectFinder } from './pages/ProspectFinder';
import { MapsLeadFinder } from './pages/MapsLeadFinder';
import { HomeHub } from './pages/HomeHub';


export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
      <AppearanceProvider>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route element={<AppLayout />}>
          <Route element={<RoleGuard />}>
            <Route path="/settings/appearance" element={<AppearanceSettings />} />
            <Route path="/home" element={<HomeHub />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/contacts" element={<Contacts />} />
            <Route path="/prospects" element={<ProspectFinder />} />
            <Route path="/maps-leads" element={<MapsLeadFinder />} />
            <Route path="/conversations" element={<Conversations />} />
            <Route path="/conversations/:contactId" element={<Conversations />} />
            <Route path="/agents" element={<Agents />} />
            <Route path="/calls" element={<CallHistory />} />
            <Route path="/security" element={<SecurityScans />} />
            <Route path="/prompts" element={<PromptLibrary />} />
            <Route path="/knowledge" element={<KnowledgeBasePage />} />
            <Route path="/team" element={<Team />} />

            <Route path="/gateway" element={<Gateway />} />
            <Route path="/whatsapp" element={<WhatsAppCampaignPage />} />
            <Route path="/whatsapp/chats" element={<WhatsAppChatHistory />} />
            <Route path="/email" element={<EmailCampaignPage />} />
            <Route path="/email/chats" element={<EmailChatHistory />} />
            <Route path="/analytics" element={<AnalyticsHub />} />
            <Route path="/integrations" element={<ApiWebhooks />} />
            <Route path="/billing" element={<BillingUsage />} />
            <Route path="/ghl" element={<GoHighLevel />} />
            <Route path="/marketing/seo" element={<SeoMarketing />} />
            <Route path="/marketing/competitors" element={<CompetitorCompare />} />
            <Route path="/marketing/studio" element={<SocialStudio />} />
            <Route path="/marketing/social" element={<SocialPreview />} />
            <Route path="/marketing/local" element={<LocalSeo />} />
            <Route path="/marketing/roadmap" element={<MarketingRoadmap />} />
            <Route path="/marketing/white-label" element={<WhiteLabelSettings />} />
            <Route path="/seo" element={<Navigate to="/marketing/seo" replace />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </AppearanceProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}