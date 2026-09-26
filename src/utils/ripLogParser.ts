export interface RipLog {
    jobName: string
    machine: string
    eventId: number
    widthM: number
    heightM: number
    copies: number
    m2: number
    mediaName: string
    ink: { c: number; m: number; y: number; k: number }
    totalInkMl: number
    startTime: string
    completeTime: string
}

const NL_TO_ML = 1 / 1000000

function parseDateTime(el: Element | null): string {
    if (!el) return ''
    const g = (name: string) => Number(el.querySelector(name)?.textContent || 0)
    const year = g('year')
    if (!year || year === 0) return ''
    const month = g('month')
    const day = g('day')
    const hour = g('hour')
    const minute = g('minute')
    const second = g('second')
    const d = new Date(year, Math.max(0, month - 1), Math.max(1, day), hour, minute, second)
    return Number.isNaN(d.getTime()) ? '' : d.toISOString()
}

function parseInk(el: Element): { c: number; m: number; y: number; k: number } {
    const ink = { c: 0, m: 0, y: 0, k: 0 }
    const volumeEl = el.querySelector('afConsumptionInkVolume_nl')
    const namesEl = el.querySelector('aszConsumptionInkLongName')
    if (!volumeEl || !namesEl) return ink
    const values = Array.from(volumeEl.children).filter(n => n.tagName.toLowerCase().startsWith('value'))
    const nameEls = Array.from(namesEl.children).filter(n => n.tagName.toLowerCase().startsWith('value'))
    values.forEach((v, i) => {
        const ml = (Number(v.textContent) || 0) * NL_TO_ML
        const english = nameEls[i]?.querySelector('English')?.textContent?.toLowerCase() || ''
        if (english.includes('black')) ink.k += ml
        else if (english.includes('cyan')) ink.c += ml
        else if (english.includes('magenta')) ink.m += ml
        else if (english.includes('yellow')) ink.y += ml
    })
    return ink
}

export function parseRolandVersaWorksLog(xml: string): RipLog[] {
    const doc = new DOMParser().parseFromString(xml, 'text/xml')
    const items = Array.from(doc.querySelectorAll('EventLogItem'))
    const byJob = new Map<string, RipLog>()

    for (const el of items) {
        const eventId = Number(el.querySelector('eventID')?.textContent || 0)
        if (eventId !== 24 && eventId !== 25) continue

        const jobName = el.querySelector('strJobName')?.textContent || ''
        if (!jobName) continue

        const x = Number(el.querySelector('printSize_mm > x')?.textContent || 0)
        const y = Number(el.querySelector('printSize_mm > y')?.textContent || 0)
        if (x <= 0 || y <= 0) continue

        const copies = Number(el.querySelector('nCopyCount')?.textContent || 1) || 1
        const widthM = x / 1000
        const heightM = y / 1000
        const m2 = Math.round(widthM * heightM * copies * 1000) / 1000

        const ink = parseInk(el)
        const totalInkMl = Math.round((ink.c + ink.m + ink.y + ink.k) * 100) / 100

        const startTime = parseDateTime(el.querySelector('printStartTime')) || parseDateTime(el.querySelector('RIPStartTime')) || parseDateTime(el.querySelector('inputTime'))
        const completeTime = parseDateTime(el.querySelector('printCompleteTime')) || parseDateTime(el.querySelector('RIPCompleteTime')) || parseDateTime(el.querySelector('inputTime'))

        const log: RipLog = {
            jobName,
            machine: el.querySelector('strNickName')?.textContent || '',
            eventId,
            widthM,
            heightM,
            copies,
            m2,
            mediaName: el.querySelector('strMediaName > English')?.textContent || '',
            ink,
            totalInkMl,
            startTime,
            completeTime
        }

        const existing = byJob.get(jobName)
        if (!existing || (eventId === 25 && existing.eventId !== 25)) {
            byJob.set(jobName, log)
        }
    }

    return Array.from(byJob.values()).sort((a, b) =>
        (b.completeTime || b.startTime || '').localeCompare(a.completeTime || a.startTime || '')
    )
}
