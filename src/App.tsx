import React from "react"
import "./App.css"
import Calendar from "./components/Calendar"
import { CalendarProvider } from "./contexts/CalendarContext"
import { GoogleDriveProvider, useGoogleDrive } from "./contexts/GoogleDriveContext"

const styleSheet = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`

const lockScreenBgStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  minHeight: "100vh",
  width: "100%",
  background: "radial-gradient(circle at 50% 50%, #17152f 0%, #0a0814 100%)",
  fontFamily: "'Outfit', 'Inter', system-ui, -apple-system, sans-serif",
  margin: 0,
  padding: "20px",
  boxSizing: "border-box",
}

const glassCardStyle: React.CSSProperties = {
  background: "rgba(22, 19, 43, 0.65)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  border: "1px solid rgba(255, 255, 255, 0.06)",
  borderRadius: "28px",
  padding: "48px 40px",
  width: "100%",
  maxWidth: "460px",
  textAlign: "center",
  boxShadow: "0 30px 60px -15px rgba(0, 0, 0, 0.8), inset 0 1px 0 rgba(255, 255, 255, 0.05)",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  position: "relative",
  overflow: "hidden",
}

const glowEffectStyle: React.CSSProperties = {
  position: "absolute",
  top: "-150px",
  left: "-150px",
  width: "300px",
  height: "300px",
  background: "radial-gradient(circle, rgba(129, 140, 248, 0.15) 0%, rgba(0,0,0,0) 70%)",
  pointerEvents: "none",
  zIndex: 0,
}

const iconContainerStyle: React.CSSProperties = {
  marginBottom: "24px",
  zIndex: 1,
}

const mainTitleStyle: React.CSSProperties = {
  fontSize: "32px",
  fontWeight: 800,
  color: "#ffffff",
  margin: "0 0 12px 0",
  letterSpacing: "-0.03em",
  background: "linear-gradient(to right, #ffffff, #d8b4fe, #818cf8)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
  zIndex: 1,
}

const titleStyle: React.CSSProperties = {
  fontSize: "24px",
  fontWeight: 700,
  color: "#ffffff",
  margin: "0 0 12px 0",
  zIndex: 1,
}

const subtitleStyle: React.CSSProperties = {
  fontSize: "14.5px",
  color: "#94a3b8",
  lineHeight: "1.6",
  margin: "0 0 24px 0",
  zIndex: 1,
}

const infoPillStyle: React.CSSProperties = {
  fontSize: "13px",
  color: "#818cf8",
  background: "rgba(129, 140, 248, 0.08)",
  border: "1px solid rgba(129, 140, 248, 0.15)",
  padding: "8px 16px",
  borderRadius: "9999px",
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  marginBottom: "32px",
  zIndex: 1,
}

const lockIconStyle: React.CSSProperties = {
  fontSize: "12px",
}

const loginButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "12px",
  width: "100%",
  padding: "14px 24px",
  fontSize: "15px",
  fontWeight: 600,
  color: "#0f172a",
  backgroundColor: "#ffffff",
  border: "none",
  borderRadius: "12px",
  cursor: "pointer",
  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
  transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
  zIndex: 1,
}

const googleIconStyle: React.CSSProperties = {
  marginRight: "4px",
}

const spinnerStyle: React.CSSProperties = {
  width: "48px",
  height: "48px",
  border: "4px solid rgba(255, 255, 255, 0.05)",
  borderTop: "4px solid #818cf8",
  borderRadius: "50%",
  animation: "spin 1s linear infinite",
  marginBottom: "24px",
  zIndex: 1,
}

function AppContent() {
  const { authStatus, currentUserEmail, login, logout } = useGoogleDrive()

  const handleBtnHover = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.transform = "translateY(-1px)"
    e.currentTarget.style.boxShadow = "0 10px 15px -3px rgba(0, 0, 0, 0.3)"
    if (e.currentTarget.style.backgroundColor === "rgb(255, 255, 255)" || e.currentTarget.style.backgroundColor === "") {
      e.currentTarget.style.backgroundColor = "#f8fafc"
    }
  }

  const handleBtnLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.transform = "none"
    e.currentTarget.style.boxShadow = "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)"
    if (e.currentTarget.style.backgroundColor === "#f8fafc") {
      e.currentTarget.style.backgroundColor = "#ffffff"
    }
  }

  if (authStatus === "initializing" || authStatus === "authenticating") {
    return (
      <div style={lockScreenBgStyle}>
        <style>{styleSheet}</style>
        <div style={glassCardStyle}>
          <div style={glowEffectStyle} />
          <div style={spinnerStyle} />
          <h2 style={titleStyle}>Year Planner</h2>
          <p style={{ ...subtitleStyle, marginBottom: 0 }}>
            {authStatus === "initializing" ? "Initializing Google Services..." : "Authenticating with Google..."}
          </p>
        </div>
      </div>
    )
  }

  if (authStatus === "unauthenticated") {
    return (
      <div style={lockScreenBgStyle}>
        <style>{styleSheet}</style>
        <div style={glassCardStyle}>
          <div style={glowEffectStyle} />
          <div style={iconContainerStyle}>
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="url(#gradient)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <defs>
                <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#c084fc" />
                  <stop offset="100%" stopColor="#6366f1" />
                </linearGradient>
              </defs>
              <rect x="3" y="4" width="18" height="18" rx="4" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
              <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01" strokeWidth="2" />
            </svg>
          </div>
          <h1 style={mainTitleStyle}>My Year Planner</h1>
          <p style={subtitleStyle}>
            A private, visual year-at-a-glance wall calendar. Envision your time, track events, and color your year.
          </p>
          <div style={infoPillStyle}>
            <span style={lockIconStyle}>🔒</span> Private Google Drive Sync Enabled
          </div>
          <button onClick={login} style={loginButtonStyle} onMouseEnter={handleBtnHover} onMouseLeave={handleBtnLeave}>
            <svg style={googleIconStyle} viewBox="0 0 24 24" width="18" height="18">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Sign in with Google
          </button>
        </div>
      </div>
    )
  }

  if (authStatus === "unauthorized") {
    return (
      <div style={lockScreenBgStyle}>
        <div style={{ ...glassCardStyle, borderColor: "rgba(239, 68, 68, 0.2)" }}>
          <div style={glowEffectStyle} />
          <div style={iconContainerStyle}>
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
            </svg>
          </div>
          <h2 style={{ ...titleStyle, color: "#f87171" }}>Restricted Access</h2>
          <p style={subtitleStyle}>
            This application is private. Your Google account is not authorized to view this planner:
          </p>
          <div style={{ ...infoPillStyle, background: "rgba(239, 68, 68, 0.12)", border: "1px solid rgba(239, 68, 68, 0.2)", color: "#fca5a5" }}>
            {currentUserEmail}
          </div>
          <p style={{ ...subtitleStyle, fontSize: "13px", color: "#64748b", margin: 0 }}>
            Please sign out and log in with your authorized family email address.
          </p>
          <button onClick={logout} style={{ ...loginButtonStyle, backgroundColor: "rgba(255, 255, 255, 0.08)", border: "1px solid rgba(255, 255, 255, 0.15)", color: "#ffffff", marginTop: "24px" }} onMouseEnter={handleBtnHover} onMouseLeave={handleBtnLeave}>
            Sign Out & Switch Account
          </button>
        </div>
      </div>
    )
  }

  return (
    <CalendarProvider>
      <div className="App">
        <Calendar />
      </div>
    </CalendarProvider>
  )
}

function App() {
  return (
    <GoogleDriveProvider>
      <AppContent />
    </GoogleDriveProvider>
  )
}

export default App
