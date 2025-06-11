import { useState, useEffect } from 'react'
import { io, Socket } from 'socket.io-client'
import './App.css'

interface HealthStatus {
  status: string;
  timestamp: string;
  connectedUsers: number;
  totalConnections: number;
}

function App() {
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null)
  const [socket, setSocket] = useState<Socket | null>(null)
  const [socketConnected, setSocketConnected] = useState(false)
  const [realtimeMessages, setRealtimeMessages] = useState<any[]>([])

  // Ping the API health endpoint
  const checkHealth = async () => {
    try {
      const response = await fetch('/api/health')
      const data = await response.json()
      setHealthStatus(data)
    } catch (error) {
      console.error('Health check failed:', error)
      setHealthStatus({ 
        status: 'ERROR', 
        timestamp: new Date().toISOString(),
        connectedUsers: 0,
        totalConnections: 0
      })
    }
  }

  // Connect to WebSocket
  useEffect(() => {
    const newSocket = io('http://localhost:3001')
    
    newSocket.on('connect', () => {
      console.log('Connected to WebSocket')
      setSocketConnected(true)
      newSocket.emit('join', { username: 'test-user' })
    })

    newSocket.on('disconnect', () => {
      console.log('Disconnected from WebSocket')
      setSocketConnected(false)
    })

    newSocket.on('realtime_update', (data) => {
      console.log('Real-time update:', data)
      setRealtimeMessages(prev => [...prev.slice(-4), {
        timestamp: new Date().toISOString(),
        ...data
      }])
    })

    setSocket(newSocket)

    return () => {
      newSocket.close()
    }
  }, [])

  // Check health on mount and periodically
  useEffect(() => {
    checkHealth()
    const interval = setInterval(checkHealth, 5000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="app">
      <header>
        <h1>🏞️ APStat Park</h1>
        <p>React Frontend Connected to TypeScript API</p>
      </header>

      <main>
        <section className="status-section">
          <h2>API Health Status</h2>
          <div className={`status-card ${healthStatus?.status === 'OK' ? 'healthy' : 'error'}`}>
            <p><strong>Status:</strong> {healthStatus?.status || 'Loading...'}</p>
            <p><strong>Timestamp:</strong> {healthStatus?.timestamp || 'N/A'}</p>
            <p><strong>Connected Users:</strong> {healthStatus?.connectedUsers || 0}</p>
            <p><strong>Total Connections:</strong> {healthStatus?.totalConnections || 0}</p>
            <button onClick={checkHealth}>Refresh</button>
          </div>
        </section>

        <section className="websocket-section">
          <h2>WebSocket Connection</h2>
          <div className={`status-card ${socketConnected ? 'healthy' : 'error'}`}>
            <p><strong>Status:</strong> {socketConnected ? 'Connected' : 'Disconnected'}</p>
            <p><strong>Real-time Messages:</strong> {realtimeMessages.length}</p>
          </div>
          
          <div className="messages">
            <h3>Recent Real-time Updates:</h3>
            {realtimeMessages.length === 0 ? (
              <p>No real-time messages yet...</p>
            ) : (
              realtimeMessages.map((msg, idx) => (
                <div key={idx} className="message">
                  <code>{JSON.stringify(msg, null, 2)}</code>
                </div>
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  )
}

export default App
