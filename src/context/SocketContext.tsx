import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { API_URL } from '../constants/api';

interface SocketContextData {
    socket: Socket | null;
    isConnected: boolean;
}

const SocketContext = createContext<SocketContextData>({} as SocketContextData);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const { token } = useAuth();

    useEffect(() => {
        if (token) {
            const newSocket = io(API_URL, {
                auth: { token },
                transports: ['websocket'],
            });

            newSocket.on('connect', () => {
                console.log('Socket connected');
                setIsConnected(true);
            });

            newSocket.on('disconnect', () => {
                console.log('Socket disconnected');
                setIsConnected(false);
            });

            setSocket(newSocket);

            return () => {
                newSocket.disconnect();
            };
        } else {
            setSocket(null);
            setIsConnected(false);
        }
    }, [token]);

    return (
        <SocketContext.Provider value={{ socket, isConnected }}>
            {children}
        </SocketContext.Provider>
    );
};

export const useSocket = () => useContext(SocketContext);
