"use client"

import { useEffect, useRef, useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

export type Reviewer = {
    id: string
    full_name: string
    avatar_url: string
    email: string
}

interface MentionDropdownProps {
    reviewers: Reviewer[]
    isOpen: boolean
    onSelect: (reviewer: Reviewer) => void
    onClose: () => void
    searchText?: string
}

export function MentionDropdown({
    reviewers,
    isOpen,
    onSelect,
    onClose,
    searchText = "",
}: MentionDropdownProps) {
    const [selectedIndex, setSelectedIndex] = useState(0)
    const dropdownRef = useRef<HTMLDivElement>(null)

    // Filter reviewers based on search text
    const filteredReviewers = reviewers.filter((reviewer) => {
        const fullName = reviewer.full_name || ""
        return fullName.toLowerCase().includes(searchText.toLowerCase())
    })

    // Reset selected index when filtered list changes
    useEffect(() => {
        setSelectedIndex(0)
    }, [searchText])

    // Handle keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen) return

            switch (e.key) {
                case "ArrowDown":
                    e.preventDefault()
                    setSelectedIndex((prev) =>
                        prev < filteredReviewers.length - 1 ? prev + 1 : prev
                    )
                    break
                case "ArrowUp":
                    e.preventDefault()
                    setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev))
                    break
                case "Enter":
                    e.preventDefault()
                    if (filteredReviewers[selectedIndex]) {
                        onSelect(filteredReviewers[selectedIndex])
                    }
                    break
                case "Escape":
                    e.preventDefault()
                    onClose()
                    break
            }
        }

        document.addEventListener("keydown", handleKeyDown)
        return () => document.removeEventListener("keydown", handleKeyDown)
    }, [isOpen, selectedIndex, filteredReviewers, onSelect, onClose])

    // Scroll selected item into view
    useEffect(() => {
        if (dropdownRef.current) {
            const selectedElement = dropdownRef.current.children[
                selectedIndex
            ] as HTMLElement
            if (selectedElement) {
                selectedElement.scrollIntoView({
                    block: "nearest",
                    behavior: "smooth",
                })
            }
        }
    }, [selectedIndex])

    if (!isOpen || filteredReviewers.length === 0) return null

    return (
        <div
            ref={dropdownRef}
            className="absolute bottom-full left-0 mb-2 w-full max-w-xs bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden z-50 max-h-60 overflow-y-auto"
        >
            <div className="p-2 border-b border-gray-100 bg-gray-50">
                <p className="text-xs text-gray-500 font-medium">Mention a reviewer</p>
            </div>
            <div className="py-1">
                {filteredReviewers.map((reviewer, index) => (
                    <button
                        key={reviewer.id}
                        type="button"
                        onClick={() => onSelect(reviewer)}
                        className={cn(
                            "w-full flex items-center gap-3 px-3 py-2 text-left transition-colors",
                            index === selectedIndex
                                ? "bg-blue-50 text-blue-900"
                                : "hover:bg-gray-50 text-gray-900"
                        )}
                    >
                        <Avatar className="w-8 h-8 border border-gray-100">
                            <AvatarImage src={reviewer.avatar_url} />
                            <AvatarFallback className="bg-gray-100 text-gray-600 text-xs">
                                {reviewer.full_name?.charAt(0) || "U"}
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                                {reviewer.full_name}
                            </p>
                            <p className="text-xs text-gray-500 truncate">{reviewer.email}</p>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    )
}
