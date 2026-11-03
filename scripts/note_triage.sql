-- Adds LLM note-triage columns to requests. Run once in the Supabase SQL editor.
alter table requests
  add column if not exists notes_category text,
  add column if not exists notes_flag boolean,
  add column if not exists notes_summary text,
  add column if not exists notes_triaged_at timestamptz;
