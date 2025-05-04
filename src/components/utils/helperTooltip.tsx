import React from 'react'

const HelperTooltip = ({ message }: { message: string }) => {
  return (
    <div className="relative group inline-block cursor-pointer">
      {/* Icon */}
      <span className="h-4 w-4 text-gray-500">❓</span>

      {/* Tooltip bubble */}
      <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 w-48 p-2 bg-black text-white text-sm rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
        {message}
      </div>
    </div>
  )
}

export default HelperTooltip
