const ws = new WebSocket(`${location.protocol === 'http:' ? 'ws' : 'wss'}://${location.host}`);
const peer = new RTCPeerConnection();

let localStream, audioCtx;
let micAnalyser, speakerAnalyser;

const micCanvas = document.getElementById('micMeter');
const speakerCanvas = document.getElementById('speakerMeter');
const micCtx = micCanvas.getContext('2d');
const speakerCtx = speakerCanvas.getContext('2d');

function drawMeter (analyser, canvasCtx) {
	const data = new Uint8Array(analyser.fftSize);

	function draw() {
		analyser.getByteTimeDomainData(data);
		const volume = Math.max(...data) - Math.min(...data);

		canvasCtx.clearRect(0, 0, 300, 50);
		canvasCtx.fillStyle = "#0ff";
		canvasCtx.fillRect(0, 0, volume * 1.5, 50);

		requestAnimationFrame(draw);
	}

	draw();
}

ws.onmessage = async ({ data }) => {
	const text = typeof data === "string" ? data : await data.text();
	const msg = JSON.parse(text);

	if (msg.type === 'offer') {
		await peer.setRemoteDescription(new RTCSessionDescription(msg));

		const answer = await peer.createAnswer();

		await peer.setLocalDescription(answer);
		ws.send(JSON.stringify(peer.localDescription));
	}

	if (msg.type === 'answer') await peer.setRemoteDescription(new RTCSessionDescription(msg));

	if (msg.type === 'candidate') {
		try {
			await peer.addIceCandidate(new RTCIceCandidate(msg.candidate));
		} catch (err) {
			console.error('ICE add error:', err);
		}
	}
};

peer.onicecandidate = (event) => {
	if (event.candidate) ws.send(JSON.stringify({ type: 'candidate', candidate: event.candidate }));
};

peer.ontrack = (event) => {
	const incomingStream = event.streams[0];
	document.getElementById("remoteVideo").srcObject = incomingStream;

	// Speaker audio meter
	const input = audioCtx.createMediaStreamSource(incomingStream);

	speakerAnalyser = audioCtx.createAnalyser();
	speakerAnalyser.fftSize = 32;

	input.connect(speakerAnalyser);
	drawMeter(speakerAnalyser, speakerCtx);
};

async function start () {
	audioCtx = new (window.AudioContext || window.webkitAudioContext)();

	localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
	document.getElementById('localVideo').srcObject = localStream;

	localStream.getTracks().forEach(track => peer.addTrack(track, localStream));

	// Mic audio meter
	const micSource = audioCtx.createMediaStreamSource(localStream);

	micAnalyser = audioCtx.createAnalyser();
	micAnalyser.fftSize = 32;

	micSource.connect(micAnalyser);
	drawMeter(micAnalyser, micCtx);

	const offer = await peer.createOffer();

	await peer.setLocalDescription(offer);
	ws.send(JSON.stringify(offer));
}
