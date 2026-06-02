import React from 'react'
import ReactDOM from 'react-dom/client'
import AppClient from './AppClient.jsx'
import './index.css'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppClient />
    <ToastContainer position="top-right" autoClose={3000} />
  </React.StrictMode>
)
