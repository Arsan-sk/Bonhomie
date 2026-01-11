import React from 'react'
import { AlertCircle } from 'lucide-react'

const labelClasses = "block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 ml-1"
const baseInputClasses = "block w-full rounded-xl border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 shadow-sm transition-all duration-200 ease-in-out placeholder:text-gray-400 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 sm:text-sm hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"

export const AdminInput = ({ label, error, icon: Icon, ...props }) => (
    <div className="w-full">
        {label && <label className={labelClasses}>{label}</label>}
        <div className="relative group">
            {Icon && (
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 transition-colors duration-200 group-focus-within:text-indigo-500 text-gray-400">
                    <Icon className="h-5 w-5" />
                </div>
            )}
            <input
                className={`${baseInputClasses} ${Icon ? 'pl-11' : ''} ${error ? 'border-red-300 focus:border-red-500 focus:ring-red-200' : ''}`}
                {...props}
            />
            {error && (
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 group-hover:block hidden">
                    <AlertCircle className="h-5 w-5 text-red-500" />
                </div>
            )}
        </div>
        {error && <p className="mt-1 text-xs text-red-600 ml-1">{error}</p>}
    </div>
)

export const AdminSelect = ({ label, error, children, ...props }) => (
    <div className="w-full">
        {label && <label className={labelClasses}>{label}</label>}
        <div className="relative">
            <select
                className={`${baseInputClasses} appearance-none`}
                {...props}
            >
                {children}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                <svg className="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
            </div>
        </div>
        {error && <p className="mt-1 text-xs text-red-600 ml-1">{error}</p>}
    </div>
)

export const AdminTextarea = ({ label, error, ...props }) => (
    <div className="w-full">
        {label && <label className={labelClasses}>{label}</label>}
        <textarea
            className={`${baseInputClasses} min-h-[100px] resize-y`}
            {...props}
        />
        {error && <p className="mt-1 text-xs text-red-600 ml-1">{error}</p>}
    </div>
)
