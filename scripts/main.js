document.addEventListener('DOMContentLoaded', () => {
    
    // elementos del dom
    const dateElement = document.querySelector('.date');
    const dayElement = document.querySelector('.day');
    const hourElement = document.querySelector('.hour');
    const clockElement = document.querySelector('.clock');
    const durationInput = document.getElementById('duration');
    const breakInput = document.getElementById('break');
    const startButton = document.querySelector('.button-start');
    const restartButton = document.querySelector('.button-restart');
    const forwardButton = document.querySelector('.button-forward');
    const iconSpan = startButton.querySelector('.icon');
    const sonido = document.getElementById('alarm-sound');

    // iconos svg
    const svgPlay = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" width="36" height="36"><polygon points="6,4 20,12 6,20" /></svg>`;
    const svgPause = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" width="36" height="36"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>`;

    // estados del temporizador
    let timerInterval = null;
    let isWorking = true;
    let isRunning = false;
    let timeRemaining = getInputMinutes(durationInput) * 60;

    // inicializa el sonido de alarma
    sonido.load();

    // inicializa el reloj, fecha y estado del botón
    iconSpan.innerHTML = svgPlay;
    updateClock();
    updateDateTime();

    // agrega los event listeners
    startButton.addEventListener('click', toggleTimer);
    restartButton.addEventListener('click', restartTimer);
    forwardButton.addEventListener('click', skipMode);
    durationInput.addEventListener('input', () => {
        limitarLargoInput(durationInput);
        limitarValor(durationInput, 50);
        if (!isRunning && isWorking) {
            timeRemaining = getInputMinutes(durationInput) * 60;
            updateClock();
            actualizarFondo();
        }
    });
    breakInput.addEventListener('input', () => {
        limitarLargoInput(breakInput);
        limitarValor(breakInput, 25);
        if (!isRunning && !isWorking) {
            timeRemaining = getInputMinutes(breakInput) * 60;
            updateClock();
            actualizarFondo();
        }
    });
    durationInput.addEventListener('keydown', bloquearCaracteresInvalidos);
    durationInput.addEventListener('paste', validarPegado);
    breakInput.addEventListener('keydown', bloquearCaracteresInvalidos);
    breakInput.addEventListener('paste', validarPegado);

    // inicia o pausa el temporizador
    function toggleTimer() {
        if (!isRunning) {
            if (timeRemaining === 0) {
                timeRemaining = (isWorking ? getInputMinutes(durationInput) : getInputMinutes(breakInput)) * 60;
            }
            isRunning = true;
            actualizarFondo();
            animarIcono(svgPause);
            timerInterval = setInterval(tick, 1000);
        } else {
            clearInterval(timerInterval);
            isRunning = false;
            document.body.classList.remove('working', 'breaking');
            animarIcono(svgPlay);
        }
    }

    // reinicia el temporizador actual
    function restartTimer() {
        clearInterval(timerInterval);
        timeRemaining = (isWorking ? getInputMinutes(durationInput) : getInputMinutes(breakInput)) * 60;
        updateClock();
        if (isRunning) {
            actualizarFondo();
            timerInterval = setInterval(tick, 1000);
        } else {
            document.body.classList.remove('working', 'breaking');
        }
    }

    // cambia entre modo trabajo y descanso
    function skipMode() {
        isWorking = !isWorking;
        timeRemaining = (isWorking ? getInputMinutes(durationInput) : getInputMinutes(breakInput)) * 60;
        updateClock();
        actualizarFondo();
    }

    // ejecuta cada segundo, actualiza el reloj y cambia de modo al terminar
    function tick() {
        if (timeRemaining > 0) {
            timeRemaining--;
            updateClock();
        } else {
            reproducirAlarma();
            animarReloj();
            clearInterval(timerInterval);
            isRunning = false;
            animarIcono(svgPlay);
            updateClock();
            setTimeout(() => {
                isWorking = !isWorking;
                timeRemaining = (isWorking ? getInputMinutes(durationInput) : getInputMinutes(breakInput)) * 60;
                updateClock();
                isRunning = true;
                actualizarFondo();
                animarIcono(svgPause);
                timerInterval = setInterval(tick, 1000);
            }, 3000);
        }
    }

    // actualiza la clase del body según el modo actual
    function actualizarFondo() {
        document.body.classList.remove('working', 'breaking');
        if (isRunning) {
            document.body.classList.add(isWorking ? 'working' : 'breaking');
        }
    }

    // muestra el tiempo restante en el reloj
    function updateClock() {
        clockElement.textContent = formatTime(timeRemaining);
    }

    // convierte segundos a formato mm:ss
    function formatTime(seconds) {
        const m = Math.floor(seconds / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    }

    // obtiene el valor del input como minutos, validando que sea mayor que cero
    function getInputMinutes(input) {
        const val = parseInt(input.value, 10);
        return isNaN(val) || val <= 0 ? 0 : val;
    }

    // anima el cambio de ícono del botón de inicio
    function animarIcono(svg) {
        iconSpan.style.opacity = 0;
        setTimeout(() => {
            iconSpan.innerHTML = svg;
            iconSpan.style.opacity = 1;
        }, 200);
    }

    // reproduce el sonido de alarma
    function reproducirAlarma() {
        sonido.pause();
        sonido.currentTime = 0;
        sonido.play().catch(err => console.warn("Error al reproducir alarma:", err));
    }

    // aplica animación de sacudida al reloj
    function animarReloj() {
        reproducirAlarma();
        clockElement.classList.remove('animate__animated', 'animate__shakeX');
        void clockElement.offsetWidth;
        clockElement.classList.add('animate__animated', 'animate__shakeX');
        setTimeout(() => {
            clockElement.classList.remove('animate__animated', 'animate__shakeX');
            void clockElement.offsetWidth;
            clockElement.classList.add('animate__animated', 'animate__shakeX');
        }, 1000);
    }

    // limita el input a 2 caracteres
    function limitarLargoInput(input) {
        if (input.value.length > 2) {
            input.value = input.value.slice(0, 2);
        }
    }

    // impide ingresar un número mayor al valor máximo
    function limitarValor(input, max) {
        const val = parseInt(input.value, 10);
        if (!isNaN(val) && val > max) input.value = max;
    }

    // bloquea caracteres no numéricos en los inputs
    function bloquearCaracteresInvalidos(e) {
        const k = e.key;
        const valid = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Enter'];
        if (!/^\d$/.test(k) && !valid.includes(k)) e.preventDefault();
    }

    // evita pegar texto no numérico en los inputs
    function validarPegado(e) {
        const txt = (e.clipboardData || window.clipboardData).getData('text');
        if (!/^\d+$/.test(txt)) e.preventDefault();
    }

    // actualiza fecha y hora en pantalla
    function updateDateTime() {
        const hoy = new Date();
        const dias = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
        dateElement.textContent = hoy.toLocaleDateString('es-AR');
        dayElement.textContent = dias[hoy.getDay()].toUpperCase();

        function actualizarHora() {
            const ahora = new Date();
            hourElement.textContent = ahora.toLocaleTimeString('es-AR', {
                hour12: false,
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
        }

        actualizarHora();
        setInterval(actualizarHora, 1000);
    }
});
