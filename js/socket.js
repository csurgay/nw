class Socket {
  constructor() {
    this.id = new Id('Socket', this); // Unique identifier for Socket
    this.socket = null;
  }

  connect(url) {
    this.socket = new WebSocket(url);
    this.socket.onopen = () => {
      console.Debug.log('WebSocket connection established');
    };
    this.socket.onmessage = (event) => {
      console.Debug.log('Message received:', event.data);
    };
    this.socket.onclose = () => {
      console.Debug.log('WebSocket connection closed');
    };
    this.socket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }

  send(message) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(message);
      console.Debug.log('Message sent:', message);
    } else {
      console.error('WebSocket is not open. Cannot send message.');
    }
  }

  close() {
    if (this.socket) {
      this.socket.close();
      console.Debug.log('WebSocket connection closed');
    }
  }
}