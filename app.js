// Selecciona los elementos canvas
const timeDomainCanvas = document.getElementById('timeDomainCanvas');
const frequencyDomainCanvas = document.getElementById('frequencyDomainCanvas');
const timeDomainCtx = timeDomainCanvas.getContext('2d');
const frequencyDomainCtx = frequencyDomainCanvas.getContext('2d');

// Web Audio API
navigator.mediaDevices.getUserMedia({ audio: true })
  .then(stream => {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();

    // Configuración del analizador
    analyser.fftSize = 2048;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const freqArray = new Uint8Array(bufferLength);

    source.connect(analyser);

    function draw() {
      requestAnimationFrame(draw);

      // Tiempo
      analyser.getByteTimeDomainData(dataArray);

      timeDomainCtx.fillStyle = 'rgb(200, 200, 200)';
      timeDomainCtx.fillRect(0, 0, timeDomainCanvas.width, timeDomainCanvas.height);
      timeDomainCtx.lineWidth = 2;
      timeDomainCtx.strokeStyle = 'rgb(0, 0, 0)';
      timeDomainCtx.beginPath();

      const sliceWidth = timeDomainCanvas.width * 1.0 / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = v * timeDomainCanvas.height / 2;

        if (i === 0) {
          timeDomainCtx.moveTo(x, y);
        } else {
          timeDomainCtx.lineTo(x, y);
        }

        x += sliceWidth;
      }

      timeDomainCtx.lineTo(timeDomainCanvas.width, timeDomainCanvas.height / 2);
      timeDomainCtx.stroke();

      // Frecuencia
      analyser.getByteFrequencyData(freqArray);

      frequencyDomainCtx.fillStyle = 'rgb(200, 200, 200)';
      frequencyDomainCtx.fillRect(0, 0, frequencyDomainCanvas.width, frequencyDomainCanvas.height);
      const barWidth = (frequencyDomainCanvas.width / bufferLength) * 2.5;
      let barHeight;
      x = 0;

      for (let i = 0; i < bufferLength; i++) {
        barHeight = freqArray[i];

        frequencyDomainCtx.fillStyle = 'rgb(' + (barHeight + 100) + ',50,50)';
        frequencyDomainCtx.fillRect(x, frequencyDomainCanvas.height - barHeight / 2, barWidth, barHeight / 2);

        x += barWidth + 1;
      }
    }

    draw();
  })
  .catch(err => {
    console.log('Error accessing audio stream: ' + err);
  });

