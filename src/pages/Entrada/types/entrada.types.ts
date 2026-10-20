import type { Order } from '@/types'

export interface GroupedBatch {
    isBatch: true;
    batchId: string;
    batchName: string;
    orders: Order[];
    primaryOrder: Order;
    totalPrice: number;
    totalConsumption: {
        m2: number;
        ml: number;
        mlByBobina: Record<string, number>;
        rawMl?: number;
        savingsPercent?: number;
        savingsMeters?: number;
    };
    totalCopies: number;
    allSelected: boolean;
    someSelected: boolean;
}

export interface GroupedSingle {
    isBatch: false;
    order: Order;
}

export type GroupedItem = GroupedBatch | GroupedSingle;
