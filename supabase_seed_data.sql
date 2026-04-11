-- SEED DATA FOR COHORTLY
-- Run this in the Supabase SQL Editor to populate your dashboard with realistic data.
-- IMPORTANT: This script assumes you have at least one user in auth.users.
-- It will assign all data to the most recently created user.

DO $$
DECLARE
    v_owner_id uuid;
    v_program_id uuid;
    v_rubric_team_id uuid;
    v_rubric_product_id uuid;
    v_rubric_market_id uuid;
    v_rubric_traction_id uuid;
    v_rubric_intro_id uuid;
BEGIN
    -- 1. GET OWNER ID (Latest user)
    SELECT id INTO v_owner_id FROM auth.users ORDER BY created_at DESC LIMIT 1;
    
    IF v_owner_id IS NULL THEN
        RAISE EXCEPTION 'No users found in auth.users. Please sign up first!';
    END IF;

    -- Ensure profile exists
    INSERT INTO public.profiles (id, full_name, email, role)
    VALUES (v_owner_id, 'Demo Admin', 'admin@cohortly.com', 'admin')
    ON CONFLICT (id) DO NOTHING;

    -- 2. CREATE PROGRAM
    INSERT INTO public.programs (owner_id, name, slug, type, description, status, open_date, deadline)
    VALUES (
        v_owner_id,
        'Summer 2025 Accelerator',
        'summer-2025-' || floor(random() * 1000)::text,
        'Accelerator',
        'Our flagship 12-week program for early-stage AI startups.',
        'published',
        now() - interval '2 weeks',
        now() + interval '4 weeks'
    )
    RETURNING id INTO v_program_id;

    -- 3. CREATE FORM
    INSERT INTO public.forms (program_id, title, description, fields)
    VALUES (
        v_program_id,
        'Application Form',
        'Tell us about your startup.',
        '[
            {"id": "q1", "type": "text", "label": "Startup Name", "req": true},
            {"id": "q2", "type": "textarea", "label": "Problem Statement", "req": true},
            {"id": "q3", "type": "textarea", "label": "Solution", "req": true},
            {"id": "q4", "type": "number", "label": "Traction (MRR)", "req": false}
        ]'::jsonb
    );

    -- 4. CREATE RUBRIC
    INSERT INTO public.rubrics (program_id, name, weight, description, prompt)
    VALUES 
    (v_program_id, 'Team', 30, 'Experience and capability of founders', 'Evaluate the technical and business experience.'),
    (v_program_id, 'Product', 25, 'Innovation and feasibility', 'Is the solution unique and buildable?'),
    (v_program_id, 'Market', 20, 'Market size and timing', 'Is the TAM > $1B?'),
    (v_program_id, 'Traction', 15, 'Current metrics and growth', 'Do they have paying customers?'),
    (v_program_id, 'Pres', 10, 'Quality of pitch', 'Clarity of communication.');
    
    -- Store rubric IDs for scoring
    SELECT id INTO v_rubric_team_id FROM public.rubrics WHERE program_id = v_program_id AND name = 'Team';
    SELECT id INTO v_rubric_product_id FROM public.rubrics WHERE program_id = v_program_id AND name = 'Product';
    SELECT id INTO v_rubric_market_id FROM public.rubrics WHERE program_id = v_program_id AND name = 'Market';
    SELECT id INTO v_rubric_traction_id FROM public.rubrics WHERE program_id = v_program_id AND name = 'Traction';
    SELECT id INTO v_rubric_intro_id FROM public.rubrics WHERE program_id = v_program_id AND name = 'Pres';

    -- 5. GENERATE 30 APPLICATIONS
    -- We'll use a loop to generate varied data
    DECLARE
        i integer;
        v_status app_status;
        v_score numeric;
        v_app_id uuid;
        v_names text[] := ARRAY['Alex Chen', 'Sarah Jones', 'Mike Ross', 'Jessica Pearson', 'Harvey Specter', 'Louis Litt', 'Donna Paulsen', 'Rachel Zane', 'Katrina Bennett', 'Samantha Wheeler', 'Robert Zane', 'Dana Scott', 'Jeff Malone', 'Sheila Sazs', 'Gretchen Bodinski', 'Stan Jacobson', 'Harold Gunderson', 'Jenny Griffith', 'Trevor Evans', 'Kyle Durant', 'Dominic Barone', 'Norma', 'Benjamin', 'Stu Buzzini', 'David Greenwald', 'Jack Soloff', 'Charles Forstman', 'Daniel Hardman', 'Travis Tanner', 'Sean Cahill'];
        v_companies text[] := ARRAY['Nexus AI', 'FlowState', 'Quantum Leap', 'BlueSky', 'RedWood', 'GreenField', 'DarkMatter', 'LightSpeed', 'Nebula', 'Galaxy', 'Comet', 'Asteroid', 'Meteor', 'Planet X', 'StarDust', 'Void', 'Horizon', 'Vertical', 'Parallel', 'Orthogonal', 'Vector', 'Scalar', 'Tensor', 'Matrix', 'Vertex', 'Edge', 'Node', 'Loop', 'Cycle', 'Graph'];
    BEGIN
        FOR i IN 1..30 LOOP
            -- Random status
            v_status := (ARRAY['new', 'reviewing', 'reviewing', 'shortlist', 'interview', 'accepted', 'rejected'])[floor(random() * 7 + 1)];
            
            -- Random overall score (weighted towards 70-90)
            v_score := floor(random() * 40 + 60);

            INSERT INTO public.applications (
                program_id, 
                applicant_email, 
                applicant_name, 
                company_name, 
                status, 
                overall_ai_score,
                scores,
                submitted_at
            )
            VALUES (
                v_program_id,
                lower(replace(v_names[i], ' ', '.')) || '@example.com',
                v_names[i],
                v_companies[i],
                v_status,
                v_score,
                jsonb_build_object(
                    v_rubric_team_id, jsonb_build_object('score', floor(random() * 30 + 70)),
                    v_rubric_product_id, jsonb_build_object('score', floor(random() * 30 + 70)),
                    v_rubric_market_id, jsonb_build_object('score', floor(random() * 30 + 70)),
                    v_rubric_traction_id, jsonb_build_object('score', floor(random() * 30 + 70)),
                    v_rubric_intro_id, jsonb_build_object('score', floor(random() * 30 + 70))
                ),
                now() - (floor(random() * 14) || ' days')::interval
            )
            RETURNING id INTO v_app_id;

            -- Add a comment to some apps
            IF random() > 0.7 THEN
                INSERT INTO public.comments (application_id, user_id, text)
                VALUES (v_app_id, v_owner_id, 'Looks promising, but need to check their traction numbers.');
            END IF;

        END LOOP;
    END;

    RAISE NOTICE 'Seed data initialized successfully for Program: %', v_program_id;
END $$;
