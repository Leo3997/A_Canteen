import { useState, useEffect, useRef } from 'react';

const API_BASE = "ws://localhost:8000";

export const useWebSocket = (
    url: string, 
    onMessage: (data: any) => void
) => {
    const ws = useRef<WebSocket | null>(null);
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        const connect = () => {
            const socketUrl = `${API_BASE}${url}`;
            ws.current = new WebSocket(socketUrl);

            ws.current.onopen = () => {
                console.log('WS Connected');
                setIsConnected(true);
            };

            ws.current.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    onMessage(data);
                } catch (e) {
                    console.error("WS Parse Error", e);
                }
            };

            ws.current.onclose = () => {
                console.log('WS Disconnected');
                setIsConnected(false);
                // Simple reconnect logic
                setTimeout(connect, 3000);
            };

            ws.current.onerror = (err) => {
                console.error('WS Error', err);
                ws.current?.close();
            };
        };

        connect();

        return () => {
            ws.current?.close();
        };
    }, [url]); // Dependency on url implies re-connect if url changes

    return { isConnected };
};
