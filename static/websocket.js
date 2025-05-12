class UsersNavigation {
    constructor(updateCallback) {
        this.socket = null;
        this.currentUserId = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.updateCallback = updateCallback;
        this.initializeWebSocket();
    }

    initializeWebSocket() {
        console.log('Initializing WebSocket...');
        
        this.currentUserId = localStorage.getItem('userId');
        if (!this.currentUserId) {
            console.log('No userId found in localStorage');
            return;
        }

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host;
        const wsUrl = `${protocol}//${host}/ws?user_id=${this.currentUserId}`;
        
        console.log('Connecting to WebSocket:', wsUrl);
        
        this.socket = new WebSocket(wsUrl);
        
        this.socket.addEventListener('open', () => {
            console.log('✅ Users navigation WebSocket connected successfully');
            this.reconnectAttempts = 0;
        });

        this.socket.addEventListener('message', (event) => {
            try {
                const data = JSON.parse(event.data);
                console.log('Received WebSocket message:', data);
                if (data.type === 'user_status' && this.updateCallback) {
                    console.log('Received status update:', data);
                    this.updateCallback(data.user_id, data.is_online);
                }
            } catch (error) {
                console.error('Error processing WebSocket message:', error);
            }
        });

        this.socket.addEventListener('close', () => {
            console.log('Users navigation WebSocket disconnected');
            if (this.reconnectAttempts < this.maxReconnectAttempts) {
                this.reconnectAttempts++;
                setTimeout(() => this.initializeWebSocket(), 3000);
            }
        });
    }

    cleanup() {
        if (this.socket) {
            this.socket.close();
        }
    }
}

export default UsersNavigation;