const { io } = require('socket.io-client');
const socket = io('http://localhost:3000'); // Remember to change to IP for 2-PC test

const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const startBtn = document.getElementById('startBtn');
const cameraSelect = document.getElementById('cameraSelect');
const micSelect = document.getElementById('micSelect');
const statusText = document.getElementById('statusText');

let localStream;
let peerConnection;

// Standard Google STUN servers help find the public IP address
const configuration = {
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
};

// --- WEBRTC CORE LOGIC ---

async function createPeerConnection() {
    peerConnection = new RTCPeerConnection(configuration);

    // 1. Add our local video/audio tracks to the connection
    localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStream);
    });

    // 2. Listen for the remote stream to arrive
    peerConnection.ontrack = (event) => {
        console.log("Remote stream received!");
        remoteVideo.srcObject = event.streams[0];
    };

    // 3. Listen for ICE Candidates (network path info)
    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            socket.emit('signal', { type: 'candidate', candidate: event.candidate });
        }
    };
}

// --- SIGNALING RECEIVER ---

socket.on('signal', async (data) => {
    if (data.type === 'offer') {
        await createPeerConnection();
        await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        socket.emit('signal', { type: 'answer', answer: answer });
    } 
    else if (data.type === 'answer') {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
    } 
    else if (data.type === 'candidate') {
        try {
            await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch (e) {
            console.error("Error adding ice candidate", e);
        }
    }
});

// --- HARDWARE & UI LOGIC ---

async function getDevices() {
    try {
        await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
        const devices = await navigator.mediaDevices.enumerateDevices();
        cameraSelect.innerHTML = '';
        micSelect.innerHTML = '';
        devices.forEach(device => {
            const option = document.createElement('option');
            option.value = device.deviceId;
            if (device.kind === 'videoinput') {
                option.text = device.label || `Camera ${cameraSelect.length + 1}`;
                cameraSelect.appendChild(option);
            } else if (device.kind === 'audioinput') {
                option.text = device.label || `Mic ${micSelect.length + 1}`;
                micSelect.appendChild(option);
            }
        });
    } catch (err) { console.error(err); }
}

async function startCall() {
    const constraints = {
        video: { deviceId: cameraSelect.value ? { exact: cameraSelect.value } : undefined },
        audio: { deviceId: micSelect.value ? { exact: micSelect.value } : undefined }
    };

    try {
        localStream = await navigator.mediaDevices.getUserMedia(constraints);
        localVideo.srcObject = localStream;
        
        // After getting the camera, create the offer
        await createPeerConnection();
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        socket.emit('signal', { type: 'offer', offer: offer });
        
        startBtn.innerText = "In Call";
        startBtn.disabled = true;
    } catch (error) { console.error(error); }
}

socket.on('connect', () => {
    statusText.innerText = "Connected";
    statusText.style.color = "#2ecc71";
});

getDevices();
startBtn.addEventListener('click', startCall);