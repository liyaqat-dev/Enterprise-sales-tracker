import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://aormlfkegnheawtqrtvx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFvcm1sZmtlZ25oZWF3dHFydHZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4MDEwMDYsImV4cCI6MjA5NTM3NzAwNn0.pf4YCh2E4g5L_K6bM1WZZ5byiAWEp_2LzUbMke9OqNM';

export const supabase = createClient(supabaseUrl, supabaseKey);
