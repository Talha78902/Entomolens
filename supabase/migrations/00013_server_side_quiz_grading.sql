-- 00013_server_side_quiz_grading.sql
--
-- Move quiz grading from the browser to Postgres.
--
-- The problem
-- ----------
-- 00005_rls.sql created "attempt_insert" on public.quiz_attempts, which allows
-- any authenticated user to insert a row containing whatever score they like.
-- On top of that, the client fetched quiz_options.is_correct over PostgREST and
-- computed the score in JavaScript, so the answer key was public to anyone who
-- opened devtools, and the recorded score was never verified against anything.
--
-- The fix
-- -------
--   1. public.submit_quiz() grades the submission inside the database and
--      writes the attempt itself. The client never learns the answer key and
--      cannot influence the stored score.
--   2. Direct INSERT on quiz_attempts is withdrawn; the function is the only
--      writer.
--   3. Column-level SELECT on quiz_options.is_correct is revoked, so the
--      answer key is no longer readable through the REST API.
--
-- SECURITY DEFINER is required: the function must read is_correct on behalf of
-- a caller who is not permitted to. search_path is pinned so the function body
-- cannot be hijacked via a malicious schema on the caller's search_path.

-- ---------------------------------------------------------------------------
-- 1. Grading function
-- ---------------------------------------------------------------------------
create or replace function public.submit_quiz(
  p_quiz_id uuid,
  p_answers jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user         uuid := auth.uid();
  v_question_ids uuid[];
  v_total        int;
  v_correct      int;
  v_score        numeric(5, 2);
  v_results      jsonb;
begin
  if v_user is null then
    raise exception 'Authentication required.' using errcode = '28000';
  end if;

  if p_answers is null or jsonb_typeof(p_answers) <> 'object' then
    raise exception 'Answers must be a JSON object of question_id -> option_id.'
      using errcode = '22023';
  end if;

  -- Canonical question order for this quiz.
  select coalesce(array_agg(q.id order by q."order"), '{}'::uuid[])
    into v_question_ids
  from public.quiz_questions q
  where q.quiz_id = p_quiz_id;

  v_total := coalesce(cardinality(v_question_ids), 0);
  if v_total = 0 then
    raise exception 'Quiz not found or contains no questions.' using errcode = '22023';
  end if;

  -- Build one result per question.
  --
  -- The submitted value is only cast to uuid after a regex check, so a
  -- malformed payload raises a clear error instead of an opaque
  -- "invalid input syntax for type uuid" from a blind cast.
  --
  -- coalesce(chosen = correct, false) matters: `chosen = correct` evaluates to
  -- NULL when either side is NULL, which would otherwise let an unanswered
  -- question whose quiz has no correct option be counted as correct.
  with questions as (
    select q.id, q."order", q.explanation,
           (
             select o.id
             from public.quiz_options o
             where o.question_id = q.id and o.is_correct
             order by o."order"
             limit 1
           ) as correct_option_id
    from public.quiz_questions q
    where q.id = any (v_question_ids)
  ),
  marked as (
    select qq.id, qq."order", qq.explanation, qq.correct_option_id,
           case
             when p_answers ->> qq.id::text ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
               then (p_answers ->> qq.id::text)::uuid
             else null
           end as chosen_option_id
    from questions qq
  )
  select
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'question_id',      m.id,
          'chosen_option_id', m.chosen_option_id,
          'correct_option_id', m.correct_option_id,
          'is_correct',       coalesce(m.chosen_option_id = m.correct_option_id, false),
          'explanation',      m.explanation
        ) order by m."order"
      ),
      '[]'::jsonb
    ),
    count(*) filter (where coalesce(m.chosen_option_id = m.correct_option_id, false))
  into v_results, v_correct
  from marked m;

  v_score := round(v_correct::numeric * 100 / v_total, 2);

  -- The function is the only remaining writer of attempts, so the stored score
  -- always matches the stored correct_answers.
  insert into public.quiz_attempts (
    quiz_id, user_id, score, total_questions,
    correct_answers, wrong_answers, completed_at
  )
  values (
    p_quiz_id, v_user, v_score, v_total,
    v_correct, v_total - v_correct, now()
  );

  return jsonb_build_object(
    'quiz_id',         p_quiz_id,
    'score',           v_score,
    'total_questions', v_total,
    'correct_answers', v_correct,
    'wrong_answers',   v_total - v_correct,
    'results',         v_results
  );
end;
$$;

comment on function public.submit_quiz(uuid, jsonb) is
  'Grades a quiz submission server-side and records the attempt. Returns the per-question result including correct option ids, so the browser never needs read access to quiz_options.is_correct.';

-- Only authenticated users may call it, and only with exactly this signature.
revoke all on function public.submit_quiz(uuid, jsonb) from public;
revoke all on function public.submit_quiz(uuid, jsonb) from anon;
grant execute on function public.submit_quiz(uuid, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Withdraw the client's ability to write its own attempts
-- ---------------------------------------------------------------------------
-- Grades were previously computed in the browser and inserted directly, so any
-- client could post score = 100. Writing now happens only in the function above.
drop policy if exists "attempt_insert" on public.quiz_attempts;

revoke insert on public.quiz_attempts from anon, authenticated;

-- Score-bearing columns are no longer updatable by the owner either.
revoke update on public.quiz_attempts from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. Hide the answer key
-- ---------------------------------------------------------------------------
-- 00005_rls.sql grants quiz_option_select to anon and authenticated, which made
-- is_correct readable by anyone, signed in or not. Replace the blanket grant
-- with an explicit column list that omits is_correct.
revoke select on public.quiz_options from anon, authenticated;

grant select (id, created_at, question_id, option_text, "order")
  on public.quiz_options to anon, authenticated;

-- The function is SECURITY DEFINER, so it still reads is_correct as its owner.
