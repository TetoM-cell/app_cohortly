"use client"

import { useEffect, useState } from "react"
import {
  formatBytes,
  useFileUpload,
  type FileMetadata,
  type FileWithPreview,
} from "@/hooks/use-file-upload"
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "@/components/reui/alert"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
  CircleAlertIcon,
  FileArchiveIcon,
  FileSpreadsheetIcon,
  FileTextIcon,
  HeadphonesIcon,
  ImageIcon,
  RefreshCwIcon,
  UploadIcon,
  VideoIcon,
  XIcon,
} from "lucide-react"

interface FileUploadItem extends FileWithPreview {
  progress: number
  status: "uploading" | "completed" | "error"
  error?: string
}

interface ProgressUploadProps {
  maxFiles?: number
  maxSize?: number
  accept?: string
  multiple?: boolean
  className?: string
  onFilesChange?: (files: FileWithPreview[]) => void
  simulateUpload?: boolean
}

export function Pattern({
  maxFiles = 1,
  maxSize = 10 * 1024 * 1024, // 10MB
  accept = "image/*",
  multiple = false,
  className,
  onFilesChange,
  simulateUpload = true,
}: ProgressUploadProps) {
  const [uploadFiles, setUploadFiles] = useState<FileUploadItem[]>([])

  const [
    { isDragging, errors },
    {
      removeFile,
      clearFiles,
      handleDragEnter,
      handleDragLeave,
      handleDragOver,
      handleDrop,
      openFileDialog,
      getInputProps,
    },
  ] = useFileUpload({
    maxFiles,
    maxSize,
    accept,
    multiple,
    initialFiles: [],
    onFilesChange: (newFiles) => {
      const newUploadFiles = newFiles.map((file) => {
        const existingFile = uploadFiles.find(
          (existing) => existing.id === file.id
        )

        if (existingFile) {
          return {
            ...existingFile,
            ...file,
          }
        } else {
          return {
            ...file,
            progress: 0,
            status: "uploading" as const,
          }
        }
      })
      setUploadFiles(newUploadFiles)
      onFilesChange?.(newFiles)
    },
  })

  // Simulate upload progress
  useEffect(() => {
    if (!simulateUpload) return

    const interval = setInterval(() => {
      setUploadFiles((prev) =>
        prev.map((file) => {
          if (file.status !== "uploading") return file

          const increment = Math.random() * 20 + 10
          const newProgress = Math.min(file.progress + increment, 100)

          if (newProgress >= 100) {
            return {
              ...file,
              progress: 100,
              status: "completed" as const,
            }
          }

          return {
            ...file,
            progress: newProgress,
          }
        })
      )
    }, 400)

    return () => clearInterval(interval)
  }, [simulateUpload])

  const retryUpload = (fileId: string) => {
    setUploadFiles((prev) =>
      prev.map((file) =>
        file.id === fileId
          ? {
              ...file,
              progress: 0,
              status: "uploading" as const,
              error: undefined,
            }
          : file
      )
    )
  }

  const removeUploadFile = (fileId: string) => {
    setUploadFiles((prev) => prev.filter((file) => file.id !== fileId))
    removeFile(fileId)
  }

  const getFileIcon = (file: File | FileMetadata) => {
    const type = file.type || ""
    if (type.startsWith("image/")) return <ImageIcon className="size-4" />
    if (type.startsWith("video/")) return <VideoIcon className="size-4" />
    if (type.startsWith("audio/")) return <HeadphonesIcon className="size-4" />
    if (type.includes("pdf")) return <FileTextIcon className="size-4" />
    if (type.includes("word") || type.includes("doc"))
      return <FileTextIcon className="size-4" />
    if (type.includes("excel") || type.includes("sheet"))
      return <FileSpreadsheetIcon className="size-4" />
    if (type.includes("zip") || type.includes("rar"))
      return <FileArchiveIcon className="size-4" />
    return <FileTextIcon className="size-4" />
  }

  return (
    <div className={cn("w-full", className)}>
      {/* Upload Area */}
      <div
        className={cn(
          "rounded-lg relative border border-dashed p-8 text-center transition-colors",
          isDragging
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-muted-foreground/50"
        )}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <input {...getInputProps()} className="sr-only" />

        <div className="flex flex-col items-center gap-4">
          <div
            className={cn(
              "flex h-16 w-16 items-center justify-center rounded-full",
              isDragging ? "bg-primary/10" : "bg-muted"
            )}
          >
            <UploadIcon
              className={cn(
                "h-6 w-6",
                isDragging ? "text-primary" : "text-muted-foreground"
              )}
            />
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Upload your logo</h3>
            <p className="text-muted-foreground text-sm">
              Drag and drop an image here or click to browse
            </p>
            <p className="text-muted-foreground text-xs">
              SVG, PNG, JPG up to {formatBytes(maxSize)}
            </p>
          </div>

          <Button type="button" onClick={openFileDialog}>
            <UploadIcon className="h-4 w-4 mr-2" />
            Select image
          </Button>
        </div>
      </div>

      {/* File List - shown only when a file has been uploaded */}
      {uploadFiles.length > 0 && (
        <div className="mt-4 space-y-3">
          {uploadFiles.map((fileItem: FileUploadItem) => (
            <div
              key={fileItem.id}
              className="border-border bg-card rounded-lg border p-2.5"
            >
              <div className="flex items-start gap-2.5">
                {/* File Icon / Image Preview */}
                <div className="shrink-0">
                  {fileItem.preview &&
                  (fileItem.file.type.startsWith("image/") || fileItem.file.type === "") ? (
                    <img
                      src={fileItem.preview}
                      alt={fileItem.file.name}
                      className="rounded-lg h-12 w-12 border object-cover"
                    />
                  ) : (
                    <div className="border-border text-muted-foreground rounded-lg flex h-12 w-12 items-center justify-center border">
                      {getFileIcon(fileItem.file)}
                    </div>
                  )}
                </div>

                {/* File Info */}
                <div className="min-w-0 flex-1">
                  <div className="mt-0.5 flex items-center justify-between">
                    <p className="inline-flex flex-col justify-center gap-1 truncate font-medium">
                      <span className="text-sm">{fileItem.file.name}</span>
                      <span className="text-muted-foreground text-xs">
                        {formatBytes(fileItem.file.size)}
                      </span>
                    </p>
                    <div className="flex items-center gap-2">
                      {/* Remove Button */}
                      <Button
                        type="button"
                        onClick={() => removeUploadFile(fileItem.id)}
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground size-6 hover:bg-transparent hover:opacity-100"
                      >
                        <XIcon className="size-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  {fileItem.status === "uploading" && (
                    <div className="mt-2">
                      <Progress value={fileItem.progress} className="h-1" />
                    </div>
                  )}

                  {/* Error Message */}
                  {fileItem.status === "error" && fileItem.error && (
                    <Alert variant="destructive" className="mt-2 px-2 py-1">
                      <CircleAlertIcon className="size-4" />
                      <AlertTitle className="text-xs">
                        {fileItem.error}
                      </AlertTitle>
                      <AlertAction>
                        <Button
                          type="button"
                          onClick={() => retryUpload(fileItem.id)}
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground size-6 hover:bg-transparent hover:opacity-100"
                        >
                          <RefreshCwIcon className="size-3.5" />
                        </Button>
                      </AlertAction>
                    </Alert>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error Messages */}
      {errors.length > 0 && (
        <Alert variant="destructive" className="mt-5">
          <CircleAlertIcon />
          <AlertTitle>File upload error(s)</AlertTitle>
          <AlertDescription>
            {errors.map((error, index) => (
              <p key={index} className="last:mb-0">
                {error}
              </p>
            ))}
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
