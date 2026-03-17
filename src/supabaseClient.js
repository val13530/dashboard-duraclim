import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://myjiroypanbtcmrwdyhn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15amlyb3lwYW5idGNtcndkeWhuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2NjkwMTUsImV4cCI6MjA4OTI0NTAxNX0.z1b8wiOLmuVxQAds0e77CQn187J3m3AereMAwXGvZlc';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
