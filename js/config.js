// Replace these two values after creating your Supabase project.
export const CONFIG = Object.freeze({
  supabaseUrl: 'https://qjlvmwuwfkdgaerjuixj.supabase.co',
  supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqbHZtd3V3ZmtkZ2Flcmp1aXhqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQwMTk2OTIsImV4cCI6MjEwOTU5NTY5Mn0.mdhZdllmUWrL1env4xcVvXK3U9cMNtKsH7qASC9qSlM',
  youtubeChannelId: '', // Optional: UC... channel ID for automatic discovery
  eventStart: '2026-11-08T08:00:00+01:00',
  eventName: 'BERACHA 2026 | 11 Hours of Praise',
  youtubeChannelUrl: 'https://www.youtube.com/@Newhbcilorin', // Verify the actual YouTube handle before launch.
  facebookUrl: 'https://www.facebook.com/', // Replace with verified church page
  pollingMs: 60000
});
export const configured = () => CONFIG.supabaseUrl.startsWith('https://') && !CONFIG.supabaseUrl.includes('YOUR_PROJECT') && !CONFIG.supabaseAnonKey.includes('YOUR_');
