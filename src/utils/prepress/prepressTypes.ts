/**
 * Luxius System - Prepress Inspection Types
 */

export type DpiQualityLevel = 'optimal' | 'acceptable' | 'critical';

export interface DpiTierInfo {
    tier: DpiQualityLevel;
    label: string;
    badgeClass: string;
    color: string;
    icon: string;
    desc: string;
}

export interface PrepressDimensions {
    width: number;
    height: number;
    dpi?: number;
}
