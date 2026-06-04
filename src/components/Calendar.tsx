import React from "react"
import { useCalendar } from "../contexts/CalendarContext"
import { useIsMobile } from "../hooks/useIsMobile"
import CalendarTitle from "./CalendarTitle"
import ColorPicker from "./ColorPicker"
import { FloatingSyncBar } from "./FloatingSyncBar"
import ClassicView from "./views/ClassicView"
import ColumnView from "./views/ColumnView"
import LinearView from "./views/LinearView"
import ViewSelector from "./ViewSelector"

const Calendar: React.FC = () => {
  const { selectedYear, dateCells, setDateCells, selectedColorTexture, selectedView, setSelectedView } = useCalendar()
  const isMobile = useIsMobile()

  if (isMobile) {
    return (
      <div style={{ padding: "12px", fontFamily: "Arial, sans-serif" }}>
        <CalendarTitle />
        <ClassicView
          selectedYear={selectedYear}
          dateCells={dateCells}
          setDateCells={setDateCells}
          selectedColorTexture={selectedColorTexture}
          compact
        />
      </div>
    )
  }

  return (
    <div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
      <FloatingSyncBar />

      <CalendarTitle />
      <div className="no-print">
        <ColorPicker />
        <ViewSelector selectedView={selectedView} onViewChange={setSelectedView} />
      </div>

      {selectedView === "Linear" ? (
        <LinearView
          selectedYear={selectedYear}
          dateCells={dateCells}
          setDateCells={setDateCells}
          selectedColorTexture={selectedColorTexture}
        />
      ) : selectedView === "Classic" ? (
        <ClassicView
          selectedYear={selectedYear}
          dateCells={dateCells}
          setDateCells={setDateCells}
          selectedColorTexture={selectedColorTexture}
        />
      ) : (
        <ColumnView
          selectedYear={selectedYear}
          dateCells={dateCells}
          setDateCells={setDateCells}
          selectedColorTexture={selectedColorTexture}
        />
      )}
    </div>
  )
}

export default Calendar
