"use client"

import { useEffect, useRef, type ComponentProps } from "react"
import { Frame } from "@/components/reui/frame"
import {
  Stepper,
  StepperIndicator,
  StepperItem,
  StepperNav,
  StepperTitle,
  StepperTrigger,
} from "@/components/reui/stepper"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { Check, CircleDashed, Loader2 } from "lucide-react"

export interface WizardStep {
  id: number
  title: string
  shortTitle?: string
}

interface WizardStepperProps {
  currentStep: number
  steps: WizardStep[]
  onStepClick?: (step: number) => void
  className?: string
}

const indicators = {
  completed: (
    <Check className="size-3.5" aria-hidden="true" />
  ),
  inactive: (
    <CircleDashed className="size-3.5" aria-hidden="true" />
  ),
  loading: (
    <Loader2 className="size-3.5 motion-safe:animate-spin" aria-hidden="true" />
  ),
}

function Chevron({ className, ...props }: ComponentProps<"span">) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "absolute -z-10 [--a:calc(var(--arrow)*var(--stretch,1))] [--n:calc(var(--notch)*var(--stretch,1))] [clip-path:polygon(calc(var(--n)*0.28)_0,calc(100%_-_var(--a)*1.268)_0,calc(100%_-_var(--a)*1.032)_calc(var(--a)*0.059),calc(100%_-_var(--a)*0.852)_calc(var(--a)*0.223),calc(100%_-_var(--a)*0.185)_calc(50%_-_var(--a)*0.277),calc(100%_-_var(--a)*0.101)_50%,calc(100%_-_var(--a)*0.185)_calc(50%_+_var(--a)*0.277),calc(100%_-_var(--a)*0.852)_calc(100%_-_var(--a)*0.223),calc(100%_-_var(--a)*1.032)_calc(100%_-_var(--a)*0.059),calc(100%_-_var(--a)*1.268)_100%,calc(var(--n)*0.28)_100%,calc(var(--n)*0.148)_calc(100%_-_var(--n)*0.079),calc(var(--n)*0.155)_calc(100%_-_var(--n)*0.233),calc(var(--n)*0.815)_calc(50%_+_var(--n)*0.277),calc(var(--n)*0.899)_50%,calc(var(--n)*0.815)_calc(50%_-_var(--n)*0.277),calc(var(--n)*0.155)_calc(var(--n)*0.233),calc(var(--n)*0.148)_calc(var(--n)*0.079))] rtl:-scale-x-100",
        className
      )}
      {...props}
    />
  )
}

const edges = {
  notch:
    "M12 0H2.24C1.28 0 .71 1.07 1.24 1.87L6.52 9.78C7.42 11.12 7.42 12.88 6.52 14.22L1.24 22.13C.71 22.93 1.28 24 2.24 24H12",
  arrow:
    "M0 0H1.86C3.2 0 4.45.67 5.19 1.78L10.52 9.78C11.42 11.12 11.42 12.88 10.52 14.22L5.19 22.22C4.45 23.33 3.2 24 1.86 24H0",
}

function Edge({
  side,
  className,
}: {
  side: keyof typeof edges
  className: string
}) {
  return (
    <svg
      viewBox="0 0 12 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      className={cn(
        "absolute -top-px h-[calc(100%+2px)] w-3 overflow-visible",
        className
      )}
    >
      <path d={edges[side]} />
    </svg>
  )
}

export function WizardStepper({
  currentStep,
  steps,
  onStepClick,
  className,
}: WizardStepperProps) {
  const rowRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const row = rowRef.current
    if (!row) return
    const reveal = (tab: Element | null) => {
      if (!tab) return
      const box = row.getBoundingClientRect()
      const { left, right } = tab.getBoundingClientRect()
      if (left < box.left || right > box.right) {
        row.scrollLeft += (left + right - box.left - box.right) / 2
      }
    }
    const onFocus = (event: FocusEvent) =>
      reveal((event.target as Element).closest('[role="tab"]'))
    const observer = new ResizeObserver(() =>
      reveal(row.querySelector('[aria-selected="true"]'))
    )
    observer.observe(row)
    row.addEventListener("focusin", onFocus)
    return () => {
      observer.disconnect()
      row.removeEventListener("focusin", onFocus)
    }
  }, [currentStep])

  return (
    <TooltipProvider delayDuration={150}>
      <Stepper
        value={currentStep}
        onValueChange={(val) => onStepClick?.(val)}
        indicators={indicators}
        className={cn("flex items-center", className)}
        aria-label="Cohort creation progress"
      >
        <Frame
          ref={rowRef}
          variant="inverse"
          className="border-input/50 relative w-fit flex-row items-center overflow-hidden rounded-[min(var(--frame-radius),var(--radius-sm))] p-0.5 [--frame-gap:2px] [--frame-panel-radius:min(var(--frame-radius),var(--radius-sm)_-_2px)]"
        >
          <span className="bg-input/60 text-muted-foreground flex shrink-0 items-center rounded-[var(--frame-panel-radius)] px-2 h-7 text-xs font-semibold whitespace-nowrap uppercase tracking-wider tabular-nums">
            Step {currentStep}/{steps.length}
          </span>

          <StepperNav className="flex items-center gap-0.5 min-w-0">
            {steps.map((item) => {
              const step = item.id
              const isClickable = Boolean(onStepClick && step <= currentStep)
              const isCurrent = step === currentStep

              const triggerButton = (
                <StepperTrigger
                  className={cn(
                    "text-muted-foreground relative isolate h-7 gap-1.5 [--arrow:8px] [--notch:8px] group-first/step:[--notch:0px] group-last/step:[--arrow:0px] focus-visible:ring-0 text-xs transition-colors items-center justify-center flex",
                    isCurrent
                      ? "flex-1 px-3 ps-2.5 pe-4 data-[state=active]:text-foreground data-[state=active]:font-semibold"
                      : "w-9 flex-none px-0 justify-center group-first/step:pe-2 group-first/step:ps-0 group-not-first/step:ps-2 group-not-first/step:pe-0 group-last/step:pe-0 group-last/step:ps-2",
                    "data-[state=completed]:text-[var(--wizard-completed-text)] data-[state=active]:text-[var(--wizard-active-text)]",
                    !isClickable && "cursor-default"
                  )}
                  onClick={(e) => {
                    if (!isClickable) {
                      e.preventDefault()
                      return
                    }
                    onStepClick?.(step)
                  }}
                >
                  <Chevron className="bg-ring/50 -inset-y-0.5 -start-[calc(var(--notch)*var(--stretch)+2px)] -end-0.5 hidden [--stretch:7/6] group-first/step:rounded-l-[calc(var(--frame-panel-radius)+2px)] group-last/step:rounded-r-[calc(var(--frame-panel-radius)+2px)] in-focus-visible:block" />

                  <Chevron className="bg-background after:bg-input/40 group-data-[state=completed]/step:after:bg-[var(--wizard-completed-background)] inset-y-0 -start-[var(--notch)] end-0 group-first/step:rounded-l-[var(--frame-panel-radius)] group-last/step:rounded-r-[var(--frame-panel-radius)] after:absolute after:inset-0 after:rounded-[inherit] group-data-[state=active]/step:after:bg-[var(--wizard-active-background)] transition-colors">
                    <span className="absolute inset-0 rounded-[inherit] border-y border-current opacity-0 group-first/step:border-l group-last/step:border-r group-data-[state=active]/step:text-[var(--wizard-active-border)] group-data-[state=active]/step:opacity-100 group-data-[state=completed]/step:text-[var(--wizard-completed-border)] group-data-[state=completed]/step:opacity-100">
                      <Edge
                        side="notch"
                        className="left-0 group-first/step:hidden"
                      />
                      <Edge
                        side="arrow"
                        className="right-0 group-last/step:hidden"
                      />
                    </span>
                  </Chevron>

                  <StepperIndicator className="size-3.5 bg-transparent text-current data-[state=active]:bg-transparent data-[state=active]:text-current data-[state=completed]:bg-transparent data-[state=completed]:text-current shrink-0" />

                  {isCurrent && (
                    <StepperTitle className="whitespace-nowrap font-medium text-xs">
                      {item.title}
                    </StepperTitle>
                  )}

                  <span className="sr-only">
                    {item.title}
                    {step < currentStep && ", completed"}
                  </span>
                </StepperTrigger>
              )

              return (
                <StepperItem
                  key={item.id}
                  step={step}
                  loading
                  className={cn(
                    "transition-all duration-150",
                    isCurrent ? "flex-1 min-w-fit" : "flex-none"
                  )}
                >
                  {!isCurrent ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        {triggerButton}
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        {item.title}
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    triggerButton
                  )}
                </StepperItem>
              )
            })}
          </StepperNav>
        </Frame>
      </Stepper>
    </TooltipProvider>
  )
}
