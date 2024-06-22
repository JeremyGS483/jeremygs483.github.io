document.getElementById('fileInput').addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const arrayBuffer = e.target.result;
            processAudio(arrayBuffer); // Llama la función asincrónica
        };
        reader.readAsArrayBuffer(file);
    }
});

// Función asincrónica para procesar el archivo de audio
async function processAudio(arrayBuffer) {
    try {

        // Función para calcular la Transformada de Fourier Rápida (FFT)
        function calcularFFT(audioSignal) {
            var N = audioSignal.length;

            // Pad the array if its length is not a power of 2
            if ((N & (N - 1)) !== 0) {

                let newSize = 1;

                while (newSize < N) {
                    newSize *= 2;
                }

                const paddedArray = new Array(newSize).fill(0);
                for (let i = 0; i < N; ++i) {
                    paddedArray[i] = audioSignal[i];
                }

                audioSignal = paddedArray;
            }

            if (N <= 1) {
                return { real: audioSignal, imag: new Array(N).fill(0) };
            }

            N = audioSignal.length;

            const halfSize = N / 2;
            const even = new Array(halfSize);
            const odd = new Array(halfSize);

            for (let i = 0; i < halfSize; ++i) {
                even[i] = audioSignal[i * 2];
                odd[i] = audioSignal[i * 2 + 1];
            }

            const fftEven = calcularFFT(even);
            const fftOdd = calcularFFT(odd);

            const real = new Array(N);
            const imag = new Array(N);

            for (let k = 0; k < halfSize; ++k) {
                const t = -2 * Math.PI * k / N;
                const cosT = Math.cos(t);
                const sinT = Math.sin(t);

                const realT = cosT * fftOdd.real[k] - sinT * fftOdd.imag[k];
                const imagT = cosT * fftOdd.imag[k] + sinT * fftOdd.real[k];

                real[k] = fftEven.real[k] + realT;
                imag[k] = fftEven.imag[k] + imagT;

                real[k + halfSize] = fftEven.real[k] - realT;
                imag[k + halfSize] = fftEven.imag[k] - imagT;
            }

            return { real: real, imag: imag };
        }

        function padToPowerOf2(array) {
            const N = array.length;
            let newSize = 1;

            while (newSize < N) {
                newSize *= 2;
            }

            const paddedArray = new Array(newSize).fill(0);
            for (let i = 0; i < N; ++i) {
                paddedArray[i] = array[i];
            }

            return paddedArray;
        }

        // Función para calcular magnitud (de un array complejo)
        function calcularMagnitud(dftReal, dftImag) {
            var magnitudes = [];

            for (let i = 0; i < dftReal.length; i++) {
                var mag = Math.sqrt(dftReal[i] * dftReal[i] + dftImag[i] * dftImag[i]);
                magnitudes.push(mag);
            }

            return magnitudes;
        }

        // Cálculo del espectro de magnitud del audio y escalamiento de ejes
        function valoresFFT(signal, fs) {
            var samples = signal.length;
            var deltaf = fs / samples;

            var audioDFT = calcularFFT(signal);
            var magnitudesDFT = calcularMagnitud(audioDFT.real, audioDFT.imag);

            var freqDFT = [];
            var dftMag = [];

            for (var i = 0; i < samples / 2; i++) {
                freqDFT.push(i * deltaf);
                dftMag.push(magnitudesDFT[i] * 2 / samples);
            }

            return { freq: freqDFT, mag: dftMag };
        }

        

        // FILTRO DIGITAL FIR

        function getFilterResponse(B, A, fs) {
            const freq = [];
            const nyquist = fs / 2;

            for (let i = 0; i <= nyquist; i++) {
                freq.push(i / fs);
            }

            const filterMag = [];
            const filterFreq = [];

            for (let i = 0; i < freq.length; i++) {
                const w = 2 * Math.PI * freq[i];
                let numeratorReal = 0;
                let numeratorImag = 0;
                let denominatorReal = 0;
                let denominatorImag = 0;

                for (let j = 0; j < B.length; j++) {
                  numeratorReal += B[j] * Math.cos(j * w);
                  numeratorImag += B[j] * Math.sin(j * w);
                }

                for (let j = 0; j < A.length; j++) {
                  denominatorReal += A[j] * Math.cos(j * w);
                  denominatorImag += A[j] * Math.sin(j * w);
                }

                const magnitude = Math.sqrt((numeratorReal ** 2 + numeratorImag ** 2) / (denominatorReal ** 2 + denominatorImag ** 2));
                filterMag.push(magnitude);
                filterFreq.push(freq[i] * fs/2);
            }

            return { filterMag, filterFreq };
        }

        function applyFilter(signal, B, A, fs) {
            const isFIR = A.length === 1 && A[0] === 1;

            if (isFIR) {
                // Filtro FIR
                return applyFIRFilter(signal, B);
            } else {
                // Filtro IIR
                return applyIIRFilter(signal, B, A, fs);
            }
        }

        function applyFIRFilter(signal, B) {
            const M = B.length;
            const filteredSignal = [];

            for (let n = 0; n < signal.length; n++) {
                let y = 0;
                for (let k = 0; k < M; k++) {
                    if (n - k >= 0) {
                        y += B[k] * signal[n - k];
                    }
                }
                filteredSignal.push(y);
            }

            return filteredSignal;
        }

        function applyIIRFilter(signal, B, A, fs) {
            const M = B.length;
            const N = A.length;
            const filteredSignal = [];
            const zi = Array(N - 1).fill(0); // Initial conditions for the filter state

            for (let n = 0; n < signal.length; n++) {
                let y = 0;
                let input = signal[n];

                // Calculate y[n] using the difference equation
                for (let k = 0; k < M; k++) {
                    if (n - k >= 0) {
                        y += B[k] * signal[n - k];
                    }
                }
                for (let k = 1; k < N; k++) {
                    if (n - k >= 0) {
                        y -= A[k] * filteredSignal[n - k];
                    }
                }

                y /= A[0]; // Divide by A[0] to normalize

                filteredSignal.push(y);
            }

            return filteredSignal;
        }

        // Preparación del audio
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

        // Obtiene la frecuencia de muestreo y la señal de audio como objeto (asumiendo que es MONO)
        const sampleRate = audioBuffer.sampleRate;
        const audioDataObj = audioBuffer.getChannelData(0);

        console.log('Sample Rate:', sampleRate); // DEBUG

        // Convierte el audio en un array y obtiene valores del tiempo
        const audioData = Array.from(audioDataObj);
        const discreteValues = Array.from({length: audioData.length}, (_, i) => i);
        const timeValues = discreteValues.map(num => num / sampleRate);
        const samples = audioData.length;

        // DEBUG DE RESULTADOS
        console.log('Valores de audio: ', audioData);
        console.log('Valores de tiempo: ', timeValues);

        var audioFFTData = valoresFFT(audioData, sampleRate);

        // DEBUG DE RESULTADOS
        console.log('Espectro de magnitud: ', audioFFTData.mag);
        console.log('Valores de frecuencia de DFT: ', audioFFTData.freq);


        // COEF Filtro FIR
        var h = [0.1662,   0.1668,   0.1670,   0.1670,   0.1668,   0.1662];
        // COEF Filtro IIR
        var B = [0.069, 0, -0.069];
        var A = [1, 0.2069, 0.86];

        // Cálculo de la respuesta en frecuencia de los filtros
        var firRF = getFilterResponse(h, [1], sampleRate);
        var iirRF = getFilterResponse(B, A, sampleRate);

        // Se aplica los filtros al audio
        var audioFIR = applyFilter(audioData, h, [1], sampleRate);
        var audioIIR = applyFilter(audioData, B, A, sampleRate);

        // Se calcula la FFT de las señales filtradas
        var firFFT = valoresFFT(audioFIR, sampleRate);
        var iirFFT = valoresFFT(audioIIR, sampleRate);

        // Function to create a chart
        function createChart(containerId,   title, xData, yData) {
            const trace = {
                x: xData,
                y: yData,
                mode: 'lines',
                type: 'scatter'
            };

            const layout = {
                title: title,
                xaxis: {
                    title: 'X Axis'
                },
                yaxis: {
                    title: 'Y Axis'
                }
            };

            Plotly.newPlot(containerId, [trace], layout);
        }

        // Crear gráficas
        createChart('chartContainer1', 'Señal de audio', timeValues, audioData);
        createChart('chartContainer2', 'Espectro de magnitud', audioFFTData.freq, audioFFTData.mag);
        createChart('chartContainer3', 'Respuesta en frecuencia de filtro FIR', firRF.filterFreq, firRF.filterMag);
        createChart('chartContainer4', 'Señal de audio filtrada con FIR', timeValues, audioFIR);
        createChart('chartContainer5', 'Espectro de señal filtrada FIR', firFFT.freq, firFFT.mag);
        createChart('chartContainer6', 'Respuesta en frecuencia de filtro IIR', iirRF.filterFreq, iirRF.filterMag);
        createChart('chartContainer7', 'Señal de audio filtrada con IIR', timeValues, audioIIR);
        createChart('chartContainer8', 'Espectro de señal filtrada IIR', iirFFT.freq, iirFFT.mag);
        
    } catch (error) {
        console.error('Error al procesar el archivo de audio:', error);
    }
}
