import { SupabaseClient } from '@supabase/supabase-js';

export async function seedDemoCohort(supabase: SupabaseClient, userId: string) {
    // 1. Check if the user already has any programs.
    // If they have programs, we don't want to clutter their account with a demo.
    const { count, error: countError } = await supabase
        .from('programs')
        .select('*', { count: 'exact', head: true })
        .eq('owner_id', userId);

    if (countError) {
        console.error("Error checking for existing programs:", countError);
        return;
    }

    if (count && count > 0) {
        return; // Already has content
    }

    const slug = `demo-cohort-${Math.random().toString(36).substring(2, 7)}`;

    // 2. Create Program
    const { data: program, error: progError } = await supabase.from('programs').insert({
        owner_id: userId,
        name: 'Demo: YC W26 Applications',
        slug: slug,
        type: 'Accelerator',
        status: 'published',
        collect_name: true,
        description: 'A sample cohort to show how applications, rubrics, and AI reviews work together. *Note: The applications and companies in this demo are entirely fictional and generated for demonstration purposes.*'
    }).select('id').single();

    if (!program || progError) {
        console.error("Failed to create demo program:", progError);
        return;
    }
    const programId = program.id;

    // 3. Create Form
    const q1Id = `q-${Date.now()}-1`;
    const q2Id = `q-${Date.now()}-2`;
    const q3Id = `q-${Date.now()}-3`;

    const formFields = [
        {
            id: 'section-1',
            title: 'Company Details',
            isCollapsed: false,
            questions: [
                { id: q1Id, type: 'short-text', text: 'Company Name', required: true },
                { id: q2Id, type: 'long-text', text: 'What is your product and what does it do?', required: true },
                { id: q3Id, type: 'revenue', text: 'Current monthly revenue?', required: true }
            ]
        }
    ];

    await supabase.from('forms').insert({
        program_id: programId,
        title: 'YC W26 Application',
        fields: formFields
    });

    // 4. Create Rubrics
    await supabase.from('rubrics').insert([
        { program_id: programId, name: 'Idea & Market', weight: 40, description: 'Is the market large and the idea compelling?' },
        { program_id: programId, name: 'Traction', weight: 30, description: 'Do they have early validation or revenue?' },
        { program_id: programId, name: 'Team', weight: 30, description: 'Is the team capable of building this?' }
    ]);

    // 5. Create threshold rules
    await supabase.from('threshold_rules').insert([
        { program_id: programId, target: 'overall_ai_score', operator: '>=', value: 85, action: 'shortlist' },
        { program_id: programId, target: 'overall_ai_score', operator: '<', value: 50, action: 'reject' }
    ]);

    // 6. Add Reviewer
    await supabase.from('program_reviewers').insert({
        program_id: programId,
        user_id: userId,
        role: 'admin'
    });

    // 7. Create Fake Applications
    const fakeApps = [
        {
            program_id: programId,
            applicant_name: 'Alice Founder',
            applicant_email: 'alice@quantum.ai',
            company_name: 'Quantum.ai',
            status: 'new',
            answers: {
                [q1Id]: 'Quantum.ai',
                [q2Id]: 'We are building a unified API for quantum computers, allowing developers to run algorithms across different hardware providers without changing their code.',
                [q3Id]: '$5,000 MRR'
            }
        },
        {
            program_id: programId,
            applicant_name: 'Bob Builder',
            applicant_email: 'bob@brickstack.com',
            company_name: 'BrickStack',
            status: 'new',
            answers: {
                [q1Id]: 'BrickStack',
                [q2Id]: 'An automated marketplace connecting freelance construction workers with mid-sized building projects.',
                [q3Id]: 'Pre-revenue'
            }
        },
        {
            program_id: programId,
            applicant_name: 'Charlie Davis',
            applicant_email: 'charlie@healthsync.co',
            company_name: 'HealthSync',
            status: 'new',
            answers: {
                [q1Id]: 'HealthSync',
                [q2Id]: 'Wearable integration platform for remote patient monitoring. Doctors get real-time alerts if vitals drop.',
                [q3Id]: '$12,000 MRR'
            }
        },
        {
            program_id: programId,
            applicant_name: 'Dana Okafor',
            applicant_email: 'dana@ledgerleaf.io',
            company_name: 'LedgerLeaf',
            status: 'new',
            answers: {
                [q1Id]: 'LedgerLeaf',
                [q2Id]: 'We help climate startups automate carbon accounting and investor reporting by pulling data directly from their finance stack and suppliers.',
                [q3Id]: '$3,200 MRR'
            }
        },
        {
            program_id: programId,
            applicant_name: 'Ethan Park',
            applicant_email: 'ethan@dockpilot.ai',
            company_name: 'DockPilot',
            status: 'new',
            answers: {
                [q1Id]: 'DockPilot',
                [q2Id]: 'AI copilot for warehouse dock scheduling that predicts truck arrival delays, reassigns bays, and reduces idle labor time.',
                [q3Id]: '$18,500 MRR'
            }
        },
        {
            program_id: programId,
            applicant_name: 'Fatima Rahman',
            applicant_email: 'fatima@campusbite.app',
            company_name: 'CampusBite',
            status: 'new',
            answers: {
                [q1Id]: 'CampusBite',
                [q2Id]: 'Mobile ordering and pickup software for university cafeterias, built to handle meal-plan payments and peak lunchtime queues.',
                [q3Id]: '$1,100 MRR'
            }
        },
        {
            program_id: programId,
            applicant_name: 'Gabriel Mensah',
            applicant_email: 'gabriel@claimforge.io',
            company_name: 'ClaimForge',
            status: 'new',
            answers: {
                [q1Id]: 'ClaimForge',
                [q2Id]: 'We automate commercial insurance claims intake for brokers, turning emails, PDFs, and photos into structured case files in minutes.',
                [q3Id]: 'Pre-revenue'
            }
        },
        {
            program_id: programId,
            applicant_name: 'Hannah Lee',
            applicant_email: 'hannah@rootgrid.energy',
            company_name: 'RootGrid Energy',
            status: 'new',
            answers: {
                [q1Id]: 'RootGrid Energy',
                [q2Id]: 'Software for solar installers to design residential systems faster, generate financing options, and monitor project profitability.',
                [q3Id]: '$7,800 MRR'
            }
        },
        {
            program_id: programId,
            applicant_name: 'Isaac Moreno',
            applicant_email: 'isaac@voiceops.dev',
            company_name: 'VoiceOps',
            status: 'new',
            answers: {
                [q1Id]: 'VoiceOps',
                [q2Id]: 'Developer toolkit for building multilingual voice agents with call routing, observability, and compliance logs out of the box.',
                [q3Id]: '$24,000 MRR'
            }
        },
        {
            program_id: programId,
            applicant_name: 'Jia Chen',
            applicant_email: 'jia@trialmesh.bio',
            company_name: 'TrialMesh Bio',
            status: 'new',
            answers: {
                [q1Id]: 'TrialMesh Bio',
                [q2Id]: 'Patient recruitment platform for biotech trials that matches eligible participants from specialty clinics using structured eligibility data.',
                [q3Id]: '$9,400 MRR'
            }
        }
    ];

    await supabase.from('applications').insert(fakeApps);
}
