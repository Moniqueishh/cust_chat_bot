export interface SubTenant {
  name: string;
}

export interface AssistantResponse {
  customer_message: string;
  status_summary: string;
  what_happened: string[];
  what_happens_next: string[];
  cost_breakdown: string[];
  key_details: string[];
  needs_info: string[];
}

export interface ProjectData {
  firstName: string;
  subTenants: SubTenant[];
  projectStatus: string;
  chargerType?: string;
  scheduledInstallationDate: string | null;
  installerPhone?: string;
  installerEmail?: string;
  installerCompanyName?: string;
  projectType?: string;
  cusChatBotUrl?: string;
}

export type StepStatus = 'completed' | 'current' | 'future';

export interface PathwayStep {
  id: number;
  label: string;
}

export const STEPS: PathwayStep[] = [
  { id: 1, label: 'Survey' },
  { id: 2, label: 'Permits' },
  { id: 3, label: 'Scheduling' },
  { id: 4, label: 'Installation' },
  { id: 5, label: 'Ready' },
];
