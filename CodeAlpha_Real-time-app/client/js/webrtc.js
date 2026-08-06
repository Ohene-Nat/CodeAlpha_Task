// Thin wrapper around RTCPeerConnection for a mesh call (every participant
// connects directly to every other participant). Fine for small rooms
// (roughly up to 6-8 people); a larger app would swap this for an SFU.
//
// Media is protected in transit automatically — WebRTC mandates DTLS-SRTP
// encryption for every audio/video/data track, so there's nothing extra to
// configure here for that part of the "data encryption" requirement.

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  // Production deployments behind strict NATs/firewalls will also need a
  // TURN server, e.g.:
  // { urls: 'turn:your-turn-server:3478', username: '...', credential: '...' },
];

class PeerManager {
  /**
   * @param {object} opts
   * @param {(socketId: string, stream: MediaStream) => void} opts.onRemoteStream
   * @param {(socketId: string) => void} opts.onPeerClosed
   * @param {(socketId: string, candidate: RTCIceCandidate) => void} opts.onIceCandidate
   */
  constructor({ onRemoteStream, onPeerClosed, onIceCandidate }) {
    this.peers = new Map(); // socketId -> RTCPeerConnection
    this.onRemoteStream = onRemoteStream;
    this.onPeerClosed = onPeerClosed;
    this.onIceCandidate = onIceCandidate;
    this.localStream = null;
  }

  setLocalStream(stream) {
    this.localStream = stream;
  }

  _createConnection(socketId) {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => pc.addTrack(track, this.localStream));
    }

    pc.onicecandidate = (event) => {
      if (event.candidate) this.onIceCandidate(socketId, event.candidate);
    };

    pc.ontrack = (event) => {
      this.onRemoteStream(socketId, event.streams[0]);
    };

    pc.onconnectionstatechange = () => {
      if (['closed', 'failed', 'disconnected'].includes(pc.connectionState)) {
        // Let ICE retry briefly before tearing down on transient blips.
        if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
          this.closePeer(socketId);
        }
      }
    };

    this.peers.set(socketId, pc);
    return pc;
  }

  getOrCreate(socketId) {
    return this.peers.get(socketId) || this._createConnection(socketId);
  }

  async createOffer(socketId) {
    const pc = this.getOrCreate(socketId);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    return offer;
  }

  async handleOffer(socketId, offer) {
    const pc = this.getOrCreate(socketId);
    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    return answer;
  }

  async handleAnswer(socketId, answer) {
    const pc = this.peers.get(socketId);
    if (!pc) return;
    await pc.setRemoteDescription(new RTCSessionDescription(answer));
  }

  async addIceCandidate(socketId, candidate) {
    const pc = this.peers.get(socketId);
    if (!pc) return;
    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (err) {
      console.warn('Failed to add ICE candidate', err);
    }
  }

  // Swap the outgoing video track on every peer connection at once —
  // used for starting/stopping screen share without renegotiating tracks
  // one connection at a time from the caller.
  async replaceVideoTrack(newTrack) {
    const senders = [];
    this.peers.forEach((pc) => {
      const sender = pc.getSenders().find((s) => s.track && s.track.kind === 'video');
      if (sender) senders.push(sender.replaceTrack(newTrack));
    });
    await Promise.all(senders);
  }

  closePeer(socketId) {
    const pc = this.peers.get(socketId);
    if (pc) {
      pc.close();
      this.peers.delete(socketId);
    }
    this.onPeerClosed(socketId);
  }

  closeAll() {
    this.peers.forEach((pc) => pc.close());
    this.peers.clear();
  }
}
