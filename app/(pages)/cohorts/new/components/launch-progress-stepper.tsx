"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Stepper,
  StepperIndicator,
  StepperItem,
  StepperNav,
  StepperPanel,
  StepperSeparator,
  StepperTrigger,
} from "@/components/reui/stepper"
import { cn } from "cn"
import { CheckIcon, CircleDashedIcon } from "lucide-react"

const steps = [
  { title: "Cohort basics", description: "Your cohort details are set." },
  { title: "Form built", description: "Your application form is ready." },
  { title: "Criteria established", description: "Your evaluation criteria are defined." },
  { title: "Settings configured", description: "Reviewers and launch settings are configured." },
  { title: "Launched!", description: "Your applications are open to candidates." },
]

function Pending() {
  return (
    <span className="bg-ring/80 flex size-3 items-center justify-center rounded-full text-white">
      <CircleDashedIcon className="size-2" aria-hidden="true" />
    </span>
  )
}

function Current() {
  return (
    <span className="relative flex size-4 items-center justify-center">
      <svg
        viewBox="0 0 16 16"
        fill="none"
        strokeWidth="1"
        aria-hidden="true"
        className="absolute inset-0 size-full"
      >
        <circle
          cx="8"
          cy="8"
          r="7"
          pathLength={44}
          strokeDasharray="3 1"
          className="stroke-ring/50"
        />
        <circle
          cx="8"
          cy="8"
          r="7"
          pathLength={44}
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray="15 29"
          className="stroke-[var(--wizard-completed-text)] origin-center animate-spin"
        />
      </svg>
      <span className="bg-ring/80 size-2.5 rounded-full" />
    </span>
  )
}

const indicators = {
  completed: (
    <span className="bg-[var(--wizard-completed-text)] flex size-3 items-center justify-center rounded-full text-white">
      <CheckIcon className="size-2.5" aria-hidden="true" />
    </span>
  ),
  inactive: <Pending />,
  loading: <Current />,
}

interface LaunchProgressStepperProps {
  completedSteps?: number
  launched?: boolean
}

export function LaunchProgressStepper({
  completedSteps = 4,
  launched = false,
}: LaunchProgressStepperProps) {
  const targetStep = launched
    ? steps.length + 1
    : Math.min(steps.length, Math.max(1, completedSteps + 1))
  const [current, setCurrent] = useState(1)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setCurrent((step) => (step >= targetStep ? 1 : step + 1))
    }, 3000)

    return () => window.clearTimeout(timer)
  }, [current, targetStep])

  const allDone = current > steps.length
  const activeContent = allDone
    ? { title: "Launched!", description: "Your applications are open to candidates." }
    : steps[current - 1]

  return (
    <Stepper
      value={current}
      indicators={indicators}
      className="mx-auto w-full max-w-3xl space-y-2"
      aria-label="Cohort launch progress"
    >
      <StepperNav>
        {steps.map((item, index) => {
          const step = index + 1

          return (
            <StepperItem key={item.title} step={step} loading>
              <StepperTrigger
                aria-label={`Step ${step}: ${item.title}`}
                className="relative after:absolute after:-inset-1"
              >
                <StepperIndicator className="border-ring/80 data-[state=completed]:border-[var(--wizard-completed-border)] size-4 border bg-transparent data-[state=active]:border-0 data-[state=active]:bg-transparent data-[state=completed]:bg-transparent" />
              </StepperTrigger>

              {step < steps.length && (
                <StepperSeparator
                  className={cn(
                    "from-ring/80 to-ring/80 data-[state=completed]:from-[var(--wizard-completed-border)] bg-transparent bg-linear-to-r to-70% mask-[radial-gradient(circle_closest-side,#000_90%,transparent)] mask-size-[0.375rem_0.1875rem] mask-repeat-space group-data-[orientation=horizontal]/stepper-nav:h-0.75 rtl:bg-linear-to-l",
                    step + 1 < current
                      ? "to-[var(--wizard-completed-border)]"
                      : "data-[state=completed]:to-ring"
                  )}
                />
              )}
            </StepperItem>
          )
        })}
      </StepperNav>

      <StepperPanel className="text-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
          >
            <p className="text-xs text-white/60">
              {allDone ? "All 5 steps complete" : `Step ${current} of ${steps.length}`}
            </p>
            <p className="text-sm font-medium text-white">{activeContent.title}</p>
            <p className="text-xs text-white/60">{activeContent.description}</p>
          </motion.div>
        </AnimatePresence>
      </StepperPanel>
    </Stepper>
  )
}
