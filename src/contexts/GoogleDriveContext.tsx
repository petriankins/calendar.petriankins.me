import React, { createContext, useContext, useEffect, useState, useRef } from "react"

export type AuthStatus = "initializing" | "unauthenticated" | "authenticating" | "authorized" | "unauthorized"
export type SyncStatus = "synced" | "syncing" | "error" | "local-only"

interface GoogleDriveContextType {
  authStatus: AuthStatus
  syncStatus: SyncStatus
  setSyncStatus: (status: SyncStatus) => void
  currentUserEmail: string | null
  userProfile: any | null
  gapiInited: boolean
  gisInited: boolean
  login: () => void
  logout: () => void
  findFileByName: (name: string, ownerEmail?: string) => Promise<string | null>
  getFileContent: (fileId: string) => Promise<any>
  createFile: (name: string, content: any) => Promise<string>
  updateFile: (fileId: string, content: any) => Promise<void>
  primaryOwnerEmail: string | null
  isPrimaryOwner: boolean
}

const GoogleDriveContext = createContext<GoogleDriveContextType | undefined>(undefined)

const CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID
const API_KEY = process.env.REACT_APP_GOOGLE_API_KEY
const DISCOVERY_DOC = "https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"
const SCOPES = "https://www.googleapis.com/auth/drive.file"

interface GoogleDriveProviderProps {
  children: React.ReactNode
}

export const GoogleDriveProvider: React.FC<GoogleDriveProviderProps> = ({ children }) => {
  const [authStatus, setAuthStatus] = useState<AuthStatus>("initializing")
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("local-only")
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null)
  const [userProfile, setUserProfile] = useState<any | null>(null)
  const [gapiInited, setGapiInited] = useState(false)
  const [gisInited, setGisInited] = useState(false)

  const tokenClient = useRef<any>(null)

  const primaryOwnerEmail = process.env.REACT_APP_PRIMARY_OWNER_EMAIL || null
  const isPrimaryOwner = currentUserEmail && primaryOwnerEmail
    ? currentUserEmail.toLowerCase().trim() === primaryOwnerEmail.toLowerCase().trim()
    : true

  // Load allowed emails from environment
  const allowedEmails = React.useMemo(() => {
    const raw = process.env.REACT_APP_ALLOWED_EMAILS || ""
    return raw
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter((email) => email.length > 0)
  }, [])

  useEffect(() => {
    const initializeGapiClient = async () => {
      try {
        await window.gapi.client.init({
          apiKey: API_KEY,
          discoveryDocs: [DISCOVERY_DOC],
        })
        setGapiInited(true)
      } catch (err) {
        console.error("Error initializing GAPI client", err)
      }
    }

    const initializeGisClient = () => {
      try {
        tokenClient.current = window.google.accounts.oauth2.initTokenClient({
          client_id: CLIENT_ID,
          scope: SCOPES,
          callback: async (resp: any) => {
            if (resp.error !== undefined) {
              setAuthStatus("unauthenticated")
              throw resp
            }
            setAuthStatus("authenticating")
            await checkUser()
          },
        })
        setGisInited(true)
      } catch (err) {
        console.error("Error initializing GIS client", err)
      }
    }

    const loadGapiScript = () => {
      const script = document.createElement("script")
      script.src = "https://apis.google.com/js/api.js"
      script.async = true
      script.defer = true
      script.onload = () => {
        window.gapi.load("client", initializeGapiClient)
      }
      document.body.appendChild(script)
    }

    const loadGisScript = () => {
      const script = document.createElement("script")
      script.src = "https://accounts.google.com/gsi/client"
      script.async = true
      script.defer = true
      script.onload = initializeGisClient
      document.body.appendChild(script)
    }

    if (CLIENT_ID && API_KEY) {
      loadGapiScript()
      loadGisScript()
    } else {
      console.warn("Google credentials missing from environment. Drive sync will be disabled.")
      setAuthStatus("unauthenticated")
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Auto-verify token if already in session storage / local memory
  useEffect(() => {
    if (gapiInited && gisInited) {
      const token = window.gapi.client.getToken()
      if (token) {
        checkUser()
      } else {
        setAuthStatus("unauthenticated")
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gapiInited, gisInited])

  const checkUser = async () => {
    try {
      const response = await window.gapi.client.drive.about.get({
        fields: "user",
      })
      const user = response.result.user
      const email = user.emailAddress.toLowerCase()

      setUserProfile(user)
      setCurrentUserEmail(user.emailAddress)

      // Enforce access control: check if email is in the allowed list
      if (allowedEmails.length > 0) {
        if (allowedEmails.includes(email)) {
          setAuthStatus("authorized")
          setSyncStatus("synced")
        } else {
          setAuthStatus("unauthorized")
          setSyncStatus("local-only")
        }
      } else {
        // If allowed list is not specified in the environment, let anyone in by default, but warn in logs.
        console.warn("REACT_APP_ALLOWED_EMAILS is not configured. Access is open to any Google account.")
        setAuthStatus("authorized")
        setSyncStatus("synced")
      }
    } catch (error) {
      console.error("Error verifying Google user identity", error)
      setAuthStatus("unauthenticated")
      setSyncStatus("local-only")
    }
  }

  const login = () => {
    if (tokenClient.current) {
      setAuthStatus("authenticating")
      if (window.gapi.client.getToken() === null) {
        tokenClient.current.requestAccessToken({ prompt: "consent" })
      } else {
        tokenClient.current.requestAccessToken({ prompt: "" })
      }
    }
  }

  const logout = () => {
    const token = window.gapi.client.getToken()
    if (token !== null) {
      window.google.accounts.oauth2.revoke(token.access_token, () => {
        window.gapi.client.setToken(null)
        setUserProfile(null)
        setCurrentUserEmail(null)
        setAuthStatus("unauthenticated")
        setSyncStatus("local-only")
      })
    } else {
      setUserProfile(null)
      setCurrentUserEmail(null)
      setAuthStatus("unauthenticated")
      setSyncStatus("local-only")
    }
  }

  const findFileByName = async (name: string, ownerEmail?: string): Promise<string | null> => {
    try {
      const response = await window.gapi.client.drive.files.list({
        q: `name = '${name}' and mimeType = 'application/json' and trashed = false`,
        fields: "files(id, name, owners)",
        pageSize: 10,
      })
      const files = response.result.files || []

      if (ownerEmail) {
        const targetEmail = ownerEmail.toLowerCase().trim()
        const matchedFile = files.find((file: any) => 
          file.owners && file.owners.some((owner: any) => 
            owner.emailAddress && owner.emailAddress.toLowerCase().trim() === targetEmail
          )
        )
        return matchedFile ? matchedFile.id : null
      }

      return files.length > 0 ? files[0].id : null
    } catch (error) {
      console.error("Error finding file in Google Drive", error)
      throw error
    }
  }

  const getFileContent = async (fileId: string): Promise<any> => {
    try {
      const response = await window.gapi.client.drive.files.get({
        fileId: fileId,
        alt: "media",
      })
      return response.result
    } catch (error) {
      console.error("Error reading file from Google Drive", error)
      throw error
    }
  }

  const createFile = async (name: string, content: any): Promise<string> => {
    try {
      const fileContent = JSON.stringify(content, null, 2)
      const metadata = {
        name: name,
        mimeType: "application/json",
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

      return response.result.id
    } catch (error) {
      console.error("Error creating file in Google Drive", error)
      throw error
    }
  }

  const updateFile = async (fileId: string, content: any): Promise<void> => {
    try {
      const fileContent = JSON.stringify(content, null, 2)
      await window.gapi.client.request({
        path: `/upload/drive/v3/files/${fileId}`,
        method: "PATCH",
        params: {
          uploadType: "media",
        },
        body: fileContent,
      })
    } catch (error) {
      console.error("Error updating file in Google Drive", error)
      throw error
    }
  }

  return (
    <GoogleDriveContext.Provider
      value={{
        authStatus,
        syncStatus,
        setSyncStatus,
        currentUserEmail,
        userProfile,
        gapiInited,
        gisInited,
        login,
        logout,
        findFileByName,
        getFileContent,
        createFile,
        updateFile,
        primaryOwnerEmail,
        isPrimaryOwner,
      }}
    >
      {children}
    </GoogleDriveContext.Provider>
  )
}

export const useGoogleDrive = (): GoogleDriveContextType => {
  const context = useContext(GoogleDriveContext)
  if (context === undefined) {
    throw new Error("useGoogleDrive must be used within a GoogleDriveProvider")
  }
  return context
}
