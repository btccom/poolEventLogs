interface ICommonEvents {
    topic: string;
    value: string;
    offset: number;
    partition: number;
    key: number;
}

interface IMinerActivityEvent {
    created_at: string;
    type: string;
    content: IMinerActivityEventContent;
}

interface IMinerActivityEventContent {
    user_id: number;
    user_name: string;
    worker_name: string;
    client_agent: string;
    ip: string;
}

interface IMinerActivity {
    event_id: string;
    event_name: string;
    created_at: number;
    content: {
        worker_name: string;
    };
}