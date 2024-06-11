document.getElementById('fileInput').addEventListener('change', function(event) {
const file = event.target.files[0];
if (file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        const arrayBuffer = e.target.result;
        processAudio(arrayBuffer);
        };
    reader.readAsArrayBuffer(file);
    }
});

async function processAudio(arrayBuffer) {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    const sampleRate = audioBuffer.sampleRate;
    const audioData = audioBuffer.getChannelData(0);  // Assuming mono audio

    console.log('Sample Rate:', sampleRate);

    const audioDataArray = Array.from(audioData);
    const discreteValues = Array.from({length: audioDataArray.length}, (_, i) => i);
    console.log(audioDataArray);
    console.log(discreteValues);

    function calcularDFT(signal){
        var N = signal.length;
        var dftReal = [];
        var dftImag = [];

        for(var f=0; f < N; f++){
            var sumReal = 0;
            var sumImag = 0;

            for(var n=0; n < N; n++){
                var angle = (2*Math.PI*f*n) / N;
                sumReal += signal[n] * Math.cos(angle);
                sumImag -= signal[n] * Math.sin(angle);
            }

            dftReal.push(sumReal);
            dftImag.push(sumImag);

        }

        return { real: dftReal, imag: dftImag };
    }

    function calcularMagnitud(dftReal, dftImag){
        var magnitudes = [];
        for(var i = 0; i < dftReal.length; i++){
            var mag = Math.sqrt(dftReal[i]*dftReal[i] + dftImag[i]*dftImag[i]);
            magnitudes.push(mag);
        }

        return magnitudes;
    }

    var dft = calcularDFT(audioDataArray);
    console.log(dft.real);
    console.log(dft.imag);
    var magnitudes = calcularMagnitud(dft.real, dft.imag);
    console.log(magnitudes);
    var N = magnitudes.length;
    var frequencies = [];
    var fftMag = [];
    var omega = sampleRate / audioDataArray.length;
    for(var i = 0; i < N/2; i++){
        frequencies.push(i*omega);
        fftMag.push(magnitudes[i]);
    }

    console.log(fftMag);
    console.log(frequencies);
    
    const A2 = [0, 1, 2, 3, 4, 5];
    const B2 = [5, 15, 8, 12, 25, 35];
    const A3 = [0, 1, 2, 3, 4, 5];
    const B3 = [10, 5, 3, 7, 18, 28];
    const A4 = [0, 1, 2, 3, 4, 5];
    const B4 = [3, 12, 6, 10, 22, 32];

    // Function to create a chart
    function createChart(containerId, title, dataA, dataB) {
        const data = [];
        for (let i = 0; i < dataA.length; i++) {
            data.push([dataA[i], dataB[i]]);
        }

        Highcharts.chart(containerId, {
            title: {
                text: title
            },
            xAxis: {
                title: {
                    text: 'X Axis'
                }
            },
            yAxis: {
                title: {
                    text: 'Y Axis'
                }
            },
            series: [{
                type: 'spline',
                name: 'Interpolated Line',
                data: data
            }]
        });
    }

    // Create charts
    createChart('chartContainer1', 'Señal de voz', discreteValues, audioDataArray);
    createChart('chartContainer2', 'Espectro de magnitud', frequencies, fftMag);
    createChart('chartContainer3', 'Respuesta en frecuencia de filtro', A3, B3);
    createChart('chartContainer4', 'Señal de voz filtrada', A4, B4);

// You can now use `sampleRate` and `audioData` variables as needed
}
