class Socket {
  constructor() {
    this.socket = null;
  }

  connect(url) {
    this.socket = new WebSocket(url);
    this.socket.onopen = () => {
      console.log('WebSocket connection established');
    };
    this.socket.onmessage = (event) => {
      console.log('Message received:', event.data);
    };
    this.socket.onclose = () => {
      console.log('WebSocket connection closed');
    };
    this.socket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }

  send(message) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(message);
      console.log('Message sent:', message);
    } else {
      console.error('WebSocket is not open. Cannot send message.');
    }
  }

  close() {
    if (this.socket) {
      this.socket.close();
      console.log('WebSocket connection closed');
    }
  }
}