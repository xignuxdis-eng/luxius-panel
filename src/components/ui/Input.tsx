import React from 'react'
import './Input.css'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string
    error?: string
    icon?: React.ReactNode
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ label, error, icon, className = '', ...props }, ref) => {
        return (
            <div className={`input-group ${error ? 'has-error' : ''} ${className}`}>
                {label && <label className="input-label" htmlFor={props.id}>{label}</label>}
                <div className="input-wrapper">
                    {icon && <span className="input-icon">{icon}</span>}
                    <input
                        ref={ref}
                        className={`input-field ${icon ? 'with-icon' : ''}`}
                        {...props}
                    />
                </div>
                {error && <span className="input-error">{error}</span>}
            </div>
        )
    }
)

Input.displayName = 'Input'
