import React, { useEffect, useState, useRef } from "react"
import { useCalendar } from "../contexts/CalendarContext"
import { UI_COLORS } from "../utils/colors"

// Global google and gapi types
declare global {
  interface Window {
    gapi: any
    google: any
  }
}

const CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID
const API_KEY = process.env.REACT_APP_GOOGLE_API_KEY
const DISCOVERY_DOC = "https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"
const SCOPES = "https://www.googleapis.com/auth/drive"

const GoogleDriveIntegration: React.FC = () => {
  const {
    selectedYear,
    dateCells,
    selectedColorTexture,
    selectedView,
    setDateCells,
    setSelectedYear,
    setSelectedColorTexture,
    setSelectedView,
    googleDriveFileId,
    setGoogleDriveFileId,
  } = useCalendar()

  const [gapiInited, setGapiInited] = useState(false)
  const [gisInited, setGisInited] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [statusMessage, setStatusMessage] = useState("")

  // For Load Dialog
  const [files, setFiles] = useState<any[]>([])
  const [showLoadDialog, setShowLoadDialog] = useState(false)

  const tokenClient = useRef<any>(null)

  useEffect(() => {
    const initializeGapiClient = async () => {
      try {
        await window.gapi.client.init({
          apiKey: API_KEY,
          discoveryDocs: [DISCOVERY_DOC],
        })
        setGapiInited(true)
      } catch (err) {
        console.error("Error initializing GAPI", err)
      }
    }

    const initializeGisClient = () => {
      tokenClient.current = window.google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: (resp: any) => {
          if (resp.error !== undefined) {
            throw resp
          }
          checkUser()
        },
      })
      setGisInited(true)
    }

    const loadGapiScript = () => {
      const script = document.createElement("script")
      script.src = "https://apis.google.com/js/api.js"
      script.async = true
      script.defer = true
      script.onload = () => {
        initializeGapiClient()
      }
      document.body.appendChild(script)
    }

    const loadGisScript = () => {
      const script = document.createElement("script")
      script.src = "https://accounts.google.com/gsi/client"
      script.async = true
      script.defer = true
      script.onload = () => {
        initializeGisClient()
      }
      document.body.appendChild(script)
    }

    if (CLIENT_ID && API_KEY) {
      loadGapiScript()
      loadGisScript()
    } else {
      console.warn("Google Client ID or API Key missing")
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const checkUser = async () => {
    try {
      // Check if we have a valid token by making a simple request
      const response = await window.gapi.client.drive.about.get({
        fields: "user",
      })
      setUser(response.result.user)
    } catch (error) {
      // Token might be invalid or missing
      setUser(null)
    }
  }

  const handleAuthClick = () => {
    if (tokenClient.current) {
      if (window.gapi.client.getToken() === null) {
        tokenClient.current.requestAccessToken({ prompt: "consent" })
      } else {
        tokenClient.current.requestAccessToken({ prompt: "" })
      }
    }
  }

  const handleSignoutClick = () => {
    const token = window.gapi.client.getToken()
    if (token !== null) {
      window.google.accounts.oauth2.revoke(token.access_token, () => {
        window.gapi.client.setToken("")
        setUser(null)
        setGoogleDriveFileId(null)
        setStatusMessage("Signed out")
        setTimeout(() => setStatusMessage(""), 3000)
      })
    }
  }

  const handleSaveToDrive = async () => {
    if (!user) {
      handleAuthClick() // Trigger login if not logged in, but better to force user to click login first
      return
    }
    setLoading(true)
    setStatusMessage("Saving...")

    const dataToSave = {
      selectedYear,
      dateCells: Object.fromEntries(dateCells),
      selectedColorTexture,
      selectedView,
      googleDriveFileId, // Include ID in content just in case
      version: "2.0",
      exportDate: new Date().toISOString(),
    }

    const fileContent = JSON.stringify(dataToSave, null, 2)
    const fileName = `year-planner-${selectedYear}.json`

    try {
      if (googleDriveFileId) {
        // Update existing file
        await window.gapi.client.request({
          path: `/upload/drive/v3/files/${googleDriveFileId}`,
          method: "PATCH",
          params: {
            uploadType: "media",
          },
          body: fileContent,
        })
        setStatusMessage("Saved successfully!")
      } else {
        // Create new file
        const metadata = {
          name: fileName,
          mimeType: "application/json",
          // parents: ['root'] // Default to root
        }

        const multipartBoundary = "foo_bar_baz"
        const delimiter = "\r\n--" + multipartBoundary + "\r\n"
        const close_delim = "\r\n--" + multipartBoundary + "--"

        const contentType = "application/json"

        const body =
          delimiter +
          "Content-Type: application/json\r\n\r\n" +
          JSON.stringify(metadata) +
          delimiter +
          "Content-Type: " +
          contentType +
          "\r\n\r\n" +
          fileContent +
          close_delim

        const response = await window.gapi.client.request({
          path: "/upload/drive/v3/files",
          method: "POST",
          params: {
            uploadType: "multipart",
          },
          headers: {
            "Content-Type": "multipart/related; boundary=" + multipartBoundary,
          },
          body: body,
        })

        const newFileId = response.result.id
        setGoogleDriveFileId(newFileId)
        setStatusMessage("Created and saved new file!")
      }
    } catch (error: any) {
      console.error("Error saving to Drive", error)
      setStatusMessage("Error saving: " + (error.result?.error?.message || error.message))
    } finally {
      setLoading(false)
      setTimeout(() => setStatusMessage(""), 5000)
    }
  }

  const handleLoadFromDrive = async () => {
    if (!user) {
      handleAuthClick()
      return
    }
    setLoading(true)
    try {
      const response = await window.gapi.client.drive.files.list({
        pageSize: 20,
        fields: "nextPageToken, files(id, name, createdTime, modifiedTime)",
        q: "mimeType = 'application/json' and trashed = false",
        orderBy: "modifiedTime desc",
      })
      setFiles(response.result.files)
      setShowLoadDialog(true)
    } catch (error: any) {
      console.error("Error listing files", error)
      setStatusMessage("Error listing files: " + (error.result?.error?.message || error.message))
    } finally {
      setLoading(false)
    }
  }

  const loadFile = async (fileId: string) => {
    setLoading(true)
    setStatusMessage("Loading...")
    try {
      const response = await window.gapi.client.drive.files.get({
        fileId: fileId,
        alt: "media",
      })
      const loadedData = response.result

      // Validate and Load Data (Reuse logic from SaveLoadData ideally, but duplicating for safety/simplicity here)
      if (loadedData.dateCells && typeof loadedData.dateCells === "object") {
        const newDateCells = new Map(dateCells) // Start with current or empty? Usually load replaces or merges.
        // Assuming merge as per existing SaveLoadData behavior, or replace?
        // SaveLoadData does merge: "const newDateCells = new Map(dateCells)..."

        // Let's do merge to be consistent
        Object.entries(loadedData.dateCells).forEach(([dateKey, cellData]) => {
          const existing = newDateCells.get(dateKey) || {}
          newDateCells.set(dateKey, {
            ...existing,
            ...(cellData as any),
          })
        })
        setDateCells(newDateCells)
      }

      if (loadedData.selectedYear) setSelectedYear(loadedData.selectedYear)
      if (loadedData.selectedColorTexture) setSelectedColorTexture(loadedData.selectedColorTexture)
      if (loadedData.selectedView) setSelectedView(loadedData.selectedView)

      setGoogleDriveFileId(fileId)
      setStatusMessage("Loaded successfully!")
      setShowLoadDialog(false)
    } catch (error: any) {
      console.error("Error loading file", error)
      setStatusMessage("Error loading file: " + (error.result?.error?.message || error.message))
    } finally {
      setLoading(false)
      setTimeout(() => setStatusMessage(""), 5000)
    }
  }

  if (!CLIENT_ID || !API_KEY) {
    return null // Don't render if not configured
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "10px",
        marginTop: "10px",
        padding: "10px",
        borderTop: `1px solid ${UI_COLORS.border.tertiary}`,
      }}
    >
      <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
        {!user ? (
          <button
            onClick={handleAuthClick}
            disabled={!gapiInited || !gisInited}
            style={buttonStyle(UI_COLORS.button.primary.normal)}
          >
            Sign in with Google
          </button>
        ) : (
          <>
            <div style={{ fontSize: "12px", color: UI_COLORS.text.secondary }}>
              Signed in as: <b>{user.displayName || user.emailAddress}</b>
            </div>
            <button onClick={handleSignoutClick} style={buttonStyle(UI_COLORS.button.secondary.normal)}>
              Sign Out
            </button>
          </>
        )}
      </div>

      {user && (
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button onClick={handleSaveToDrive} disabled={loading} style={buttonStyle(UI_COLORS.button.success.normal)}>
            {loading ? "Working..." : googleDriveFileId ? "Update Drive File" : "Save to Drive (New)"}
          </button>
          <button onClick={handleLoadFromDrive} disabled={loading} style={buttonStyle(UI_COLORS.button.primary.normal)}>
            Load from Drive
          </button>
        </div>
      )}

      {statusMessage && <div style={{ fontSize: "14px", color: UI_COLORS.text.primary }}>{statusMessage}</div>}

      {showLoadDialog && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: "white",
              padding: "20px",
              borderRadius: "8px",
              maxWidth: "500px",
              width: "90%",
              maxHeight: "80vh",
              overflowY: "auto",
            }}
          >
            <h3>Select a file to load</h3>
            <ul style={{ listStyle: "none", padding: 0 }}>
              {files.map((file) => (
                <li
                  key={file.id}
                  style={{
                    padding: "10px",
                    borderBottom: "1px solid #eee",
                    cursor: "pointer",
                    display: "flex",
                    justifyContent: "space-between",
                  }}
                  onClick={() => loadFile(file.id)}
                >
                  <span>{file.name}</span>
                  <span style={{ fontSize: "0.8em", color: "#666" }}>
                    {new Date(file.modifiedTime).toLocaleDateString()}
                  </span>
                </li>
              ))}
              {files.length === 0 && <li style={{ padding: "10px" }}>No JSON files found in Drive.</li>}
            </ul>
            <button
              onClick={() => setShowLoadDialog(false)}
              style={{ ...buttonStyle(UI_COLORS.button.secondary.normal), marginTop: "10px" }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

const buttonStyle = (bgColor: string) => ({
  padding: "8px 16px",
  fontSize: "13px",
  fontWeight: "bold",
  backgroundColor: bgColor,
  color: "white",
  border: "none",
  borderRadius: "6px",
  cursor: "pointer",
  transition: "background-color 0.2s ease",
} as React.CSSProperties)

export default GoogleDriveIntegration
