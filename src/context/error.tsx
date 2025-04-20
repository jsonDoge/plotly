import React, { createContext, useContext, useMemo, useState } from 'react'
import PropTypes from 'prop-types'

interface IErrorContext {
  error: string
  setError: (message: string) => void
}

const ErrorContext = createContext<IErrorContext>({
  error: '',
  setError: () => {},
})

const ErrorContextProvider = ({ children }: { children: React.ReactNode }) => {
  const [error, setError] = useState('')

  const errorMemo = useMemo(
    () => ({
      error,
      setError,
    }),
    [error, setError],
  )
  return <ErrorContext.Provider value={errorMemo}>{children}</ErrorContext.Provider>
}

ErrorContextProvider.propTypes = {
  children: PropTypes.node.isRequired,
}

export default ErrorContextProvider
export const useError = () => useContext(ErrorContext)
