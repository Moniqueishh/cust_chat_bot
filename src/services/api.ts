import { ProjectData } from '../types';

export async function fetchProjectData(projectId: string): Promise<ProjectData> {
  // Using a relative URL to ensure we stay within the same origin and avoid Cloud Run auth issues
  const response = await fetch(`/api/project/${projectId}`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
    }
  });

  // Debug: Check if the request actually reached our Express server
  const appStatus = response.headers.get('X-App-Status');
  if (!appStatus && response.status === 403) {
    console.error('CRITICAL: Request blocked by Google Front-End (GFE) before reaching Express.');
    throw new Error('Access Denied: The request was blocked by the platform. Please ensure "Allow unauthenticated" is enabled for this Cloud Run service.');
  }

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Project not found. Please check your installation link.');
    }
    throw new Error(`Failed to fetch project data (Status: ${response.status})`);
  }

  const data = await response.json();
  return data;
}
