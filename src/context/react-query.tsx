'use client'

import React, { ReactNode, useState } from 'react'
// import { usePathname } from 'next/navigation'
// import { ReactQueryStreamedHydration } from '@tanstack/react-query-next-experimental'
import { QueryClientProvider, QueryClient } from '@tanstack/react-query'

export function ReactQueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(new QueryClient())

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}
