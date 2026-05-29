import React, { useState, useRef, useEffect } from "react"
import { useCalendar } from "../contexts/CalendarContext"
import { useGoogleDrive } from "../contexts/GoogleDriveContext"

export const FloatingSyncBar: React.FC = () => {
  const { syncStatus, userProfile, logout } = useGoogleDrive()
  const {
    dateCells,
    setDateCells,
    selectedYear,
    setSelectedYear,
    selectedColorTexture,
    setSelectedColorTexture,
    selectedView,
    setSelectedView,
  } = useCalendar()

  const [isOpen, setIsOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Sync state styling helper
  const getSyncConfig = () => {
    switch (syncStatus) {
      case "synced":
        return { color: "oklch(0.65 0.15 140)", text: "Synced", bg: "rgba(16, 185, 129, 0.08)", pulse: false }
      case "syncing":
        return { color: "oklch(0.55 0.18 240)", text: "Syncing...", bg: "rgba(99, 102, 241, 0.08)", pulse: true }
      case "error":
        return { color: "oklch(0.6 0.2 25)", text: "Sync Error", bg: "rgba(239, 68, 68, 0.08)", pulse: true }
      default:
        return { color: "oklch(0.6 0 0)", text: "Local Only", bg: "rgba(107, 114, 128, 0.08)", pulse: false }
    }
  }

  const syncConfig = getSyncConfig()

  // Manual actions
  const handleSaveJSON = () => {
    const dataToSave = {
      selectedYear,
      dateCells: Object.fromEntries(dateCells),
      selectedColorTexture,
      selectedView,
      exportDate: new Date().toISOString(),
      version: "2.0",
    }

    const blob = new Blob([JSON.stringify(dataToSave, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `year-planner-backup-${selectedYear}-${new Date().toISOString().split("T")[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    setIsOpen(false)
  }

  const handleLoadJSON = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const loadedData = JSON.parse(e.target?.result as string)
        if (!loadedData || typeof loadedData !== "object") {
          alert("Invalid data file format")
          return
        }

        if (loadedData.dateCells && typeof loadedData.dateCells === "object") {
          const newDateCells = new Map(dateCells)
          Object.entries(loadedData.dateCells).forEach(([dateKey, cellData]) => {
            newDateCells.set(dateKey, cellData as any)
          })
          setDateCells(newDateCells)
        }

        if (loadedData.selectedYear) setSelectedYear(loadedData.selectedYear)
        if (loadedData.selectedColorTexture) setSelectedColorTexture(loadedData.selectedColorTexture)
        if (loadedData.selectedView) setSelectedView(loadedData.selectedView)

        alert("Data merged and synced successfully!")
      } catch (error) {
        alert("Error loading data: Invalid JSON format")
      }
    }
    reader.readAsText(file)
    event.target.value = ""
    setIsOpen(false)
  }

  const handleClearAll = () => {
    if (window.confirm("Are you sure you want to delete all local & cloud data? This cannot be undone.")) {
      setDateCells(new Map())
      setSelectedYear(new Date().getFullYear())
      setSelectedColorTexture("red")
      setSelectedView("Linear")
      localStorage.removeItem("calendar_data")
      setIsOpen(false)
    }
  }

  return (
    <div style={barContainerStyle} className="no-print" ref={dropdownRef}>
      <style>{pulseStyleSheet}</style>
      <div 
        style={{
          ...pillStyle,
          borderColor: isOpen ? "oklch(0.55 0.18 240)" : "rgba(226, 232, 240, 0.8)",
          background: isOpen ? "#ffffff" : "rgba(255, 255, 255, 0.85)"
        }} 
        onClick={() => setIsOpen(!isOpen)}
      >
        <span 
          style={{
            ...dotStyle(syncConfig.color),
            animation: syncConfig.pulse ? "pulse-dot 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite" : "none"
          }} 
        />
        <span style={statusTextStyle}>{syncConfig.text}</span>
        {userProfile && (
          <span style={userTextStyle}>
            {userProfile.displayName || userProfile.emailAddress}
          </span>
        )}
        <svg 
          width="12" 
          height="12" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="#64748b" 
          strokeWidth="2.5" 
          strokeLinecap="round" 
          strokeLinejoin="round"
          style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.25s ease" }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>

      {isOpen && (
        <div style={dropdownStyle}>
          <div style={headerStyle}>Cloud Settings</div>
          
          <button 
            style={actionButtonStyle} 
            onClick={handleLoadJSON}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "rgba(0,0,0,0.04)"}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
          >
            📂 Import JSON Backup
          </button>
          
          <button 
            style={actionButtonStyle} 
            onClick={handleSaveJSON}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "rgba(0,0,0,0.04)"}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
          >
            💾 Export JSON Backup
          </button>

          <div style={dividerStyle} />

          <button 
            style={{ ...actionButtonStyle, color: "oklch(0.6 0.2 25)" }} 
            onClick={handleClearAll}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "rgba(239, 68, 68, 0.05)"}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
          >
            🗑️ Wipe All Data
          </button>

          <button 
            style={{ ...actionButtonStyle, borderTop: "1px solid oklch(0.85 0.005 240)", marginTop: "4px", borderRadius: "0 0 8px 8px" }} 
            onClick={logout}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "rgba(0,0,0,0.04)"}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
          >
            🚪 Sign Out of Google
          </button>
        </div>
      )}

      <input ref={fileInputRef} type="file" accept=".json" onChange={handleFileChange} style={{ display: "none" }} />
    </div>
  )
}

const pulseStyleSheet = `
  @keyframes pulse-dot {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.4; transform: scale(1.15); }
  }
`

const barContainerStyle: React.CSSProperties = {
  position: "fixed",
  top: "16px",
  right: "16px",
  zIndex: 1000,
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-end",
  gap: "8px",
}

const pillStyle: React.CSSProperties = {
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
  border: "1px solid rgba(226, 232, 240, 0.8)",
  borderRadius: "9999px",
  padding: "8px 16px",
  display: "flex",
  alignItems: "center",
  gap: "10px",
  boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05)",
  cursor: "pointer",
  transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
  userSelect: "none",
}

const dotStyle = (color: string): React.CSSProperties => ({
  width: "8px",
  height: "8px",
  borderRadius: "50%",
  backgroundColor: color,
  boxShadow: `0 0 8px ${color}`,
  display: "inline-block",
})

const statusTextStyle: React.CSSProperties = {
  fontSize: "13px",
  fontWeight: 600,
  color: "oklch(0.25 0.02 240)",
}

const userTextStyle: React.CSSProperties = {
  fontSize: "12px",
  color: "oklch(0.45 0.015 240)",
  borderLeft: "1px solid oklch(0.85 0.005 240)",
  paddingLeft: "10px",
}

const dropdownStyle: React.CSSProperties = {
  background: "#ffffff",
  border: "1px solid oklch(0.85 0.005 240)",
  borderRadius: "16px",
  padding: "8px",
  width: "240px",
  boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
  display: "flex",
  flexDirection: "column",
  gap: "2px",
  marginTop: "4px",
}

const headerStyle: React.CSSProperties = {
  padding: "8px 12px",
  fontSize: "11px",
  fontWeight: 700,
  color: "oklch(0.45 0.015 240)",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
}

const dividerStyle: React.CSSProperties = {
  height: "1px",
  backgroundColor: "oklch(0.85 0.005 240)",
  margin: "4px 0",
}

const actionButtonStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  width: "100%",
  padding: "8px 12px",
  fontSize: "13px",
  fontWeight: 500,
  color: "oklch(0.25 0.02 240)",
  background: "transparent",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",
  textAlign: "left",
  transition: "all 0.15s ease",
}
