alter table public.feedback_submissions
  drop constraint feedback_submissions_feedback_type_check;

alter table public.feedback_submissions
  add constraint feedback_submissions_feedback_type_check
  check (feedback_type in (
    'bug',
    'feature_request',
    'content_correction',
    'privacy_request'
  ));
