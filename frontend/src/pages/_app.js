import '../styles/globals.css'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { useEffect } from 'react'
import useAuthStore from '../context/authStore'
import Cookies from 'js-cookie'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
})

export default function App({ Component, pageProps }) {
  const fetchMe = useAuthStore(s => s.fetchMe)

  useEffect(() => {
    if (Cookies.get('accessToken')) fetchMe()
  }, [])

  const getLayout = Component.getLayout || (page => page)

  return (
    <QueryClientProvider client={queryClient}>
      {getLayout(<Component {...pageProps} />)}
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            fontSize: '14px',
            borderRadius: '10px',
            padding: '12px 16px',
            fontFamily: 'Inter, system-ui, sans-serif',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          },
          success: { iconTheme: { primary: '#16a34a', secondary: '#fff' } },
          error:   { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
        }}
      />
    </QueryClientProvider>
  )
}
