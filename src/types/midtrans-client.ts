export interface SnapResult {
    order_id?: string;
    transaction_status?: string;
    status_code?: string;
    gross_amount?: string;
    [key: string]: unknown;
}

export interface SnapCallbacks {
    onSuccess?: (result: SnapResult) => void;
    onPending?: (result: SnapResult) => void;
    onError?: (result: SnapResult) => void;
    onClose?: () => void;
}

export interface SnapWindow {
    snap: {
        pay: (token: string, callbacks: SnapCallbacks) => void;
    };
}
