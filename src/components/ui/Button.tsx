import React from 'react'
import './Button.css'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'accent'
    size?: 'xs' | 'sm' | 'md' | 'lg'
    isLoading?: boolean
    icon?: React.ReactNode
}

export default function Button({
    children,
    variant = 'primary',
    size = 'md',
    isLoading,
    icon,
    className = '',
    ...props
}: ButtonProps) {
    return (
        <button
            className={`btn btn-${variant} btn-${size} ${className} ${isLoading ? 'is-loading' : ''}`}
            disabled={isLoading || props.disabled}
            {...props}
        >
            {isLoading && <span className="loading-spinner"></span>}
            {!isLoading && icon && <span className="btn-icon">{icon}</span>}
            <span className="btn-text">{children}</span>
        </button>
    )
}
