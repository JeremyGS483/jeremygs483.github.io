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


        // Función para calcular magnitud (de un array complejo)
        function calcularMagnitud(dftReal, dftImag) {
            var magnitudes = [];

            for (let i = 0; i < dftReal.length; i++) {
                var mag = Math.sqrt(dftReal[i] * dftReal[i] + dftImag[i] * dftImag[i]);
                magnitudes.push(mag);
            }

            return magnitudes;
        }

        // Cálculo del espectro de magnitud del audio con sus frecuencias y escalamiento de ejes
        function valoresFFT(signal, fs) {

            var audioDFT = calcularFFT(signal);
            var magnitudesDFT = calcularMagnitud(audioDFT.real, audioDFT.imag);

            var samples = magnitudesDFT.length;
            var deltaf = fs / samples;

            var freqDFT = [];
            var dftMag = [];

            for (var i = 0; i < samples / 2; i++) {
                freqDFT.push(i * deltaf);
                dftMag.push(magnitudesDFT[i] * 2 / samples);
            }

            return { freq: freqDFT, mag: dftMag };
        }

        

        // Función para obtener la respuesta en frecuencia de filtro
        function calcularRespuestaFiltro(B, A, fs) {
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
                filterFreq.push(freq[i] * fs);
            }

            return { filterMag, filterFreq };
        }

        // Función para aplicar el filtro IIR a la señal
        function filterIIR(B, A, signal) {
            const N = A.length;
            const M = B.length;
            const len = signal.length;
            const output = new Array(len).fill(0);

            if (A[0] !== 1) {
                for (let i = 0; i < M; i++) {
                    B[i] /= A[0];
                }
                for (let i = 1; i < N; i++) {
                    A[i] /= A[0];
                }
            }

            for (let n = 0; n < len; n++) {
                output[n] = 0;

                for (let i = 0; i < M; i++) {
                    if (n - i >= 0) {
                        output[n] += B[i] * signal[n - i];
                    }
                }

                for (let j = 1; j < N; j++) {
                    if (n - j >= 0) {
                        output[n] -= A[j] * output[n - j];
                    }
                }
            }

            return output;
        }

        // Función para aplica el filtro FIR a la señal
        function filterFIR(B, A, signal) {
            // If A is not provided or is 1, we assume it to be [1]
            if (!A || A === 1) {
                A = [1];
            }

            const output = new Array(signal.length).fill(0);

            for (let n = 0; n < signal.length; n++) {
                let accB = 0;
                for (let k = 0; k < B.length; k++) {
                    if (n - k >= 0) {
                        accB += B[k] * signal[n - k];
                    }
                }

                let accA = 0;
                for (let k = 1; k < A.length; k++) {
                    if (n - k >= 0) {
                        accA += A[k] * output[n - k];
                    }
                }

                output[n] = (accB - accA) / A[0];
            }

            return output;
        }

        // Preparación del audio
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

        // Obtiene la frecuencia de muestreo y la señal de audio como objeto (asumiendo que es MONO)
        const sampleRate = audioBuffer.sampleRate;
        const audioDataObj = audioBuffer.getChannelData(0);

        // Convierte el audio en un array y obtiene valores del tiempo
        const audioData = Array.from(audioDataObj);
        const discreteValues = Array.from({length: audioData.length}, (_, i) => i);
        const timeValues = discreteValues.map(num => num / sampleRate);
        const samples = audioData.length;

        // Obtiene los datos de magnitud y frecuencia del audio para graficar
        var audioFFTData = valoresFFT(audioData, sampleRate);

        // COEF Filtro FIR
        var h = [0.0088573,  0.023381,  0.065254,  0.1249,  0.17799,  0.19925,  0.17799,  0.1249,  0.065254,  0.023381,  0.0088573];
        // COEF Filtro IIR
        var B = [0.50019, -3.0012, 7.5029, -10.004, 7.5029, -3.0012, 0.50019];
        var A = [1, -4.6252, 9.0394, -9.5353, 5.7171, -1.8451, 0.25019];

        // Cálculo de la respuesta en frecuencia de los filtros
        var firRF = calcularRespuestaFiltro(h, [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], sampleRate);
        var iirRF = calcularRespuestaFiltro(B, A, sampleRate);

        // Se aplica los filtros al audio
        var audioFIR = filterFIR(h, 1, audioData);
        var audioIIR = filterIIR(B, A, audioData);

        // Se calcula la FFT de las señales filtradas
        var firFFT = valoresFFT(audioFIR, sampleRate);
        var iirFFT = valoresFFT(audioIIR, sampleRate);

        // Función para crear gráfica
        function crearChart(containerId, title, xData, yData, ylim) {
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
                    title: 'Y Axis',
                    range: ylim  // Aquí se define el rango del eje vertical
                }
            };

            Plotly.newPlot(containerId, [trace], layout);
        }

        // Crear gráficas
        crearChart('chartContainer1', 'Señal de audio', timeValues, audioData, [-0.2, 0.2]);
        crearChart('chartContainer2', 'Espectro de magnitud', audioFFTData.freq, audioFFTData.mag, [0, 0.02]);
        crearChart('chartContainer3', 'Respuesta en frecuencia de filtro FIR: Ventana LP de orden 10 y fc = 2.5 kHz', firRF.filterFreq, firRF.filterMag, [0, 1.5]);
        crearChart('chartContainer4', 'Señal de audio filtrada con FIR', timeValues, audioFIR, [-0.2, 0.2]);
        crearChart('chartContainer5', 'Espectro de señal filtrada FIR', firFFT.freq, firFFT.mag, [0, 0.02]);
        crearChart('chartContainer6', 'Respuesta en frecuencia de filtro IIR: Butterworth HP de orden 6 y fc = 2.5 kHz', iirRF.filterFreq, iirRF.filterMag, [0, 1.5]);
        crearChart('chartContainer7', 'Señal de audio filtrada con IIR', timeValues, audioIIR, [-0.2, 0.2]);
        crearChart('chartContainer8', 'Espectro de señal filtrada IIR', iirFFT.freq, iirFFT.mag, [0, 0.02]);
        
    } catch (error) {
        console.error('Error al procesar el archivo de audio:', error);
    }
}
