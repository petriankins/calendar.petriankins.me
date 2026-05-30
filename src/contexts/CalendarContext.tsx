import React, { createContext, useContext, useEffect, useState } from "react"
import { ColorTextureCode, DateCellData } from "../utils/colors"
import { useGoogleDrive } from "./GoogleDriveContext"

type CalendarView = "Linear" | "Classic" | "Column"

interface CalendarContextType {
  selectedYear: number
  setSelectedYear: (year: number) => void
  dateCells: Map<string, DateCellData>
  setDateCells: (dateCells: Map<string, DateCellData>) => void
  selectedColorTexture: ColorTextureCode
  setSelectedColorTexture: (colorTexture: ColorTextureCode) => void
  selectedView: CalendarView
  setSelectedView: (view: CalendarView) => void
  googleDriveFileId: string | null
  setGoogleDriveFileId: (fileId: string | null) => void
}

const CalendarContext = createContext<CalendarContextType | undefined>(undefined)

interface CalendarProviderProps {
  children: React.ReactNode
}

const STORAGE_KEY = "calendar_data"

interface StoredData {
  selectedYear: number
  dateCells: Record<string, DateCellData>
  selectedColorTexture: ColorTextureCode
  selectedView: CalendarView
  googleDriveFileId?: string
  version?: string
}

export const CalendarProvider: React.FC<CalendarProviderProps> = ({ children }) => {
  const currentYear = new Date().getFullYear()

  const [selectedYear, setSelectedYearState] = useState(currentYear)
  const [dateCells, setDateCellsState] = useState<Map<string, DateCellData>>(new Map())
  const [selectedColorTexture, setSelectedColorTextureState] = useState<ColorTextureCode>("red")
  const [selectedView, setSelectedViewState] = useState<CalendarView>("Linear")
  const [googleDriveFileId, setGoogleDriveFileIdState] = useState<string | null>(null)

  const {
    authStatus,
    findFileByName,
    getFileContent,
    createFile,
    updateFile,
    setSyncStatus,
    primaryOwnerEmail,
    isPrimaryOwner,
  } = useGoogleDrive()
  const [isLoadingFromDrive, setIsLoadingFromDrive] = useState(false)

  // 1. Initial Load from LocalStorage
  useEffect(() => {
    try {
      const storedData = localStorage.getItem(STORAGE_KEY)
      if (storedData) {
        const parsedData: StoredData = JSON.parse(storedData)

        if (
          parsedData.selectedYear &&
          parsedData.selectedYear >= currentYear - 1 &&
          parsedData.selectedYear <= currentYear + 5
        ) {
          setSelectedYearState(parsedData.selectedYear)
        }

        if (parsedData.dateCells) {
          const dateCellsMap = new Map(Object.entries(parsedData.dateCells))
          setDateCellsState(dateCellsMap)
        }

        if (parsedData.selectedColorTexture) {
          setSelectedColorTextureState(parsedData.selectedColorTexture)
        }

        if (parsedData.selectedView && ["Linear", "Classic", "Column"].includes(parsedData.selectedView)) {
          setSelectedViewState(parsedData.selectedView)
        }

        if (parsedData.googleDriveFileId) {
          setGoogleDriveFileIdState(parsedData.googleDriveFileId)
        }
      }
    } catch (error) {
      console.error("Error loading calendar data from localStorage:", error)
    }
  }, [currentYear])

  // 2. Drive Synchronization (Load or Create) on Login or Year Change
  useEffect(() => {
    const syncWithDrive = async () => {
      if (authStatus !== "authorized") {
        return
      }

      setIsLoadingFromDrive(true)
      setSyncStatus("syncing")

      const fileName = `year-planner-${selectedYear}.json`
      try {
        let fileId: string | null = null

        if (isPrimaryOwner) {
          fileId = await findFileByName(fileName, primaryOwnerEmail || undefined)
        } else if (primaryOwnerEmail) {
          fileId = await findFileByName(fileName, primaryOwnerEmail)
        } else {
          fileId = await findFileByName(fileName)
        }

        if (fileId) {
          // Load data from existing file
          const loadedData = await getFileContent(fileId)
          
          if (loadedData.dateCells && typeof loadedData.dateCells === "object") {
            const dateCellsMap = new Map<string, DateCellData>(
              Object.entries(loadedData.dateCells) as [string, DateCellData][]
            )
            setDateCellsState(dateCellsMap)
          }
          if (loadedData.selectedColorTexture) {
            setSelectedColorTextureState(loadedData.selectedColorTexture)
          }
          if (loadedData.selectedView) {
            setSelectedViewState(loadedData.selectedView)
          }

          setGoogleDriveFileIdState(fileId)
          
          // Save to local storage as well for fallback offline usage
          localStorage.setItem(STORAGE_KEY, JSON.stringify({
            selectedYear,
            dateCells: loadedData.dateCells || {},
            selectedColorTexture: loadedData.selectedColorTexture || selectedColorTexture,
            selectedView: loadedData.selectedView || selectedView,
            googleDriveFileId: fileId
          }))
          setSyncStatus("synced")
        } else {
          if (isPrimaryOwner) {
            // Create new file with current local state
            const initialData = {
              selectedYear,
              dateCells: Object.fromEntries(dateCells),
              selectedColorTexture,
              selectedView,
              version: "2.0",
              exportDate: new Date().toISOString(),
            }
            const newFileId = await createFile(fileName, initialData)
            setGoogleDriveFileIdState(newFileId)
            
            // Update local storage
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
              selectedYear,
              dateCells: Object.fromEntries(dateCells),
              selectedColorTexture,
              selectedView,
              googleDriveFileId: newFileId
            }))
            setSyncStatus("synced")
          } else {
            setGoogleDriveFileIdState(null)
            setSyncStatus("error")
            console.warn(`Calendar file not shared by primary owner yet: ${primaryOwnerEmail}`)
          }
        }
      } catch (error) {
        console.error("Failed to sync calendar with Google Drive on startup/year-change", error)
        setSyncStatus("error")
      } finally {
        setIsLoadingFromDrive(false)
      }
    }

    syncWithDrive()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedYear, authStatus])

  // 3. Debounced Auto-save to Google Drive
  useEffect(() => {
    if (authStatus !== "authorized" || !googleDriveFileId || isLoadingFromDrive) return

    setSyncStatus("syncing")
    const delayDebounceFn = setTimeout(async () => {
      try {
        const dataToSave = {
          selectedYear,
          dateCells: Object.fromEntries(dateCells),
          selectedColorTexture,
          selectedView,
          googleDriveFileId,
          version: "2.0",
          exportDate: new Date().toISOString(),
        }
        await updateFile(googleDriveFileId, dataToSave)
        setSyncStatus("synced")
      } catch (error) {
        console.error("Auto-save to Google Drive failed", error)
        setSyncStatus("error")
      }
    }, 1500) // 1.5 seconds debounce

    return () => clearTimeout(delayDebounceFn)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateCells, selectedColorTexture, selectedView, googleDriveFileId, authStatus, isLoadingFromDrive])

  const saveToLocalStorage = (data: StoredData) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch (error) {
      console.error("Error saving calendar data to localStorage:", error)
    }
  }

  const setSelectedYear = (year: number) => {
    setSelectedYearState(year)
    saveToLocalStorage({
      selectedYear: year,
      dateCells: Object.fromEntries(dateCells),
      selectedColorTexture,
      selectedView,
      googleDriveFileId: googleDriveFileId || undefined,
    })
  }

  const setDateCells = (newDateCells: Map<string, DateCellData>) => {
    setDateCellsState(newDateCells)
    saveToLocalStorage({
      selectedYear,
      dateCells: Object.fromEntries(newDateCells),
      selectedColorTexture,
      selectedView,
      googleDriveFileId: googleDriveFileId || undefined,
    })
  }

  const setSelectedColorTexture = (colorTexture: ColorTextureCode) => {
    setSelectedColorTextureState(colorTexture)
    saveToLocalStorage({
      selectedYear,
      dateCells: Object.fromEntries(dateCells),
      selectedColorTexture: colorTexture,
      selectedView,
      googleDriveFileId: googleDriveFileId || undefined,
    })
  }

  const setSelectedView = (view: CalendarView) => {
    setSelectedViewState(view)
    saveToLocalStorage({
      selectedYear,
      dateCells: Object.fromEntries(dateCells),
      selectedColorTexture,
      selectedView: view,
      googleDriveFileId: googleDriveFileId || undefined,
    })
  }

  const setGoogleDriveFileId = (fileId: string | null) => {
    setGoogleDriveFileIdState(fileId)
    saveToLocalStorage({
      selectedYear,
      dateCells: Object.fromEntries(dateCells),
      selectedColorTexture,
      selectedView,
      googleDriveFileId: fileId || undefined,
    })
  }

  const value: CalendarContextType = {
    selectedYear,
    setSelectedYear,
    dateCells,
    setDateCells,
    selectedColorTexture,
    setSelectedColorTexture,
    selectedView,
    setSelectedView,
    googleDriveFileId,
    setGoogleDriveFileId,
  }

  return <CalendarContext.Provider value={value}>{children}</CalendarContext.Provider>
}

export const useCalendar = (): CalendarContextType => {
  const context = useContext(CalendarContext)
  if (context === undefined) {
    throw new Error("useCalendar must be used within a CalendarProvider")
  }
  return context
}
