// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { application_id, program_id } = await req.json()
        console.log(`[AI-Scorer] Starting for App: ${application_id}, Program: ${program_id}`)

        const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
        const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || ''
        const geminiApiKey = Deno.env.get('GEMINI_API_KEY')

        if (!geminiApiKey) throw new Error('GEMINI_API_KEY secret is missing in Supabase')

        // --- AUTH VERIFICATION ---
        // Extract the JWT from the Authorization header and verify the caller
        const authHeader = req.headers.get('Authorization')
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new Error('Unauthorized: Missing or invalid Authorization header.')
        }

        const userToken = authHeader.replace('Bearer ', '')
        const userClient = createClient(supabaseUrl, supabaseAnonKey, {
            global: { headers: { Authorization: `Bearer ${userToken}` } }
        })
        const { data: { user }, error: authError } = await userClient.auth.getUser()

        if (authError || !user) {
            throw new Error('Unauthorized: Invalid or expired session token.')
        }
        console.log(`[AI-Scorer] Authenticated user: ${user.id}`)
        // --- END AUTH VERIFICATION ---

        const supabase = createClient(supabaseUrl, supabaseServiceKey)

        // 1. Fetch Program and its Rubric (Fix: Rubric is likely in its own table)
        const { data: program, error: programError } = await supabase
            .from('programs')
            .select('name, type, owner_id')
            .eq('id', program_id)
            .single()

        if (programError || !program) throw new Error('Program not found')

        // 1a. Authorization Check — caller must own the program
        if (program.owner_id !== user.id) {
            throw new Error('Forbidden: You do not own this program.')
        }
        
        // 1b. Usage Limit Check (100 AI scores per 24 hours)
        const { data: userPrograms } = await supabase
            .from('programs')
            .select('id')
            .eq('owner_id', program.owner_id)

        const programIds = userPrograms?.map(p => p.id) || []
        
        if (programIds.length > 0) {
            const { count: dailyScores, error: countError } = await supabase
                .from('applications')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'scored')
                .in('program_id', programIds)
                .gte('updated_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

            if (countError) {
                console.error('[AI-Scorer] Limit check failed:', countError)
            } else if (dailyScores !== null && dailyScores >= 100) {
                throw new Error('Daily AI scoring limit reached (100/day). Please try again tomorrow.')
            }
        }


        const { data: rubric, error: rubricError } = await supabase
            .from('rubrics')
            .select('id, name, weight')
            .eq('program_id', program_id)

        if (rubricError || !rubric || rubric.length === 0) {
            throw new Error('No rubric found for this program')
        }

        // 2. Fetch Application
        const { data: application, error: appError } = await supabase
            .from('applications')
            .select('answers')
            .eq('id', application_id)
            .single()

        if (appError || !application) throw new Error('Application data not found')

        // 3. Build Prompt
        const prompt = `
You are an expert evaluator. Score this application for "${program.name}" strictly according to the rubric.
Rubric: ${JSON.stringify(rubric)}
Answers: ${JSON.stringify(application.answers)}

Respond ONLY with valid JSON:
{
  "overall_score": <number 0-100>,
  "reasoning_summary": "<string>",
  "breakdown": [
    { "criterion_id": "<id>", "score": <number 0-100>, "explanation": "<string>" }
  ]
}`

        // 4. Call Gemini
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`
        const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { temperature: 0.1 }
            })
        })

        if (!res.ok) {
            const err = await res.text()
            throw new Error(`Gemini API error: ${res.status} - ${err}`)
        }

        const geminiData = await res.json()
        const rawText = geminiData.candidates[0].content.parts[0].text.trim()
        // Strip markdown code fences if present (```json ... ```)
        const jsonStr = rawText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
        const result = JSON.parse(jsonStr)

        // 5. Update Database
        const scoresMap = {}
        result.breakdown.forEach(item => {
            scoresMap[item.criterion_id] = { score: item.score, explanation: item.explanation }
        })

        const { error: updateError } = await supabase
            .from('applications')
            .update({
                overall_ai_score: result.overall_score,
                ai_explanation: result.reasoning_summary,
                scores: scoresMap,
                status: 'scored'
            })
            .eq('id', application_id)

        if (updateError) throw new Error(`Database update failed: ${updateError.message}`)

        // 6. Trigger Slack Notification
        try {
            await fetch(`${supabaseUrl}/functions/v1/notify-slack`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${supabaseServiceKey}`
                },
                body: JSON.stringify({
                    message: `AI Scoring complete for an application to *${program.name}*. \n*Overall Score: ${result.overall_score}* \nSummary: ${result.reasoning_summary}`,
                    programName: program.name,
                    applicationId: application_id,
                    programId: program_id,
                    emoji: '🤖'
                })
            })
        } catch (slackErr) {
            console.error(`[AI-Scorer] Slack notification failed: ${slackErr.message}`)
            // Don't fail the whole process if Slack fails
        }

        console.log(`[AI-Scorer] Success for ${application_id}`)
        return new Response(JSON.stringify({ success: true, score: result.overall_score }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
        })

    } catch (err) {
        console.error(`[AI-Scorer CRASH]: ${err.message}`)
        return new Response(JSON.stringify({ success: false, error: err.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200 // Return 200 to ensure we can see the error in the app console
        })
    }
})
