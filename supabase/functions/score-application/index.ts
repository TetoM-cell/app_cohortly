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
        const geminiApiKey = Deno.env.get('GEMINI_API_KEY')

        if (!geminiApiKey) throw new Error('GEMINI_API_KEY secret is missing in Supabase')

        const supabase = createClient(supabaseUrl, supabaseServiceKey)

        // 1. Fetch Program and its Rubric (Fix: Rubric is likely in its own table)
        const { data: program, error: programError } = await supabase
            .from('programs')
            .select('name, type')
            .eq('id', program_id)
            .single()

        if (programError || !program) throw new Error('Program not found')

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
