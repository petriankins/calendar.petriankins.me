import React, { useEffect, useRef, useState } from "react"
import { applyColorToDate, ColorTextureCode, DateCellData } from "../utils/colors"

const DIRECTION_THRESHOLD = 8

export function useDragToColor(
  dateCells: Map<string, DateCellData>,
  setDateCells: (cells: Map<string, DateCellData>) => void,
  selectedColorTexture: ColorTextureCode,
) {
  const [isDragging, setIsDragging] = useState(false)

  // Refs for latest values in event handlers (avoid stale closures)
  const dateCellsRef = useRef(dateCells)
  dateCellsRef.current = dateCells
  const colorTextureRef = useRef(selectedColorTexture)
  colorTextureRef.current = selectedColorTexture
  const setDateCellsRef = useRef(setDateCells)
  setDateCellsRef.current = setDateCells
  const isDraggingRef = useRef(false)

  // Pending touch: we know the start position and date, but haven't decided scroll vs drag yet
  const touchStartRef = useRef<{ x: number; y: number; date: Date } | null>(null)

  const handleMouseDown = (date: Date, e: React.PointerEvent) => {
    if (e.pointerType === "touch") {
      touchStartRef.current = { x: e.clientX, y: e.clientY, date }
    } else {
      isDraggingRef.current = true
      setIsDragging(true)
      applyColorToDate(date, dateCellsRef.current, colorTextureRef.current, setDateCellsRef.current)
    }
  }

  // Used by mouse onPointerEnter — touch drag uses elementFromPoint in pointermove instead
  const handleMouseEnter = (date: Date) => {
    if (isDragging && !touchStartRef.current) {
      applyColorToDate(date, dateCellsRef.current, colorTextureRef.current, setDateCellsRef.current)
    }
  }

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (e.pointerType !== "touch") return

      // Determine scroll vs drag intent
      if (touchStartRef.current) {
        const dx = e.clientX - touchStartRef.current.x
        const dy = e.clientY - touchStartRef.current.y
        const absDx = Math.abs(dx)
        const absDy = Math.abs(dy)

        if (absDx < DIRECTION_THRESHOLD && absDy < DIRECTION_THRESHOLD) return

        if (absDy >= absDx) {
          // Vertical movement → scroll intent, cancel drag
          touchStartRef.current = null
          return
        }

        // Horizontal movement → drag-to-color intent
        isDraggingRef.current = true
        setIsDragging(true)
        applyColorToDate(touchStartRef.current.date, dateCellsRef.current, colorTextureRef.current, setDateCellsRef.current)
        touchStartRef.current = null
      }

      // Color the cell currently under the touch point
      if (isDraggingRef.current) {
        e.preventDefault()
        const el = document.elementFromPoint(e.clientX, e.clientY)
        const dayEl = el?.closest("[data-date]")
        if (dayEl) {
          const dateStr = dayEl.getAttribute("data-date")!
          const [year, month, day] = dateStr.split("-").map(Number)
          applyColorToDate(new Date(year, month, day), dateCellsRef.current, colorTextureRef.current, setDateCellsRef.current)
        }
      }
    }

    const handlePointerUp = (e: PointerEvent) => {
      if (e.pointerType === "touch" && touchStartRef.current) {
        // Touch released without drag → tap, color single cell
        applyColorToDate(touchStartRef.current.date, dateCellsRef.current, colorTextureRef.current, setDateCellsRef.current)
        touchStartRef.current = null
      }
      isDraggingRef.current = false
      setIsDragging(false)
    }

    document.addEventListener("pointermove", handlePointerMove, { passive: false })
    document.addEventListener("pointerup", handlePointerUp)
    document.addEventListener("pointercancel", handlePointerUp)
    return () => {
      document.removeEventListener("pointermove", handlePointerMove)
      document.removeEventListener("pointerup", handlePointerUp)
      document.removeEventListener("pointercancel", handlePointerUp)
    }
  }, [])

  return { isDragging, handleMouseDown, handleMouseEnter }
}
