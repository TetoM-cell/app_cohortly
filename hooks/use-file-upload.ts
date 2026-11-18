import { useState, useRef, useCallback } from "react"

export interface FileMetadata {
  id: string
  name: string
  size: number
  type: string
  url?: string
}

export interface FileWithPreview {
  id: string
  file: File
  preview?: string
}

export interface UseFileUploadOptions {
  maxFiles?: number
  maxSize?: number
  accept?: string
  multiple?: boolean
  initialFiles?: FileMetadata[]
  onFilesChange?: (files: FileWithPreview[]) => void
}

export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return "0 Bytes"
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}

export function useFileUpload({
  maxFiles = 1,
  maxSize = 10 * 1024 * 1024,
  accept = "*",
  multiple = false,
  initialFiles = [],
  onFilesChange,
}: UseFileUploadOptions = {}) {
  const [isDragging, setIsDragging] = useState(false)
  const [errors, setErrors] = useState<string[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  const [files, setFiles] = useState<FileWithPreview[]>(() => {
    return initialFiles.map((item) => ({
      id: item.id,
      file: new File([], item.name, { type: item.type }),
      preview: item.url,
    }))
  })

  const validateFile = useCallback(
    (file: File): string | null => {
      if (maxSize && file.size > maxSize) {
        return `File "${file.name}" exceeds the maximum size of ${formatBytes(maxSize)}.`
      }

      if (accept && accept !== "*") {
        const acceptedTypes = accept.split(",").map((t) => t.trim().toLowerCase())
        const fileType = file.type.toLowerCase()
        const fileName = file.name.toLowerCase()

        const isAccepted = acceptedTypes.some((type) => {
          if (type.startsWith(".")) {
            return fileName.endsWith(type)
          }
          if (type.endsWith("/*")) {
            const prefix = type.slice(0, -2)
            return fileType.startsWith(prefix)
          }
          return fileType === type
        })

        if (!isAccepted) {
          return `File "${file.name}" has an invalid type.`
        }
      }

      return null
    },
    [maxSize, accept]
  )

  const processFiles = useCallback(
    (newIncomingFiles: File[]) => {
      const newErrors: string[] = []
      const validFiles: FileWithPreview[] = []

      if (!multiple) {
        newIncomingFiles = [newIncomingFiles[0]]
      } else {
        const totalAllowed = maxFiles - files.length
        if (newIncomingFiles.length > totalAllowed) {
          newErrors.push(`You can only upload up to ${maxFiles} file(s).`)
          newIncomingFiles = newIncomingFiles.slice(0, totalAllowed)
        }
      }

      newIncomingFiles.forEach((file) => {
        const error = validateFile(file)
        if (error) {
          newErrors.push(error)
        } else {
          const preview = file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined
          validFiles.push({
            id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            file,
            preview,
          })
        }
      })

      setErrors(newErrors)

      if (validFiles.length > 0) {
        setFiles((prev) => {
          if (!multiple) {
            prev.forEach((f) => {
              if (f.preview && f.preview.startsWith("blob:")) {
                URL.revokeObjectURL(f.preview)
              }
            })
            onFilesChange?.(validFiles)
            return validFiles
          }
          const updated = [...prev, ...validFiles]
          onFilesChange?.(updated)
          return updated
        })
      }
    },
    [files.length, maxFiles, multiple, onFilesChange, validateFile]
  )

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)

      const droppedFiles = Array.from(e.dataTransfer.files)
      if (droppedFiles.length > 0) {
        processFiles(droppedFiles)
      }
    },
    [processFiles]
  )

  const removeFile = useCallback(
    (fileId: string) => {
      setFiles((prev) => {
        const found = prev.find((f) => f.id === fileId)
        if (found?.preview && found.preview.startsWith("blob:")) {
          URL.revokeObjectURL(found.preview)
        }
        const updated = prev.filter((f) => f.id !== fileId)
        onFilesChange?.(updated)
        return updated
      })
    },
    [onFilesChange]
  )

  const clearFiles = useCallback(() => {
    files.forEach((f) => {
      if (f.preview && f.preview.startsWith("blob:")) {
        URL.revokeObjectURL(f.preview)
      }
    })
    setFiles([])
    setErrors([])
    onFilesChange?.([])
  }, [files, onFilesChange])

  const openFileDialog = useCallback(() => {
    inputRef.current?.click()
  }, [])

  const getInputProps = useCallback(
    () => ({
      ref: inputRef,
      type: "file" as const,
      accept,
      multiple,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
          processFiles(Array.from(e.target.files))
          e.target.value = ""
        }
      },
    }),
    [accept, multiple, processFiles]
  )

  return [
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
  ] as const
}
