"use client"

import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"
import { cn } from "@/lib/utils"

interface DualRangeSliderProps extends React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root> {
    labelPosition?: "top" | "bottom"
    label?: (value: number | undefined) => string
}

const DualRangeSlider = React.forwardRef<
    React.ElementRef<typeof SliderPrimitive.Root>,
    DualRangeSliderProps
>(({ className, label, labelPosition = "top", ...props }, ref) => {
    const initialValue = Array.isArray(props.value) ? props.value : props.defaultValue
    const [localValues, setLocalValues] = React.useState(initialValue)

    React.useEffect(() => {
        setLocalValues(Array.isArray(props.value) ? props.value : initialValue)
    }, [props.value, initialValue])

    return (
        <SliderPrimitive.Root
            ref={ref}
            className={cn(
                "relative flex w-full touch-none select-none items-center",
                className
            )}
            {...props}
            onValueChange={(value) => {
                setLocalValues(value)
                props.onValueChange?.(value)
            }}
        >
            <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-gray-100">
                <SliderPrimitive.Range className="absolute h-full bg-blue-500" />
            </SliderPrimitive.Track>
            {localValues?.map((value, index) => (
                <React.Fragment key={index}>
                    <SliderPrimitive.Thumb
                        className="block h-4 w-4 rounded-full border border-blue-500 bg-white shadow transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 disabled:pointer-events-none disabled:opacity-50"
                    >
                        {label && (
                            <span
                                className={cn(
                                    "absolute flex w-full justify-center text-xs font-medium text-gray-700",
                                    labelPosition === "top" && "-top-7",
                                    labelPosition === "bottom" && "top-4"
                                )}
                            >
                                {label(value)}
                            </span>
                        )}
                    </SliderPrimitive.Thumb>
                </React.Fragment>
            ))}
        </SliderPrimitive.Root>
    )
})

DualRangeSlider.displayName = "DualRangeSlider"

export { DualRangeSlider }
