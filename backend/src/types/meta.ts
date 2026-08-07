export interface MetaWebhookPayload {
    entry: MetaEntry[];
}

interface MetaEntry {
    changes: MetaChange[];
}

interface MetaChange {
    value: MetaValue;
}

interface MetaValue {
    contacts?: MetaContact[];
    messages?: MetaMessage[];
}

interface MetaContact {
    wa_id: string;
    profile?: {
        name?: string;
    };
}

interface MetaMessage {
    from: string;
    timestamp: string;
    type: string;

    text?: {
        body: string;
    };
}